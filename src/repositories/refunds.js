/**
 * Refunds Repository — refund request data access.
 */
const db = require('../db');

async function createRefundRequest({ shopId, orderId, paymentId, customerId, requestedBy, reason, refundAmount, currency = 'BDT' }) {
  const { rows } = await db.query(
    `INSERT INTO refund_requests
       (shop_id, order_id, payment_id, customer_id, requested_by, reason, refund_amount, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [shopId, orderId, paymentId, customerId, requestedBy, reason, refundAmount, currency]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT rr.*, o.total_amount AS order_total, o.status AS order_status,
            p.method AS payment_method, p.gateway_tran_id
     FROM refund_requests rr
     JOIN orders o ON o.id = rr.order_id
     LEFT JOIN payments p ON p.id = rr.payment_id
     WHERE rr.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByIdAndShop(id, shopId) {
  const { rows } = await db.query(
    `SELECT rr.*, o.total_amount AS order_total, o.status AS order_status,
            p.method AS payment_method, p.gateway_tran_id
     FROM refund_requests rr
     JOIN orders o ON o.id = rr.order_id
     LEFT JOIN payments p ON p.id = rr.payment_id
     WHERE rr.id = $1 AND rr.shop_id = $2`,
    [id, shopId]
  );
  return rows[0] || null;
}

async function listByShop(shopId, { page = 1, limit = 50, status } = {}) {
  const conditions = ['rr.shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (status) { conditions.push(`rr.status = $${idx}`); params.push(status); idx++; }

  const countRes = await db.query(
    `SELECT COUNT(*) FROM refund_requests rr WHERE ${conditions.join(' AND ')}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT rr.*, o.total_amount AS order_total,
            c.email AS customer_email, c.full_name AS customer_name
     FROM refund_requests rr
     JOIN orders o ON o.id = rr.order_id
     LEFT JOIN customers c ON c.id = rr.customer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY rr.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function listByCustomer(customerId) {
  const { rows } = await db.query(
    `SELECT rr.*, o.total_amount AS order_total
     FROM refund_requests rr
     JOIN orders o ON o.id = rr.order_id
     WHERE rr.customer_id = $1
     ORDER BY rr.created_at DESC`,
    [customerId]
  );
  return rows;
}

async function updateStatus(id, patch) {
  const allowed = ['status', 'admin_notes', 'approved_by', 'approved_at',
    'rejected_by', 'rejected_at', 'rejection_reason',
    'processed_at', 'completed_at', 'gateway_refund_id'];
  const sets = [];
  const params = [id];
  let idx = 2;
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      sets.push(`${k} = $${idx}`);
      params.push(patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return findById(id);
  sets.push('updated_at = now()');
  const { rows } = await db.query(
    `UPDATE refund_requests SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return rows[0] || null;
}

async function getShopRefundStats(shopId) {
  const { rows } = await db.query(
    `SELECT
       COUNT(*)::int AS total_requests,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
       COALESCE(SUM(refund_amount) FILTER (WHERE status IN ('completed', 'processing')), 0)::numeric AS total_refunded
     FROM refund_requests WHERE shop_id = $1`,
    [shopId]
  );
  return rows[0];
}

module.exports = {
  createRefundRequest,
  findById, findByIdAndShop,
  listByShop, listByCustomer,
  updateStatus,
  getShopRefundStats,
};
