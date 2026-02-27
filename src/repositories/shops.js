const db = require('../db');

async function listShops({ page = 1, limit = 50, search, status } = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let idx = 1;
  if (search) {
    conditions.push(`(s.name ILIKE $${idx} OR s.slug ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (status) {
    conditions.push(`s.status = $${idx}`);
    params.push(status);
    idx++;
  }
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRes = await db.query(`SELECT COUNT(*) FROM shops s ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const dataParams = [...params, limit, offset];
  const res = await db.query(
    `SELECT s.*,
       (SELECT count(*) FROM products p WHERE p.shop_id = s.id) AS product_count,
       (SELECT count(*) FROM orders o WHERE o.shop_id = s.id) AS order_count,
       (SELECT count(*) FROM customers c WHERE c.shop_id = s.id) AS customer_count,
       (SELECT count(*) FROM users u WHERE u.shop_id = s.id) AS user_count,
       (SELECT COALESCE(SUM(o2.total_amount), 0) FROM orders o2 WHERE o2.shop_id = s.id AND o2.status NOT IN ('cancelled')) AS total_revenue
     FROM shops s ${where}
     ORDER BY s.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
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

async function deleteShop(shopId) {
  const res = await db.query('DELETE FROM shops WHERE id = $1 RETURNING *', [shopId]);
  return res.rows[0] || null;
}

module.exports = { listShops, findById, findBySlug, createShop, updateShop, deleteShop };

