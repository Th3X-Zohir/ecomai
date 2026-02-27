const express = require('express');
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/async-handler');
const shopService = require('../services/shops');
const userRepo = require('../repositories/users');
const websiteRepo = require('../repositories/website-settings');
const db = require('../db');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();

const SALT_ROUNDS = 10;

/**
 * POST /v1/register
 * Public endpoint: create a new shop + owner account (shop_admin).
 */
router.post('/', asyncHandler(async (req, res) => {
  const { shop_name, slug, email, password, full_name, phone, industry, plan } = req.body;

  if (!shop_name || !slug || !email || !password) {
    throw new DomainError('VALIDATION_ERROR', 'shop_name, slug, email, and password are required', 400);
  }

  if (password.length < 6) {
    throw new DomainError('VALIDATION_ERROR', 'password must be at least 6 characters', 400);
  }

  // Check email not taken
  const existingUser = await userRepo.findByEmail(email);
  if (existingUser) {
    throw new DomainError('DUPLICATE_EMAIL', 'An account with this email already exists', 409);
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // Use transaction to create shop + user + default settings atomically
  const result = await db.withTransaction(async (client) => {
    // Create shop
    const shopRes = await client.query(
      `INSERT INTO shops (name, slug, status, industry, subscription_plan)
       VALUES ($1, $2, 'active', $3, $4) RETURNING *`,
      [shop_name, slug, industry || null, plan || 'free']
    );
    const shop = shopRes.rows[0];

    // Create owner user
    const userRes = await client.query(
      `INSERT INTO users (shop_id, email, password_hash, role, full_name, phone)
       VALUES ($1, $2, $3, 'shop_admin', $4, $5) RETURNING *`,
      [shop.id, email, password_hash, full_name || null, phone || null]
    );
    const user = userRes.rows[0];

    // Set owner on shop
    await client.query('UPDATE shops SET owner_user_id = $1 WHERE id = $2', [user.id, shop.id]);

    // Create default website settings
    await client.query(
      `INSERT INTO website_settings (shop_id, template, theme, header, footer, homepage, custom_css, custom_js, seo_defaults)
       VALUES ($1, 'starter', '{"primaryColor":"#6366f1","fontFamily":"Inter"}', '{"logo":null,"nav":[]}',
        '{"text":"","links":[]}', '{"hero":{"title":"Welcome","subtitle":""},"sections":[]}', '', '', '{"title":"","description":""}')`,
      [shop.id]
    );

    return { shop: { ...shop, owner_user_id: user.id }, user: { id: user.id, email: user.email, role: user.role, shop_id: shop.id, full_name: user.full_name } };
  });

  // Generate auth tokens for immediate login
  const authService = require('../services/auth');
  const tokens = {
    accessToken: authService.signAccessToken({ id: result.user.id, role: result.user.role, shop_id: result.shop.id }),
    refreshToken: authService.signRefreshToken({ id: result.user.id }),
    tokenType: 'Bearer',
  };

  // Store refresh token
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
    [result.user.id, tokens.refreshToken]
  );

  res.status(201).json({ shop: result.shop, user: result.user, ...tokens });
}));

/**
 * GET /v1/register/plans
 * Public: list subscription plans for pricing page.
 */
router.get('/plans', asyncHandler(async (_req, res) => {
  const result = await db.query('SELECT * FROM subscription_plans ORDER BY price_monthly ASC');
  res.json({ items: result.rows });
}));

module.exports = router;
