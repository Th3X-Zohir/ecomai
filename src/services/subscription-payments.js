/**
 * Subscription payment service — SSLCommerz integration for paid plan signups.
 *
 * Flow:
 *  1. POST /v1/register  (plan !== 'free')
 *     → creates shop (status='pending_payment') + user
 *     → calls initSubscriptionPayment()
 *     → returns { checkoutUrl } to frontend
 *  2. SSLCommerz redirects to success/fail/cancel callback
 *     → handleSubscriptionCallback() validates & activates shop
 *  3. Frontend /signup/success reads tokens from URL and logs user in
 */

const config = require('../config');
const db = require('../db');
const { DomainError } = require('../errors/domain-error');
const engine = require('./subscription-engine');

const SSLCZ_BASE = config.sslcommerzIsLive
  ? 'https://securepay.sslcommerz.com'
  : 'https://sandbox.sslcommerz.com';

/** POST form-encoded data to SSLCommerz using native fetch */
async function sslczPost(endpoint, data) {
  const body = new URLSearchParams(data).toString();
  const res = await fetch(`${SSLCZ_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return res.json();
}

/** GET with query params from SSLCommerz */
async function sslczGet(endpoint, params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${SSLCZ_BASE}${endpoint}?${qs}`);
  return res.json();
}

/**
 * Initiate SSLCommerz payment session for a subscription plan signup.
 *
 * @param {Object} opts
 * @param {string} opts.shopId       - The newly created shop ID
 * @param {string} opts.userId       - The owner user ID
 * @param {string} opts.planSlug     - e.g. 'starter', 'growth'
 * @param {number} opts.amount       - Price in BDT
 * @param {string} opts.billingCycle - 'monthly' or 'yearly'
 * @param {string} opts.customerName
 * @param {string} opts.customerEmail
 * @param {string} opts.customerPhone
 * @returns {{ checkoutUrl: string, tranId: string, paymentId: string }}
 */
async function initSubscriptionPayment({
  shopId, userId, planSlug, amount, billingCycle,
  customerName, customerEmail, customerPhone,
}) {
  const tranId = `SUB_${shopId}_${Date.now()}`;

  // Create pending subscription_payment record
  const insertRes = await db.query(
    `INSERT INTO subscription_payments
       (shop_id, user_id, plan_slug, amount, currency, billing_cycle, status, gateway_tran_id)
     VALUES ($1, $2, $3, $4, 'BDT', $5, 'pending', $6)
     RETURNING *`,
    [shopId, userId, planSlug, amount, billingCycle || 'monthly', tranId],
  );
  const payment = insertRes.rows[0];

  const sslData = {
    store_id:     config.sslcommerzStoreId,
    store_passwd: config.sslcommerzStorePasswd,
    total_amount: String(Number(amount)),
    currency:     'BDT',
    tran_id:      tranId,
    success_url:  `${config.apiUrl}/v1/register/payment/success`,
    fail_url:     `${config.apiUrl}/v1/register/payment/fail`,
    cancel_url:   `${config.apiUrl}/v1/register/payment/cancel`,
    ipn_url:      `${config.apiUrl}/v1/register/payment/ipn`,
    shipping_method: 'NO',
    product_name:    `Ecomai ${planSlug} plan (${billingCycle || 'monthly'})`,
    product_category: 'subscription',
    product_profile:  'non-physical-goods',
    cus_name:  customerName || 'Customer',
    cus_email: customerEmail,
    cus_phone: customerPhone || '01700000000',
    cus_add1:  'N/A',
    cus_city:  'Dhaka',
    cus_country: 'Bangladesh',
    // Pass IDs so we can look them up on callback
    value_a: payment.id,   // subscription_payment id
    value_b: shopId,
    value_c: userId,
  };

  const response = await sslczPost('/gwprocess/v4/api.php', sslData);

  if (!response?.GatewayPageURL) {
    // Clean up the pending records since payment gateway failed
    await db.query('DELETE FROM subscription_payments WHERE id = $1', [payment.id]);
    throw new DomainError('PAYMENT_INIT_FAILED', 'Failed to initialise payment gateway. Please try again.', 502);
  }

  await db.query(
    'UPDATE subscription_payments SET gateway_response = $1, updated_at = now() WHERE id = $2',
    [JSON.stringify(response), payment.id],
  );

  return { checkoutUrl: response.GatewayPageURL, tranId, paymentId: payment.id };
}

/**
 * Handle SSLCommerz callback for subscription payment (success/fail/cancel/IPN).
 * Validates with SSLCommerz, activates the shop if payment is valid.
 *
 * @returns {{ valid: boolean, shopId?: string, userId?: string }}
 */
