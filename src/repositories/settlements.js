/**
 * Settlements Repository
 * Immutable ledger of financial transactions with escrow/release semantics
 */
const db = require('../db');

/* ── Settlement Config ─────────────────────────────────────────────── */

async function getSettlementConfig(shopId) {
  const { rows } = await db.query(
    `SELECT * FROM settlement_config WHERE shop_id = $1`,
    [shopId]
  );
  return rows[0] || null;
}

async function upsertSettlementConfig(shopId, data) {
  const { rows } = await db.query(
    `INSERT INTO settlement_config (
       shop_id, is_enabled, hold_days, auto_release,
       payout_schedule, min_payout_threshold, preferred_method, account_details
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (shop_id) DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled,
       hold_days = EXCLUDED.hold_days,
       auto_release = EXCLUDED.auto_release,
       payout_schedule = EXCLUDED.payout_schedule,
       min_payout_threshold = EXCLUDED.min_payout_threshold,
       preferred_method = EXCLUDED.preferred_method,
       account_details = EXCLUDED.account_details,
       updated_at = NOW()
     RETURNING *`,
    [
      shopId,
      data.isEnabled !== undefined ? data.isEnabled : true,
      data.holdDays || 3,
      data.autoRelease !== undefined ? data.autoRelease : true,
      data.payoutSchedule || 'on_demand',
      data.minPayoutThreshold || 500,
      data.preferredMethod || 'bank_transfer',
      data.accountDetails ? JSON.stringify(data.accountDetails) : null,
    ]
  );
  return rows[0];
}

/* ── Shop Balance Summary ──────────────────────────────────────────── */

async function getShopBalance(shopId) {
  const { rows } = await db.query(
    `SELECT * FROM shop_balance_summary WHERE shop_id = $1`,
    [shopId]
  );
  return rows[0] || { shop_id: shopId, held_balance: 0, releasable_balance: 0, available_balance: 0, payouts_processing: 0 };
}

async function getAllShopBalances() {
  const { rows } = await db.query(`SELECT * FROM shop_balance_summary ORDER BY shop_id`);
  return rows;
}

async function updateShopBalanceSummary(shopId, client) {
  const query = client ? client.query : db.query;
  const { rows } = await query(
    `INSERT INTO shop_balance_summary (shop_id, held_balance, releasable_balance, available_balance, payouts_processing, last_updated)
     VALUES ($1,
       (SELECT COALESCE(SUM(amount),0) FROM settlement_ledger WHERE shop_id = $1 AND amount > 0 AND release_at IS NULL AND released_at IS NULL),
       (SELECT COALESCE(SUM(amount),0) FROM settlement_ledger WHERE shop_id = $1 AND amount > 0 AND release_at IS NOT NULL AND release_at <= NOW() AND released_at IS NULL),
       (SELECT COALESCE(SUM(amount),0) FROM settlement_ledger WHERE shop_id = $1 AND released_at IS NOT NULL)
       -
       (SELECT COALESCE(SUM(amount),0) FROM settlement_ledger WHERE shop_id = $1 AND released_at IS NOT NULL AND transaction_type = 'payout_debit')
       -
       (SELECT COALESCE(SUM(ABS(amount)),0) FROM settlement_ledger WHERE shop_id = $1 AND released_at IS NULL AND amount < 0 AND transaction_type IN ('refund_from_balance', 'chargeback_debit'))
       -
       (SELECT COALESCE(SUM(wr.amount),0) FROM withdrawal_requests wr WHERE wr.shop_id = $1 AND wr.status IN ('approved', 'processing')),
       (SELECT COALESCE(SUM(wr.amount),0) FROM withdrawal_requests wr WHERE wr.shop_id = $1 AND wr.status IN ('approved', 'processing')),
       NOW()
     )
     ON CONFLICT (shop_id) DO UPDATE SET
       held_balance = EXCLUDED.held_balance,
       releasable_balance = EXCLUDED.releasable_balance,
       available_balance = EXCLUDED.available_balance,
       payouts_processing = EXCLUDED.payouts_processing,
       last_updated = NOW()
     RETURNING *`,
    [shopId]
  );
  return rows[0];
}

