const db = require('../db');

async function findByEmail(email) {
  const res = await db.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  return res.rows[0] || null;
}

async function findById(id) {
  const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function createUser({ email, password_hash, full_name, phone, role, shop_id }) {
  const res = await db.query(
    `INSERT INTO users (email, password_hash, full_name, phone, role, shop_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [email, password_hash, full_name || null, phone || null, role, shop_id || null]
  );
  return res.rows[0];
}

async function listByShop(shopId, { page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;
  const countRes = await db.query('SELECT COUNT(*) FROM users WHERE shop_id = $1', [shopId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const res = await db.query(
    'SELECT * FROM users WHERE shop_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [shopId, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function updateUser(userId, patch) {
  const allowed = ['full_name', 'phone', 'role', 'is_active', 'password_hash'];
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
  if (sets.length === 0) return findById(userId);
  sets.push(`updated_at = now()`);
  params.push(userId);
  const res = await db.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

module.exports = { findByEmail, findById, createUser, listByShop, updateUser };