async function handleSubscriptionCallback(body) {
  const { tran_id, status, val_id } = body;

  // Look up payment
  const payRes = await db.query(
    'SELECT * FROM subscription_payments WHERE gateway_tran_id = $1',
    [tran_id],
  );
  const payment = payRes.rows[0];
  if (!payment) return { valid: false, message: 'Payment not found' };

  // Idempotent — already processed
  if (payment.status === 'completed') {
    return { valid: true, alreadyProcessed: true, shopId: payment.shop_id, userId: payment.user_id };
  }

  if (status === 'VALID' || status === 'VALIDATED') {
    // Verify with SSLCommerz server-side validation
    let validated = false;
    try {
      const validation = await sslczGet('/validator/api/validationserverAPI.php', {
        val_id,
        store_id:     config.sslcommerzStoreId,
        store_passwd: config.sslcommerzStorePasswd,
        v: '1',
        format: 'json',
      });
      if (validation.status !== 'VALID' && validation.status !== 'VALIDATED') {
        await db.query(
          'UPDATE subscription_payments SET status = $1, gateway_response = $2, updated_at = now() WHERE id = $3',
          ['failed', JSON.stringify(validation), payment.id],
        );
        return { valid: false, shopId: payment.shop_id, userId: payment.user_id };
      }

      // Verify the paid amount matches what we expected
      const paidAmount = parseFloat(validation.amount || validation.currency_amount || 0);
      const expectedAmount = parseFloat(payment.amount);
      if (Math.abs(paidAmount - expectedAmount) > 1) {
        console.error(`[subscription-payments] Amount mismatch: paid=${paidAmount}, expected=${expectedAmount}, tran_id=${tran_id}`);
        await db.query(
          'UPDATE subscription_payments SET status = $1, gateway_response = $2, updated_at = now() WHERE id = $3',
          ['failed', JSON.stringify({ ...validation, _reason: 'amount_mismatch' }), payment.id],
        );
        return { valid: false, shopId: payment.shop_id, userId: payment.user_id, reason: 'amount_mismatch' };
      }

      validated = true;
    } catch (_e) {
      // If SSLCommerz validation endpoint is unreachable, FAIL CLOSED — do not trust unverified callbacks
      console.error('[subscription-payments] SSLCommerz validation endpoint unreachable:', _e.message);
      await db.query(
        'UPDATE subscription_payments SET status = $1, gateway_response = $2, updated_at = now() WHERE id = $3',
        ['pending_verification', JSON.stringify({ error: _e.message, callbackBody: body }), payment.id],
      );
      return { valid: false, shopId: payment.shop_id, userId: payment.user_id, reason: 'verification_failed' };
    }

    if (!validated) return { valid: false, shopId: payment.shop_id, userId: payment.user_id };

    // Mark payment completed
    await db.query(
      'UPDATE subscription_payments SET status = $1, gateway_response = $2, updated_at = now() WHERE id = $3',
      ['completed', JSON.stringify(body), payment.id],
    );

    // Activate the shop
    await db.query(
      "UPDATE shops SET status = 'active', updated_at = now() WHERE id = $1",
      [payment.shop_id],
    );

    // Activate subscription record in shop_subscriptions
    try {
      await engine.activateSubscription(payment.shop_id, payment.plan_slug, payment.billing_cycle || 'monthly');
    } catch (_e) {
      // Non-blocking — shop is already activated above
      console.error('[subscription-payments] Failed to activate subscription record:', _e.message);
    }

    return { valid: true, shopId: payment.shop_id, userId: payment.user_id };
  }

  // Failed or cancelled
  const newStatus = status === 'FAILED' ? 'failed' : 'cancelled';
  await db.query(
    'UPDATE subscription_payments SET status = $1, gateway_response = $2, updated_at = now() WHERE id = $3',
    [newStatus, JSON.stringify(body), payment.id],
  );
  return { valid: false, shopId: payment.shop_id, userId: payment.user_id };
}

/**
 * Generate auth tokens for a user (used after successful payment callback).
 */
async function generateAuthTokensForUser(userId) {
  const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) return null;

  const authService = require('../services/auth');
  const accessToken = authService.signAccessToken({ id: user.id, role: user.role, shop_id: user.shop_id });
  const refreshToken = authService.signRefreshToken({ id: user.id });

  // Store refresh token
  await db.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')",
    [user.id, refreshToken],
  );

  return { accessToken, refreshToken, user };
}

module.exports = {
  initSubscriptionPayment,
  handleSubscriptionCallback,
  generateAuthTokensForUser,
};
