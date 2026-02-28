const db = require('../db');

/* ── Shop Earnings ── */

async function createEarning(data, client) {
  const q = client || db;
  const res = await q.query(
    `INSERT INTO shop_earnings (shop_id, payment_id, order_id, type, gross_amount, commission_rate, commission_amount, net_amount, currency, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [data.shop_id, data.payment_id || null, data.order_id || null, data.type,
     data.gross_amount, data.commission_rate || 0, data.commission_amount || 0,
     data.net_amount, data.currency || 'BDT', data.description || null]
  );
  return res.rows[0];
}

async function getBalance(shopId) {
  const res = await db.query(
    `SELECT COALESCE(SUM(net_amount), 0)::numeric AS balance FROM shop_earnings WHERE shop_id = $1`,
    [shopId]
  );
  return Number(res.rows[0].balance);
}

async function getEarningsSummary(shopId) {
  const res = await db.query(
    `SELECT
       COALESCE(SUM(net_amount), 0)::numeric AS total_balance,
       COALESCE(SUM(CASE WHEN type = 'sale' THEN gross_amount ELSE 0 END), 0)::numeric AS total_gross,
       COALESCE(SUM(CASE WHEN type = 'commission' OR type = 'sale' THEN commission_amount ELSE 0 END), 0)::numeric AS total_commission,
       COALESCE(SUM(CASE WHEN type = 'sale' THEN net_amount ELSE 0 END), 0)::numeric AS total_net_earned,
       COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN ABS(net_amount) ELSE 0 END), 0)::numeric AS total_withdrawn,
       COALESCE(SUM(CASE WHEN type = 'refund' THEN ABS(net_amount) ELSE 0 END), 0)::numeric AS total_refunded,
       COUNT(*) FILTER (WHERE type = 'sale')::int AS sale_count
     FROM shop_earnings WHERE shop_id = $1`,
    [shopId]
  );
  return res.rows[0];
}

async function listEarnings(shopId, { page = 1, limit = 50, type } = {}) {
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (type) { conditions.push(`type = $${idx}`); params.push(type); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const countRes = await db.query(`SELECT COUNT(*) FROM shop_earnings ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT * FROM shop_earnings ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function listAllEarnings({ page = 1, limit = 50, type, shopId } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (shopId) { conditions.push(`e.shop_id = $${idx}`); params.push(shopId); idx++; }
  if (type) { conditions.push(`e.type = $${idx}`); params.push(type); idx++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRes = await db.query(`SELECT COUNT(*) FROM shop_earnings e ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT e.*, s.name AS shop_name, s.slug AS shop_slug
     FROM shop_earnings e LEFT JOIN shops s ON s.id = e.shop_id
     ${where} ORDER BY e.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/* ── Platform-wide aggregates for super admin ── */
async function getPlatformSummary() {
  const res = await db.query(
    `SELECT
       COALESCE(SUM(gross_amount) FILTER (WHERE type = 'sale'), 0)::numeric AS total_gross_sales,
       COALESCE(SUM(commission_amount) FILTER (WHERE type = 'sale'), 0)::numeric AS total_commission_earned,
       COALESCE(SUM(net_amount) FILTER (WHERE type = 'sale'), 0)::numeric AS total_shop_earnings,
       COALESCE(SUM(ABS(net_amount)) FILTER (WHERE type = 'withdrawal'), 0)::numeric AS total_withdrawn,
       COUNT(*) FILTER (WHERE type = 'sale')::int AS total_sales,
       COUNT(DISTINCT shop_id)::int AS active_shops
     FROM shop_earnings`
  );
  return res.rows[0];
}

async function getShopBalances({ page = 1, limit = 50 } = {}) {
  const countRes = await db.query(
    `SELECT COUNT(DISTINCT shop_id)::int AS cnt FROM shop_earnings`
  );
  const total = countRes.rows[0].cnt;
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT e.shop_id, s.name AS shop_name, s.slug AS shop_slug,
       COALESCE(SUM(e.net_amount), 0)::numeric AS balance,
       COALESCE(SUM(e.gross_amount) FILTER (WHERE e.type = 'sale'), 0)::numeric AS gross_earned,
       COALESCE(SUM(e.commission_amount) FILTER (WHERE e.type = 'sale'), 0)::numeric AS commission_paid,
       COALESCE(SUM(ABS(e.net_amount)) FILTER (WHERE e.type = 'withdrawal'), 0)::numeric AS withdrawn,
       COUNT(*) FILTER (WHERE e.type = 'sale')::int AS sale_count
     FROM shop_earnings e LEFT JOIN shops s ON s.id = e.shop_id
     GROUP BY e.shop_id, s.name, s.slug
     ORDER BY balance DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/* ── Withdrawal Requests ── */

async function createWithdrawal(data) {
  const res = await db.query(
    `INSERT INTO withdrawal_requests (shop_id, requested_by, amount, currency, payment_method, account_details)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.shop_id, data.requested_by, data.amount, data.currency || 'BDT',
     data.payment_method || 'bank_transfer', data.account_details ? JSON.stringify(data.account_details) : null]
  );
  return res.rows[0];
}

