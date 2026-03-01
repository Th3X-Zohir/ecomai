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
  if (shopId) {
    const res = await db.query('SELECT * FROM customers WHERE id = $1 AND shop_id = $2 AND deleted_at IS NULL', [customerId, shopId]);
    return res.rows[0] || null;
  }
  const res = await db.query('SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL', [customerId]);
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

async function updateCustomer(customerId, shopId, patch) {
  const allowed = ['full_name', 'phone', 'password_hash', 'is_registered', 'addresses', 'email'];
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
  let where = `id = $${idx}`;
  if (shopId) {
    idx++;
    params.push(shopId);
    where += ` AND shop_id = $${idx}`;
  }
  const res = await db.query(
    `UPDATE customers SET ${sets.join(', ')} WHERE ${where} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function listByShop(shopId, { page = 1, limit = 50, search } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  conditions.push(`deleted_at IS NULL`);
  if (shopId) { conditions.push(`shop_id = $${idx}`); params.push(shopId); idx++; }
  if (search) { conditions.push(`(email ILIKE $${idx} OR full_name ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
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
  const q = shopId ? 'SELECT COUNT(*) FROM customers WHERE shop_id = $1 AND deleted_at IS NULL' : 'SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL';
  const res = await db.query(q, shopId ? [shopId] : []);
  return parseInt(res.rows[0].count, 10);
}

async function deleteCustomer(customerId, shopId) {
  if (shopId) {
    await db.query('UPDATE customers SET deleted_at = NOW() WHERE id = $1 AND shop_id = $2 AND deleted_at IS NULL', [customerId, shopId]);
  } else {
    await db.query('UPDATE customers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [customerId]);
  }
}

module.exports = { findByEmail, findById, findByIdAndShop, createCustomer, updateCustomer, deleteCustomer, listByShop, countByShop };

