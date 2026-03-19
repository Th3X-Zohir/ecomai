/**
 * Affiliates Repository — referral and affiliate program data access.
 */
const db = require('../db');

/**
 * Get or create affiliate program for a shop.
 */
async function getProgram(shopId) {
  const { rows } = await db.query(
    `SELECT * FROM affiliate_programs WHERE shop_id = $1`,
    [shopId]
  );
  return rows[0] || null;
}

async function upsertProgram(shopId, data) {
  const {
    is_active = true,
    commission_type = 'percentage',
    commission_value = 5,
    commission_order_limit = null,
    min_payout = 200,
    payout_schedule = 'on_demand',
    cookie_days = 7,
  } = data;
  const { rows } = await db.query(
    `INSERT INTO affiliate_programs
       (shop_id, is_active, commission_type, commission_value,
        commission_order_limit, min_payout, payout_schedule, cookie_days)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (shop_id) DO UPDATE SET
       is_active = EXCLUDED.is_active,
       commission_type = EXCLUDED.commission_type,
       commission_value = EXCLUDED.commission_value,
       commission_order_limit = EXCLUDED.commission_order_limit,
       min_payout = EXCLUDED.min_payout,
       payout_schedule = EXCLUDED.payout_schedule,
       cookie_days = EXCLUDED.cookie_days,
       updated_at = now()
     RETURNING *`,
    [shopId, is_active, commission_type, commission_value,
     commission_order_limit, min_payout, payout_schedule, cookie_days]
  );
  return rows[0];
}

// ─── Affiliates ──────────────────────────────────────────────

/**
 * Find affiliate by referral code.
 */
async function findByCode(shopId, referralCode) {
  const { rows } = await db.query(
    `SELECT a.*, ap.commission_type, ap.commission_value, ap.cookie_days
     FROM affiliates a
     JOIN affiliate_programs ap ON ap.shop_id = a.shop_id
     WHERE a.shop_id = $1 AND a.referral_code = $2 AND a.status = 'active' AND ap.is_active = true`,
    [shopId, referralCode]
  );
  return rows[0] || null;
}

/**
 * Find affiliate by customer ID.
 */
async function findByCustomer(shopId, customerId) {
  const { rows } = await db.query(
    `SELECT * FROM affiliates WHERE shop_id = $1 AND customer_id = $2`,
    [shopId, customerId]
  );
  return rows[0] || null;
}

/**
 * Create a new affiliate (promoter).
 */
