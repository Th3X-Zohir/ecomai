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
  const res = await db.query('SELECT * FROM payments WHERE id = $1 AND shop_id = $2', [paymentId, shopId]);
  return res.rows[0] || null;
}

async function findByTranId(tranId) {
  const res = await db.query('SELECT * FROM payments WHERE gateway_tran_id = $1', [tranId]);
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
  const res = await q.query(
    `UPDATE payments SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function listByShop(shopId, { page = 1, limit = 50, status } = {}) {
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (status) { conditions.push(`status = $${idx}`); params.push(status); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
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

module.exports = { createPayment, findById, findByIdAndShop, findByTranId, updatePayment, listByShop, listByOrder, createRefund, listRefundsByPayment };

