const db = require('../db');

async function createPayment(data, client) {
  const q = client || db;
  const res = await q.query(
    `INSERT INTO payments (order_id, shop_id, amount, currency, method, status, gateway_tran_id, gateway_response)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [data.order_id, data.shop_id, data.amount, data.currency || 'BDT', data.method || 'sslcommerz',
     data.status || 'pending', data.gateway_tran_id || null, data.gateway_response ? JSON.stringify(data.gateway_response) : null]
  );
  return res.rows[0];
}

async function findById(paymentId) {
  const res = await db.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
  return res.rows[0] || null;
}

async function findByIdAndShop(paymentId, shopId) {
  if (shopId) {
    const res = await db.query('SELECT * FROM payments WHERE id = $1 AND shop_id = $2', [paymentId, shopId]);
    return res.rows[0] || null;
  }
  const res = await db.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
  return res.rows[0] || null;
}

async function findByTranId(tranId) {
  const res = await db.query('SELECT * FROM payments WHERE gateway_tran_id = $1', [tranId]);
  return res.rows[0] || null;
}

// Idempotency: find existing pending payment for an order to prevent duplicate payments on retry
async function findPendingByOrder(orderId) {
  const res = await db.query(
    `SELECT * FROM payments WHERE order_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
    [orderId]
  );
  return res.rows[0] || null;
}

async function updatePayment(paymentId, patch, client) {
  const q = client || db;
  const allowed = ['status', 'gateway_tran_id', 'gateway_response', 'method'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(k === 'gateway_response' ? JSON.stringify(patch[k]) : patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return findById(paymentId);
  sets.push(`updated_at = now()`);
  params.push(paymentId);
  // Build WHERE clause with optional shop_id scoping
  let where = `id = $${idx}`;
  if (patch._shopId) {
    idx++;
    params.push(patch._shopId);
    where += ` AND shop_id = $${idx}`;
  }
  const res = await q.query(
    `UPDATE payments SET ${sets.join(', ')} WHERE ${where} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function listByShop(shopId, { page = 1, limit = 50, status, search } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (shopId) { conditions.push(`shop_id = $${idx}`); params.push(shopId); idx++; }
  if (status) { conditions.push(`status = $${idx}`); params.push(status); idx++; }
  if (search) { conditions.push(`(gateway_tran_id ILIKE $${idx} OR method ILIKE $${idx} OR order_id::text ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRes = await db.query(`SELECT COUNT(*) FROM payments ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT * FROM payments ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function listByOrder(orderId) {
  const res = await db.query('SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC', [orderId]);
  return res.rows;
}

async function createRefund(data) {
  const res = await db.query(
    `INSERT INTO refunds (payment_id, shop_id, amount, reason, status, gateway_response)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.payment_id, data.shop_id, data.amount, data.reason || null,
     data.status || 'pending', data.gateway_response ? JSON.stringify(data.gateway_response) : null]
  );
  return res.rows[0];
}

async function listRefundsByPayment(paymentId) {
  const res = await db.query('SELECT * FROM refunds WHERE payment_id = $1 ORDER BY created_at DESC', [paymentId]);
  return res.rows;
}

async function deletePayment(paymentId) {
  // Delete associated refunds first, then the payment
  await db.query('DELETE FROM refunds WHERE payment_id = $1', [paymentId]);
  const res = await db.query('DELETE FROM payments WHERE id = $1 RETURNING *', [paymentId]);
  return res.rows[0] || null;
}

module.exports = { createPayment, findById, findByIdAndShop, findByTranId, findPendingByOrder, updatePayment, listByShop, listByOrder, createRefund, listRefundsByPayment, deletePayment };