/* ── Settlement Ledger (immutable writes only) ────────────────────── */

async function createLedgerEntry({
  shopId, paymentId, orderId, earningId, transactionType,
  amount, currency, referenceId, description, releaseAt,
}, client) {
  const query = client ? client.query : db.query;

  // Get current balance
  const balRes = await query(
    `SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS balance
     FROM settlement_ledger WHERE shop_id = $1`,
    [shopId]
  );
  const currentBalance = Number(balRes.rows[0]?.balance || 0);
  const balanceAfter = Number((currentBalance + Number(amount)).toFixed(2));

  const { rows } = await query(
    `INSERT INTO settlement_ledger (
       shop_id, payment_id, order_id, earning_id, transaction_type,
       amount, currency, balance_after, reference_id, description,
       release_at, released_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
       CASE WHEN $11 IS NULL THEN NOW() ELSE NULL END
     ) RETURNING *`,
    [
      shopId, paymentId || null, orderId || null, earningId || null,
      transactionType, Number(amount), currency || 'BDT',
      balanceAfter, referenceId || null, description || null,
      releaseAt || null,
    ]
  );
  return rows[0];
}

async function releaseLedgerEntries(shopId, earningIds, client) {
  if (!earningIds || earningIds.length === 0) return [];
  const query = client ? client.query : db.query;
  const { rows } = await query(
    `UPDATE settlement_ledger
     SET released_at = NOW()
     WHERE shop_id = $1 AND id = ANY($2) AND released_at IS NULL
     RETURNING *`,
    [shopId, earningIds]
  );
  return rows;
}

