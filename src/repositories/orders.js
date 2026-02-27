const db = require('../db');

async function createOrder(data, client) {
  const q = client || db;
  const res = await q.query(
    `INSERT INTO orders (shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [
      data.shop_id, data.customer_id || null, data.customer_email,
      data.status || 'pending', data.payment_status || 'unpaid',
      data.subtotal, data.tax_amount || 0, data.shipping_amount || 0,
      data.discount_amount || 0, data.total_amount,
      data.shipping_address ? JSON.stringify(data.shipping_address) : null,
      data.notes || null,
    ]
  );
  return res.rows[0];
}

async function addOrderItems(items, client) {
  const q = client || db;
  const rows = [];
  for (const it of items) {
    const res = await q.query(
      `INSERT INTO order_items (shop_id, order_id, product_id, variant_id, item_name, quantity, unit_price, line_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [it.shop_id, it.order_id, it.product_id, it.variant_id || null, it.item_name, it.quantity, it.unit_price, it.line_total]
    );
    rows.push(res.rows[0]);
  }
  return rows;
}

async function listByShop(shopId, { page = 1, limit = 50, status, search } = {}) {
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (status) { conditions.push(`status = $${idx}`); params.push(status); idx++; }
  if (search) { conditions.push(`(customer_email ILIKE $${idx} OR id::text ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const countRes = await db.query(`SELECT COUNT(*) FROM orders ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function findByIdAndShop(id, shopId) {
  const res = await db.query('SELECT * FROM orders WHERE id = $1 AND shop_id = $2', [id, shopId]);
  return res.rows[0] || null;
}

async function listItemsByOrder(orderId) {
  const res = await db.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [orderId]);
  return res.rows;
}

async function updateOrder(orderId, shopId, patch, client) {
  const q = client || db;
  const allowed = ['status', 'payment_status', 'shipping_address', 'notes', 'total_amount', 'tax_amount', 'discount_amount'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(k === 'shipping_address' ? JSON.stringify(patch[k]) : patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return findByIdAndShop(orderId, shopId);
  sets.push(`updated_at = now()`);
  params.push(orderId, shopId);
  const res = await q.query(
    `UPDATE orders SET ${sets.join(', ')} WHERE id = $${idx} AND shop_id = $${idx + 1} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function findById(orderId) {
  const res = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  return res.rows[0] || null;
}

async function listByCustomer(customerId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const countRes = await db.query('SELECT COUNT(*) FROM orders WHERE customer_id = $1', [customerId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const res = await db.query(
    'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [customerId, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function countByShop(shopId) {
  const res = await db.query('SELECT COUNT(*) FROM orders WHERE shop_id = $1', [shopId]);
  return parseInt(res.rows[0].count, 10);
}

module.exports = {
  createOrder, addOrderItems, listByShop, findByIdAndShop,
  listItemsByOrder, updateOrder, findById, listByCustomer, countByShop,
};