async function findWithdrawalById(id, shopId) {
  const conditions = ['id = $1'];
  const params = [id];
  if (shopId) { conditions.push('shop_id = $2'); params.push(shopId); }
  const res = await db.query(`SELECT * FROM withdrawal_requests WHERE ${conditions.join(' AND ')}`, params);
  return res.rows[0] || null;
}

async function listWithdrawals(shopId, { page = 1, limit = 20, status } = {}) {
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (status) { conditions.push(`status = $${idx}`); params.push(status); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const countRes = await db.query(`SELECT COUNT(*) FROM withdrawal_requests ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT * FROM withdrawal_requests ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function listAllWithdrawals({ page = 1, limit = 50, status, shopId } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (shopId) { conditions.push(`w.shop_id = $${idx}`); params.push(shopId); idx++; }
  if (status) { conditions.push(`w.status = $${idx}`); params.push(status); idx++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRes = await db.query(`SELECT COUNT(*) FROM withdrawal_requests w ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT w.*, s.name AS shop_name, s.slug AS shop_slug, u.email AS requested_by_email
     FROM withdrawal_requests w
     LEFT JOIN shops s ON s.id = w.shop_id
     LEFT JOIN users u ON u.id = w.requested_by
     ${where} ORDER BY w.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function updateWithdrawal(id, patch) {
  const allowed = ['status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'processed_at', 'completed_at', 'reference_id'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return findWithdrawalById(id);
  sets.push('updated_at = now()');
  params.push(id);
  const res = await db.query(`UPDATE withdrawal_requests SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
  return res.rows[0] || null;
}

/* ── Commission Settings ── */

async function getCommissionSettings(shopId) {
  // Try shop-specific first, then fall back to global
  if (shopId) {
    const res = await db.query('SELECT * FROM commission_settings WHERE shop_id = $1', [shopId]);
    if (res.rows[0]) return res.rows[0];
  }
  const res = await db.query('SELECT * FROM commission_settings WHERE shop_id IS NULL LIMIT 1');
  return res.rows[0] || { commission_rate: 0.05, min_withdrawal: 500, payout_cycle: 'on_request' };
}

async function upsertCommissionSettings(shopId, data) {
  const res = await db.query(
    `INSERT INTO commission_settings (shop_id, commission_rate, min_withdrawal, payout_cycle, created_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (shop_id) DO UPDATE SET
       commission_rate = EXCLUDED.commission_rate,
       min_withdrawal = EXCLUDED.min_withdrawal,
       payout_cycle = EXCLUDED.payout_cycle,
       updated_at = now()
     RETURNING *`,
    [shopId || null, data.commission_rate, data.min_withdrawal || 500, data.payout_cycle || 'on_request', data.created_by || null]
  );
  return res.rows[0];
}

module.exports = {
  createEarning, getBalance, getEarningsSummary, listEarnings, listAllEarnings,
  getPlatformSummary, getShopBalances,
  createWithdrawal, findWithdrawalById, listWithdrawals, listAllWithdrawals, updateWithdrawal,
  getCommissionSettings, upsertCommissionSettings,
};