async function getLedgerEntries(shopId, opts = {}) {
  const { page = 1, limit = 50, type, fromDate, toDate } = opts;
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (type) { conditions.push(`transaction_type = $${idx++}`); params.push(type); }
  if (fromDate) { conditions.push(`created_at >= $${idx++}`); params.push(fromDate); }
  if (toDate) { conditions.push(`created_at <= $${idx++}`); params.push(toDate); }
  const where = 'WHERE ' + conditions.join(' AND ');
  const countRes = await db.query(`SELECT COUNT(*) FROM settlement_ledger ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const { rows } = await db.query(
    `SELECT sl.*, p.method AS payment_method, o.total_amount AS order_amount
     FROM settlement_ledger sl
     LEFT JOIN payments p ON p.id = sl.payment_id
     LEFT JOIN orders o ON o.id = sl.order_id
     ${where} ORDER BY sl.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getPendingReleases(shopId) {
  const { rows } = await db.query(
    `SELECT sl.*, se.id AS earning_id
     FROM settlement_ledger sl
     LEFT JOIN shop_earnings se ON se.id = sl.earning_id
     WHERE sl.shop_id = $1
       AND sl.release_at IS NOT NULL
       AND sl.release_at <= NOW()
       AND sl.released_at IS NULL
     ORDER BY sl.release_at`,
    [shopId]
  );
  return rows;
}

async function getHeldEntries(shopId) {
  const { rows } = await db.query(
    `SELECT sl.* FROM settlement_ledger sl
     WHERE sl.shop_id = $1 AND sl.release_at IS NULL AND sl.released_at IS NULL
     ORDER BY sl.created_at DESC`,
    [shopId]
  );
  return rows;
}

/* ── Settlement Schedules ──────────────────────────────────────────── */

async function createSettlementSchedule({ shopId, earningId, scheduledFor }) {
  const { rows } = await db.query(
    `INSERT INTO settlement_schedules (shop_id, earning_id, scheduled_for)
     VALUES ($1, $2, $3) RETURNING *`,
    [shopId, earningId || null, scheduledFor]
  );
  return rows[0];
}

async function getPendingSettlementSchedules(limit = 100) {
  const { rows } = await db.query(
    `SELECT ss.*, sc.auto_release
     FROM settlement_schedules ss
     JOIN settlement_config sc ON sc.shop_id = ss.shop_id
     WHERE ss.status = 'pending' AND ss.scheduled_for <= NOW()
     ORDER BY ss.scheduled_for
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function markScheduleProcessed(scheduleId) {
  const { rows } = await db.query(
    `UPDATE settlement_schedules SET status = 'processed', processed_at = NOW()
     WHERE id = $1 RETURNING *`,
    [scheduleId]
  );
  return rows[0] || null;
}

async function markScheduleFailed(scheduleId, errorMessage) {
  const { rows } = await db.query(
    `UPDATE settlement_schedules SET status = 'failed', error_message = $2, processed_at = NOW()
     WHERE id = $1 RETURNING *`,
    [scheduleId, errorMessage]
  );
  return rows[0] || null;
}

/* ── Platform Ledger ──────────────────────────────────────────────── */

async function createPlatformLedgerEntry({ shopId, paymentId, earningId, description, amount, entryType, referenceId }) {
  const { rows } = await db.query(
    `INSERT INTO platform_ledger (shop_id, payment_id, earning_id, description, amount, entry_type, reference_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [shopId || null, paymentId || null, earningId || null, description || null, Number(amount), entryType, referenceId || null]
  );
  return rows[0];
}

async function getPlatformLedger(opts = {}) {
  const { page = 1, limit = 50, shopId, fromDate, toDate } = opts;
  const conditions = [];
  const params = [];
  let idx = 1;
  if (shopId) { conditions.push(`shop_id = $${idx++}`); params.push(shopId); }
  if (fromDate) { conditions.push(`created_at >= $${idx++}`); params.push(fromDate); }
  if (toDate) { conditions.push(`created_at <= $${idx++}`); params.push(toDate); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRes = await db.query(`SELECT COUNT(*) FROM platform_ledger ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const { rows } = await db.query(
    `SELECT * FROM platform_ledger ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getPlatformSummary() {
  const { rows } = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS total_commission,
       COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS total_refunds,
       COUNT(*) AS total_entries
     FROM platform_ledger`
  );
  return rows[0];
}

/* ── Refund Disputes ──────────────────────────────────────────────── */

async function createRefundDispute({ refundRequestId, shopId, disputedByUserId, reason }) {
  const { rows } = await db.query(
    `INSERT INTO refund_disputes (refund_request_id, shop_id, disputed_by_user_id, reason)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [refundRequestId, shopId, disputedByUserId, reason]
  );
  return rows[0];
}

async function resolveRefundDispute(disputeId, { resolvedBy, status, resolutionNotes }) {
  const { rows } = await db.query(
    `UPDATE refund_disputes
     SET status = $2, resolution_notes = $3, resolved_by = $4, resolved_at = NOW()
     WHERE id = $1 RETURNING *`,
    [disputeId, status, resolutionNotes || null, resolvedBy]
  );
  return rows[0] || null;
}

async function getRefundDisputes(shopId) {
  const { rows } = await db.query(
    `SELECT rd.*, u.full_name AS disputed_by_name, rr.refund_amount, o.id AS order_id
     FROM refund_disputes rd
     JOIN users u ON u.id = rd.disputed_by_user_id
     JOIN refund_requests rr ON rr.id = rd.refund_request_id
     LEFT JOIN orders o ON o.id = rr.order_id
     WHERE rd.shop_id = $1
     ORDER BY rd.created_at DESC`,
    [shopId]
  );
  return rows;
}

/* ── Earnings Link Helper ─────────────────────────────────────────── */

async function findEarningByPaymentAndShop(paymentId, shopId) {
  const { rows } = await db.query(
    `SELECT * FROM shop_earnings WHERE payment_id = $1 AND shop_id = $2 LIMIT 1`,
    [paymentId, shopId]
  );
  return rows[0] || null;
}

module.exports = {
  // Config
  getSettlementConfig, upsertSettlementConfig,
  // Balance
  getShopBalance, getAllShopBalances, updateShopBalanceSummary,
  // Ledger
  createLedgerEntry, releaseLedgerEntries, getLedgerEntries, getPendingReleases, getHeldEntries,
  // Schedules
  createSettlementSchedule, getPendingSettlementSchedules, markScheduleProcessed, markScheduleFailed,
  // Platform
  createPlatformLedgerEntry, getPlatformLedger, getPlatformSummary,
  // Disputes
  createRefundDispute, resolveRefundDispute, getRefundDisputes,
  // Helpers
  findEarningByPaymentAndShop,
};
