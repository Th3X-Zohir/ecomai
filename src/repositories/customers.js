const db = require('../db');

async function findByEmail(shopId, email) {
  const res = await db.query(
    'SELECT * FROM customers WHERE shop_id = $1 AND LOWER(email) = LOWER($2)',
    [shopId, email]
  );
  return res.rows[0] || null;
}

async function findById(customerId) {
  const res = await db.query('SELECT * FROM customers WHERE id = $1', [customerId]);
  return res.rows[0] || null;
}

async function findByIdAndShop(customerId, shopId) {
  const res = await db.query('SELECT * FROM customers WHERE id = $1 AND shop_id = $2', [customerId, shopId]);
  return res.rows[0] || null;
}

async function createCustomer({ shop_id, email, password_hash, full_name, phone, is_registered }) {
  const res = await db.query(
    `INSERT INTO customers (shop_id, email, password_hash, full_name, phone, is_registered)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [shop_id, email, password_hash || null, full_name || null, phone || null, is_registered || false]
  );
  return res.rows[0];
}

async function updateCustomer(customerId, patch) {
  const allowed = ['full_name', 'phone', 'password_hash', 'is_registered', 'addresses'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(k === 'addresses' ? JSON.stringify(patch[k]) : patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return findById(customerId);
  sets.push(`updated_at = now()`);
  params.push(customerId);
  const res = await db.query(
    `UPDATE customers SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function listByShop(shopId, { page = 1, limit = 50, search } = {}) {
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (search) { conditions.push(`(email ILIKE $${idx} OR full_name ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const countRes = await db.query(`SELECT COUNT(*) FROM customers ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT * FROM customers ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function countByShop(shopId) {
  const res = await db.query('SELECT COUNT(*) FROM customers WHERE shop_id = $1', [shopId]);
  return parseInt(res.rows[0].count, 10);
}

module.exports = { findByEmail, findById, findByIdAndShop, createCustomer, updateCustomer, listByShop, countByShop };

