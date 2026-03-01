const express = require('express');
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const userRepo = require('../repositories/users');
const db = require('../db');
const config = require('../config');
const { DomainError } = require('../errors/domain-error');
const subscriptionPayments = require('../services/subscription-payments');
const engine = require('../services/subscription-engine');

const router = express.Router();

const SALT_ROUNDS = 10;
// No more hardcoded PAID_PLANS — determined dynamically from DB

/**
 * POST /v1/register
 * Public endpoint: create a new shop + owner account (shop_admin).
 *
 * FREE plan  → shop created active, tokens returned immediately.
 * PAID plan  → shop created with status='pending_payment', SSLCommerz
 *              checkout URL returned. Shop activates after payment.
 */
router.post('/', validateBody({
  shop_name: { required: true, type: 'string', minLength: 2 },
  slug: { required: true, type: 'string', pattern: /^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$/ },
  email: { required: true, type: 'email' },
  password: { required: true, type: 'string', minLength: 6 },
  full_name: { type: 'string' },
  phone: { type: 'string' },
  plan: { type: 'string' },
  billing: { type: 'string', oneOf: ['monthly', 'yearly'] },
}), asyncHandler(async (req, res) => {
  const { shop_name, slug, email, password, full_name, phone, industry, plan, billing } = req.body;

  // Check email not taken
  const existingUser = await userRepo.findByEmail(email);
  if (existingUser) {
    throw new DomainError('DUPLICATE_EMAIL', 'An account with this email already exists', 409);
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // Dynamic plan lookup — zero hardcoded plan slugs
  const planSlug = plan || 'free';
  const planRow = await engine.getPlanBySlug(planSlug);
  if (planSlug !== 'free' && !planRow) {
    throw new DomainError('PLAN_NOT_FOUND', `Subscription plan "${planSlug}" not found`, 400);
  }

  const billingCycle = billing === 'yearly' ? 'yearly' : 'monthly';
  const amount = planRow
    ? (billingCycle === 'yearly' ? Number(planRow.price_yearly) : Number(planRow.price_monthly))
    : 0;
  const isPaid = amount > 0;
  const shopStatus = isPaid ? 'pending_payment' : 'active';

  // Create shop + user + default settings atomically
  const result = await db.withTransaction(async (client) => {
    const shopRes = await client.query(
      `INSERT INTO shops (name, slug, status, industry, subscription_plan)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [shop_name, slug, shopStatus, industry || null, plan || 'free']
    );
    const shop = shopRes.rows[0];

    const userRes = await client.query(
      `INSERT INTO users (shop_id, email, password_hash, role, full_name, phone)
       VALUES ($1, $2, $3, 'shop_admin', $4, $5) RETURNING *`,
      [shop.id, email, password_hash, full_name || null, phone || null]
    );
    const user = userRes.rows[0];

    await client.query('UPDATE shops SET owner_user_id = $1 WHERE id = $2', [user.id, shop.id]);

    await client.query(
      `INSERT INTO website_settings (shop_id, template, theme, header, footer, homepage, custom_css, custom_js, seo_defaults)
       VALUES ($1, 'starter', '{"primaryColor":"#6366f1","fontFamily":"Inter"}', '{"logo":null,"nav":[]}',
        '{"text":"","links":[]}', '{"hero":{"title":"Welcome","subtitle":""},"sections":[]}', '', '', '{"title":"","description":""}')`,
      [shop.id]
    );

    return {
      shop: { ...shop, owner_user_id: user.id },
      user: { id: user.id, email: user.email, role: user.role, shop_id: shop.id, full_name: user.full_name },
    };
  });

  // ── FREE plan: immediate login ──────────────────────────
  if (!isPaid) {
    // Activate subscription record
    await engine.activateSubscription(result.shop.id, planSlug, 'monthly');

    // Bootstrap staff usage for the owner user
    try { await engine.incrementUsage(result.shop.id, 'staff', 1); } catch (_e) { /* non-blocking */ }

    const authService = require('../services/auth');
    const tokens = {
      accessToken: authService.signAccessToken({ id: result.user.id, role: result.user.role, shop_id: result.shop.id }),
      refreshToken: authService.signRefreshToken({ id: result.user.id }),
      tokenType: 'Bearer',
    };
    await db.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')",
      [result.user.id, tokens.refreshToken]
    );
    return res.status(201).json({ shop: result.shop, user: result.user, ...tokens });
  }

  // ── PAID plan: redirect to SSLCommerz ───────────────────

  if (amount <= 0) {
    // Plan happens to be free (e.g. price = 0) — activate immediately
    await db.query("UPDATE shops SET status = 'active', updated_at = now() WHERE id = $1", [result.shop.id]);
    await engine.activateSubscription(result.shop.id, planSlug, billingCycle);
    // Bootstrap staff usage for the owner user
    try { await engine.incrementUsage(result.shop.id, 'staff', 1); } catch (_e) { /* non-blocking */ }
    const authService = require('../services/auth');
    const tokens = {
      accessToken: authService.signAccessToken({ id: result.user.id, role: result.user.role, shop_id: result.shop.id }),
      refreshToken: authService.signRefreshToken({ id: result.user.id }),
      tokenType: 'Bearer',
    };
    await db.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')",
      [result.user.id, tokens.refreshToken]
    );
    return res.status(201).json({ shop: result.shop, user: result.user, ...tokens });
  }

  // Initiate SSLCommerz session
  const payment = await subscriptionPayments.initSubscriptionPayment({
    shopId: result.shop.id,
    userId: result.user.id,
    planSlug: planSlug,
    amount,
    billingCycle,
    customerName: full_name || shop_name,
    customerEmail: email,
    customerPhone: phone,
  });

  return res.status(201).json({
    requiresPayment: true,
    checkoutUrl: payment.checkoutUrl,
    shop: result.shop,
    user: result.user,
  });
}));

// ── SSLCommerz subscription callbacks ─────────────────────

router.post('/payment/success', asyncHandler(async (req, res) => {
  const result = await subscriptionPayments.handleSubscriptionCallback(req.body);
  if (result.valid) {
    // Generate tokens so we can auto-login the user after redirect
    const auth = await subscriptionPayments.generateAuthTokensForUser(result.userId);
    if (auth) {
      const params = new URLSearchParams({
        status: 'success',
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
      });
      return res.redirect(`${config.appUrl}/signup/success?${params.toString()}`);
    }
  }
  return res.redirect(`${config.appUrl}/signup/success?status=success`);
}));

router.post('/payment/fail', asyncHandler(async (req, res) => {
  await subscriptionPayments.handleSubscriptionCallback(req.body);
  return res.redirect(`${config.appUrl}/signup/fail?reason=payment_failed`);
}));

router.post('/payment/cancel', asyncHandler(async (req, res) => {
  await subscriptionPayments.handleSubscriptionCallback(req.body);
  return res.redirect(`${config.appUrl}/signup/fail?reason=payment_cancelled`);
}));

router.post('/payment/ipn', asyncHandler(async (req, res) => {
  await subscriptionPayments.handleSubscriptionCallback(req.body);
  return res.status(200).json({ message: 'IPN received' });
}));

// ── Check subscription payment status ─────────────────────

router.get('/payment/status/:shopId', asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const payRes = await db.query(
    'SELECT status FROM subscription_payments WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 1',
    [shopId]
  );
  const shopRes = await db.query('SELECT status FROM shops WHERE id = $1', [shopId]);
  res.json({
    paymentStatus: payRes.rows[0]?.status || 'unknown',
    shopStatus: shopRes.rows[0]?.status || 'unknown',
  });
}));

/**
 * GET /v1/register/plans
 * Public: list active subscription plans for pricing page.
 * Returns all plan data dynamically — zero hardcoded plan info.
 */
router.get('/plans', asyncHandler(async (_req, res) => {
  const plans = await engine.getAllPlans();
  res.json({ items: plans });
}));

module.exports = router;
