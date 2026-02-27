const db = require('../db');

async function listShops({ page = 1, limit = 50, search } = {}) {
  const offset = (page - 1) * limit;
  let where = '';
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE name ILIKE $1 OR slug ILIKE $1`;
  }
  const countRes = await db.query(`SELECT COUNT(*) FROM shops ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const dataParams = [...params, limit, offset];
  const res = await db.query(
    `SELECT * FROM shops ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    dataParams
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function findById(shopId) {
  const res = await db.query('SELECT * FROM shops WHERE id = $1', [shopId]);
  return res.rows[0] || null;
}

async function findBySlug(slug) {
  const res = await db.query('SELECT * FROM shops WHERE slug = $1', [slug]);
  return res.rows[0] || null;
}

async function createShop({ name, slug, status, industry, subscription_plan, owner_user_id, sslcommerz_store_id, sslcommerz_store_pass }) {
  const res = await db.query(
    `INSERT INTO shops (name, slug, status, industry, subscription_plan, owner_user_id, sslcommerz_store_id, sslcommerz_store_pass)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [name, slug, status || 'active', industry || null, subscription_plan || 'free', owner_user_id || null, sslcommerz_store_id || null, sslcommerz_store_pass || null]
  );
  return res.rows[0];
}

async function updateShop(shopId, patch) {
  const allowed = ['name', 'slug', 'status', 'industry', 'subscription_plan', 'logo_url', 'sslcommerz_store_id', 'sslcommerz_store_pass', 'owner_user_id'];
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
  if (sets.length === 0) return findById(shopId);
  sets.push(`updated_at = now()`);
  params.push(shopId);
  const res = await db.query(
    `UPDATE shops SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

module.exports = { listShops, findById, findBySlug, createShop, updateShop };