async function createAffiliate({ shopId, customerId = null, email, displayName }) {
  // Generate unique referral code
  const baseCode = (displayName || email || 'AFF')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
    .padEnd(4, 'X');
  const uniqueSuffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  const referralCode = `${baseCode}${uniqueSuffix}`.slice(0, 10);

  const { rows } = await db.query(
    `INSERT INTO affiliates (shop_id, customer_id, email, referral_code, display_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [shopId, customerId, email, referralCode, displayName || null]
  );
  return rows[0];
}

/**
 * Get affiliate with stats.
 */
async function getAffiliate(affiliateId, shopId) {
  const { rows } = await db.query(
    `SELECT a.*,
       COALESCE(SUM(ar.commission_amount) FILTER (WHERE ar.commission_status = 'paid') , 0)::numeric AS total_paid,
       COALESCE(SUM(ar.commission_amount) FILTER (WHERE ar.commission_status IN ('pending','approved')), 0)::numeric AS unpaid_earnings,
       COUNT(ar.id) FILTER (WHERE ar.commission_status IN ('pending','approved','paid'))::int AS total_referrals,
       COUNT(ar.id) FILTER (WHERE ar.commission_status = 'paid')::int AS completed_referrals
     FROM affiliates a
     LEFT JOIN affiliate_referrals ar ON ar.affiliate_id = a.id
     WHERE a.id = $1 AND a.shop_id = $2
     GROUP BY a.id`,
    [affiliateId, shopId]
  );
  return rows[0] || null;
}

/**
 * List affiliates for a shop.
 */
async function listByShop(shopId, { page = 1, limit = 50, status } = {}) {
  const conditions = ['a.shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (status) { conditions.push(`a.status = $${idx}`); params.push(status); idx++; }

  const countRes = await db.query(
    `SELECT COUNT(*) FROM affiliates a WHERE ${conditions.join(' AND ')}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;

  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT a.*,
       COUNT(ar.id)::int AS total_referrals,
       COALESCE(SUM(ar.commission_amount) FILTER (WHERE ar.commission_status IN ('pending','approved')), 0)::numeric AS unpaid_earnings
     FROM affiliates a
     LEFT JOIN affiliate_referrals ar ON ar.affiliate_id = a.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY a.id
     ORDER BY a.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─── Referral Tracking ──────────────────────────────────────

/**
 * Create a referral record when an order is placed with a referral code.
 */
async function createReferral({ affiliateId, shopId, referredCustomerId, orderId, orderAmount }) {
  // Get commission settings
  const affiliate = await db.query(
    `SELECT a.*, ap.commission_type, ap.commission_value, ap.commission_order_limit
     FROM affiliates a
     JOIN affiliate_programs ap ON ap.shop_id = a.shop_id
     WHERE a.id = $1`,
    [affiliateId]
  );
  if (!affiliate.rows[0]) return null;

  const { commission_type, commission_value, commission_order_limit } = affiliate.rows[0];

  // Check affiliate order limit
  if (commission_order_limit !== null) {
    const countRes = await db.query(
      `SELECT COUNT(*) FROM affiliate_referrals WHERE affiliate_id = $1 AND commission_status != 'cancelled'`,
      [affiliateId]
    );
    if (parseInt(countRes.rows[0].count, 10) >= commission_order_limit) return null;
  }

  // Calculate commission
  const commissionAmount = commission_type === 'fixed'
    ? Number(commission_value)
    : Number((orderAmount * commission_value / 100).toFixed(2));

  const { rows } = await db.query(
    `INSERT INTO affiliate_referrals
       (affiliate_id, shop_id, referred_customer_id, order_id, commission_status, commission_amount, order_amount)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6)
     RETURNING *`,
    [affiliateId, shopId, referredCustomerId, orderId, commissionAmount, orderAmount]
  );

  // Update affiliate stats
  await db.query(
    `UPDATE affiliates SET
       total_referrals = total_referrals + 1,
       unpaid_earnings = unpaid_earnings + $2
     WHERE id = $1`,
    [affiliateId, commissionAmount]
  );

  return rows[0];
}

/**
 * Get referrals for an affiliate.
 */
async function listReferrals(affiliateId, { page = 1, limit = 20, status } = {}) {
  const conditions = ['ar.affiliate_id = $1'];
  const params = [affiliateId];
  let idx = 2;
  if (status) { conditions.push(`ar.commission_status = $${idx}`); params.push(status); idx++; }

  const countRes = await db.query(
    `SELECT COUNT(*) FROM affiliate_referrals ar WHERE ${conditions.join(' AND ')}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT ar.*, c.email AS referred_customer_email
     FROM affiliate_referrals ar
     LEFT JOIN customers c ON c.id = ar.referred_customer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ar.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Approve a referral and credit affiliate earnings.
 */
async function approveReferral(referralId, shopId) {
  const { rows: [referral] } = await db.query(
    `SELECT * FROM affiliate_referrals WHERE id = $1 AND shop_id = $2`,
    [referralId, shopId]
  );
  if (!referral) return null;
  if (referral.commission_status !== 'pending') return referral;

  await db.query(
    `UPDATE affiliate_referrals SET commission_status = 'approved' WHERE id = $1`,
    [referralId]
  );

  return { ...referral, commission_status: 'approved' };
}

/**
 * Mark referral as paid (after affiliate withdrawal).
 */
async function markReferralPaid(referralId) {
  await db.query(
    `UPDATE affiliate_referrals SET commission_status = 'paid', paid_at = now() WHERE id = $1`,
    [referralId]
  );
}

/**
 * Cancel a referral.
 */
async function cancelReferralByOrderId(orderId) {
  const { rows } = await db.query(
    `UPDATE affiliate_referrals
     SET commission_status = 'cancelled'
     WHERE order_id = $1 AND commission_status = 'pending'
     RETURNING *`,
    [orderId]
  );
  if (rows[0]) {
    await db.query(
      `UPDATE affiliates SET unpaid_earnings = GREATEST(0, unpaid_earnings - $2) WHERE id = $1`,
      [rows[0].affiliate_id, rows[0].commission_amount]
    );
  }
  return rows[0] || null;
}

async function cancelReferral(referralId, shopId) {
  const { rows: [referral] } = await db.query(
    `SELECT * FROM affiliate_referrals WHERE id = $1 AND shop_id = $2`,
    [referralId, shopId]
  );
  if (!referral) return null;

  await db.query(
    `UPDATE affiliate_referrals SET commission_status = 'cancelled' WHERE id = $1`,
    [referralId]
  );

  if (referral.commission_status !== 'paid') {
    await db.query(
      `UPDATE affiliates SET unpaid_earnings = GREATEST(0, unpaid_earnings - $2) WHERE id = $1`,
      [referral.affiliate_id, referral.commission_amount]
    );
  }

  return { ...referral, commission_status: 'cancelled' };
}

/**
 * Get affiliate stats for a shop (for merchant dashboard).
 */
async function getShopAffiliateStats(shopId) {
  const { rows } = await db.query(
    `SELECT
       COUNT(DISTINCT a.id)::int AS total_affiliates,
       COUNT(DISTINCT ar.id) FILTER (WHERE ar.commission_status IN ('pending','approved'))::int AS pending_referrals,
       COUNT(DISTINCT ar.id) FILTER (WHERE ar.commission_status = 'paid')::int AS completed_referrals,
       COALESCE(SUM(ar.commission_amount) FILTER (WHERE ar.commission_status IN ('pending','approved')), 0)::numeric AS pending_commissions,
       COALESCE(SUM(ar.commission_amount) FILTER (WHERE ar.commission_status = 'paid'), 0)::numeric AS paid_commissions,
       COALESCE(AVG(ar.commission_amount) FILTER (WHERE ar.commission_status = 'paid'), 0)::numeric AS avg_commission
     FROM affiliates a
     LEFT JOIN affiliate_referrals ar ON ar.affiliate_id = a.id
     WHERE a.shop_id = $1`,
    [shopId]
  );
  return rows[0];
}

/**
 * Get top affiliates by earnings for a shop.
 */
async function getTopAffiliates(shopId, limit = 5) {
  const { rows } = await db.query(
    `SELECT a.id, a.email, a.display_name, a.total_referrals, a.total_earned, a.unpaid_earnings,
       COUNT(ar.id) FILTER (WHERE ar.commission_status = 'paid')::int AS completed_referrals,
       COUNT(ar.id) FILTER (WHERE ar.commission_status IN ('pending','approved'))::int AS pending_referrals
     FROM affiliates a
     LEFT JOIN affiliate_referrals ar ON ar.affiliate_id = a.id
     WHERE a.shop_id = $1 AND a.status = 'active'
     GROUP BY a.id
     ORDER BY a.total_earned DESC
     LIMIT $2`,
    [shopId, limit]
  );
  return rows;
}

module.exports = {
  getProgram, upsertProgram,
  findByCode, findByCustomer, createAffiliate, getAffiliate, listByShop,
  createReferral, listReferrals, approveReferral, markReferralPaid, cancelReferral, cancelReferralByOrderId,
  getShopAffiliateStats, getTopAffiliates,
};
