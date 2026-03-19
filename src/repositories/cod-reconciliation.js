/**
 * COD Reconciliation Repository
 * Cash-on-Delivery collection tracking and driver settlements
 */
const db = require('../db');

/* ── COD Collections ─────────────────────────────────────────────── */

async function recordCodCollection({ deliveryRequestId, shopId, orderId, driverUserId, collectedAmount, proofImageUrl, customerName, customerPhone, notes }) {
  const { rows } = await db.query(
    `INSERT INTO cod_collections (delivery_request_id, shop_id, order_id, driver_user_id, collected_amount, proof_image_url, customer_name, customer_phone, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [deliveryRequestId, shopId, orderId, driverUserId, collectedAmount, proofImageUrl || null, customerName || null, customerPhone || null, notes || null]
  );
  return rows[0];
}

async function getCollectionByDeliveryRequest(deliveryRequestId) {
  const { rows } = await db.query(
    `SELECT cc.*, u.full_name AS driver_name
     FROM cod_collections cc
     JOIN users u ON u.id = cc.driver_user_id
     WHERE cc.delivery_request_id = $1`,
    [deliveryRequestId]
  );
  return rows[0] || null;
}

async function listCollectionsByDriver(driverUserId, { fromDate, toDate, status } = {}) {
  const conditions = ['driver_user_id = $1'];
  const params = [driverUserId];
  let idx = 2;
  if (fromDate) { conditions.push(`collected_at >= $${idx++}`); params.push(fromDate); }
  if (toDate) { conditions.push(`collected_at <= $${idx++}`); params.push(toDate); }
  const where = 'WHERE ' + conditions.join(' AND ');
  const { rows } = await db.query(
    `SELECT cc.*, s.name AS shop_name, o.total_amount AS order_total
     FROM cod_collections cc
     JOIN shops s ON s.id = cc.shop_id
     JOIN orders o ON o.id = cc.order_id
     ${where} ORDER BY cc.collected_at DESC`,
    params
  );
  return rows;
}

async function listCollectionsByShop(shopId, { fromDate, toDate, driverId } = {}) {
  const conditions = ['cc.shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (fromDate) { conditions.push(`cc.collected_at >= $${idx++}`); params.push(fromDate); }
  if (toDate) { conditions.push(`cc.collected_at <= $${idx++}`); params.push(toDate); }
  if (driverId) { conditions.push(`cc.driver_user_id = $${idx++}`); params.push(driverId); }
  const where = 'WHERE ' + conditions.join(' AND ');
  const { rows } = await db.query(
    `SELECT cc.*, u.full_name AS driver_name, o.total_amount AS order_total, o.customer_email
     FROM cod_collections cc
     JOIN users u ON u.id = cc.driver_user_id
     JOIN orders o ON o.id = cc.order_id
     ${where} ORDER BY cc.collected_at DESC`,
    params
  );
  return rows;
}

async function getDriverCodSummary(driverUserId, { fromDate, toDate } = {}) {
  const conditions = ['driver_user_id = $1'];
  const params = [driverUserId];
  let idx = 2;
  if (fromDate) { conditions.push(`collected_at >= $${idx++}`); params.push(fromDate); }
  if (toDate) { conditions.push(`collected_at <= $${idx++}`); params.push(toDate); }
  const where = 'WHERE ' + conditions.join(' AND ');
  const { rows } = await db.query(
    `SELECT
       COUNT(*)::int AS total_collections,
       COALESCE(SUM(collected_amount), 0)::numeric AS total_collected,
       COALESCE((SELECT SUM(amount) FROM withdrawal_requests WHERE shop_id = cc.shop_id AND status IN ('completed') AND created_at >= (SELECT MIN(collected_at) FROM cod_collections WHERE driver_user_id = $1)), 0) AS total_settled
     FROM cod_collections cc
     ${where}`,
    params
  );
  return rows[0];
}

/* ── COD Settlements ──────────────────────────────────────────────── */

async function createCodSettlement({ shopId, driverUserId, periodStart, periodEnd, totalCollected, totalRemitted, balanceDue }) {
  const { rows } = await db.query(
    `INSERT INTO cod_settlements (shop_id, driver_user_id, period_start, period_end, total_collected, total_remitted, balance_due, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
    [shopId, driverUserId, periodStart, periodEnd, totalCollected, totalRemitted, balanceDue]
  );
  return rows[0];
}

async function addSettlementItems(settlementId, collectionIds) {
  if (!collectionIds.length) return;
  const vals = collectionIds.map((cid, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
  const params = collectionIds.flatMap(cid => [settlementId, cid]);
  await db.query(
    `INSERT INTO cod_settlement_items (settlement_id, collection_id)
     SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM cod_collections WHERE id = $2)
     ON CONFLICT DO NOTHING`,
    params
  );
}

async function listSettlementsByShop(shopId, { status, driverId } = {}) {
  const conditions = ['cs.shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (status) { conditions.push(`cs.status = $${idx++}`); params.push(status); }
  if (driverId) { conditions.push(`cs.driver_user_id = $${idx++}`); params.push(driverId); }
  const where = 'WHERE ' + conditions.join(' AND ');
  const { rows } = await db.query(
    `SELECT cs.*, u.full_name AS driver_name, ru.full_name AS reviewer_name
     FROM cod_settlements cs
     JOIN users u ON u.id = cs.driver_user_id
     LEFT JOIN users ru ON ru.id = cs.reviewed_by
     ${where} ORDER BY cs.created_at DESC`,
    params
  );
  return rows;
}

async function listSettlementsByDriver(driverUserId, shopId) {
  const conditions = ['cs.driver_user_id = $1'];
  const params = [driverUserId];
  if (shopId) { conditions.push('cs.shop_id = $2'); params.push(shopId); }
  const where = 'WHERE ' + conditions.join(' AND ');
  const { rows } = await db.query(
    `SELECT cs.*, s.name AS shop_name
     FROM cod_settlements cs
     JOIN shops s ON s.id = cs.shop_id
     ${where}
     ORDER BY cs.created_at DESC`,
    params
  );
  return rows;
}

async function getSettlementById(settlementId) {
  const { rows } = await db.query(
    `SELECT cs.*, u.full_name AS driver_name, ru.full_name AS reviewer_name
     FROM cod_settlements cs
     JOIN users u ON u.id = cs.driver_user_id
     LEFT JOIN users ru ON ru.id = cs.reviewed_by
     WHERE cs.id = $1`,
    [settlementId]
  );
  return rows[0] || null;
}

async function getSettlementItems(settlementId) {
  const { rows } = await db.query(
    `SELECT csi.*, cc.collected_amount, cc.collected_at, o.total_amount AS order_total, o.customer_email
     FROM cod_settlement_items csi
     JOIN cod_collections cc ON cc.id = csi.collection_id
     JOIN orders o ON o.id = cc.order_id
     WHERE csi.settlement_id = $1
     ORDER BY cc.collected_at`,
    [settlementId]
  );
  return rows;
}

async function updateSettlementStatus(settlementId, { status, reviewedBy, reviewNotes, bankReference }) {
  const fields = ['updated_at = NOW()'];
  const vals = [settlementId];
  let idx = 2;
  if (status) { fields.push(`status = $${idx++}`); vals.push(status); }
  if (reviewedBy) { fields.push(`reviewed_by = $${idx++}`); vals.push(reviewedBy); }
  if (reviewNotes !== undefined) { fields.push(`review_notes = $${idx++}`); vals.push(reviewNotes); }
  if (bankReference !== undefined) { fields.push(`bank_reference = $${idx++}`); vals.push(bankReference); }
  if (status === 'submitted') { fields.push(`submitted_at = NOW()`); }
  if (status === 'settled') { fields.push(`settled_at = NOW()`); }
  if (status === 'reviewed' || status === 'approved') { fields.push(`reviewed_at = NOW()`); }

  const { rows } = await db.query(
    `UPDATE cod_settlements SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
    vals
  );
  return rows[0] || null;
}

/* ── COD Uncollected / Exception Reports ──────────────────────────── */

async function getUncollectedCodOrders(shopId) {
  // COD orders that are delivered but no collection recorded
  // Includes aging so merchants can act on overdue collections
  const { rows } = await db.query(
    `SELECT o.*,
            dr.id AS delivery_id, dr.status AS delivery_status,
            dr.driver_name, dr.assigned_driver_user_id,
            p.amount AS paid_amount, p.method AS payment_method,
            o.updated_at AS delivered_at,
            EXTRACT(DAY FROM NOW() - o.updated_at)::int AS days_since_delivered
     FROM orders o
     JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
     LEFT JOIN cod_collections cc ON cc.order_id = o.id
     LEFT JOIN (
       SELECT dr.id, dr.order_id, dr.status, dr.assigned_driver_user_id, u.full_name AS driver_name
       FROM delivery_requests dr
       LEFT JOIN users u ON u.id = dr.assigned_driver_user_id
     ) dr ON dr.order_id = o.id
     WHERE o.shop_id = $1
       AND p.method = 'cod'
       AND o.status = 'delivered'
       AND cc.id IS NULL
     ORDER BY o.updated_at ASC`,
    [shopId]
  );
  return rows;
}

async function getCodSummaryByShop(shopId, { fromDate, toDate } = {}) {
  const conditions = ['o.shop_id = $1', `p.method = 'cod'`, `p.status = 'completed'`];
  const params = [shopId];
  let idx = 2;
  if (fromDate) { conditions.push(`o.created_at >= $${idx++}`); params.push(fromDate); }
  if (toDate) { conditions.push(`o.created_at <= $${idx++}`); params.push(toDate); }
  const where = 'WHERE ' + conditions.join(' AND ');

  const { rows } = await db.query(
    `SELECT
       COUNT(DISTINCT o.id)::int AS total_cod_orders,
       COALESCE(SUM(p.amount), 0)::numeric AS total_cod_amount,
       COALESCE(SUM(cc.collected_amount), 0)::numeric AS total_collected,
       COALESCE(SUM(CASE WHEN cc.id IS NOT NULL THEN p.amount ELSE 0 END), 0)::numeric AS expected_collected,
       COUNT(DISTINCT cc.id)::int AS total_collections_recorded
     FROM orders o
     JOIN payments p ON p.order_id = o.id
     LEFT JOIN cod_collections cc ON cc.order_id = o.id
     ${where}`,
    params
  );
  return rows[0];
}

/* ── Driver List for COD ────────────────────────────────────────── */

async function listDriversForCod(shopId) {
  const { rows } = await db.query(
    `SELECT u.id, u.full_name, u.phone, u.email,
            COUNT(cc.id)::int AS total_collections,
            COALESCE(SUM(cc.collected_amount), 0)::numeric AS total_amount_collected,
            COUNT(CASE WHEN cs.status = 'pending' THEN 1 END)::int AS pending_settlements
     FROM users u
     JOIN driver_fleet df ON df.user_id = u.id
     LEFT JOIN cod_collections cc ON cc.driver_user_id = u.id
     LEFT JOIN cod_settlements cs ON cs.driver_user_id = u.id AND cs.status IN ('pending', 'submitted')
     WHERE df.shop_id = $1 OR df.shop_id IS NULL
     GROUP BY u.id, u.full_name, u.phone, u.email
     ORDER BY u.full_name`,
    [shopId]
  );
  return rows;
}

module.exports = {
  // Collections
  recordCodCollection, getCollectionByDeliveryRequest,
  listCollectionsByDriver, listCollectionsByShop, getDriverCodSummary,
  // Settlements
  createCodSettlement, addSettlementItems,
  listSettlementsByShop, listSettlementsByDriver, getSettlementById, getSettlementItems,
  updateSettlementStatus,
  // Reports
  getUncollectedCodOrders, getCodSummaryByShop, listDriversForCod,
};
