const db = require('../db');

async function listByShop(shopId, { status, parentId, search } = {}) {
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (status) { conditions.push(`status = $${idx}`); params.push(status); idx++; }
  if (parentId === null) { conditions.push('parent_id IS NULL'); }
  else if (parentId) { conditions.push(`parent_id = $${idx}`); params.push(parentId); idx++; }
  if (search) { conditions.push(`name ILIKE $${idx}`); params.push(`%${search}%`); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const res = await db.query(`SELECT * FROM categories ${where} ORDER BY sort_order ASC, name ASC`, params);
  return res.rows;
}

async function findById(id, shopId) {
  const res = await db.query('SELECT * FROM categories WHERE id = $1 AND shop_id = $2', [id, shopId]);
  return res.rows[0] || null;
}

async function findBySlug(slug, shopId) {
  const res = await db.query('SELECT * FROM categories WHERE slug = $1 AND shop_id = $2', [slug, shopId]);
  return res.rows[0] || null;
}

async function create({ shop_id, name, slug, description, image_url, parent_id, sort_order, status }) {
  const res = await db.query(
    `INSERT INTO categories (shop_id, name, slug, description, image_url, parent_id, sort_order, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [shop_id, name, slug, description || null, image_url || null, parent_id || null, sort_order || 0, status || 'active']
  );
  return res.rows[0];
}

async function update(id, shopId, patch) {
  const allowed = ['name', 'slug', 'description', 'image_url', 'parent_id', 'sort_order', 'status'];
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
  if (sets.length === 0) return findById(id, shopId);
  sets.push(`updated_at = now()`);
  params.push(id, shopId);
  const res = await db.query(
    `UPDATE categories SET ${sets.join(', ')} WHERE id = $${idx} AND shop_id = $${idx + 1} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function remove(id, shopId) {
  const res = await db.query('DELETE FROM categories WHERE id = $1 AND shop_id = $2 RETURNING id', [id, shopId]);
  return res.rowCount > 0;
}

async function countByShop(shopId) {
  const res = await db.query('SELECT COUNT(*) FROM categories WHERE shop_id = $1', [shopId]);
  return parseInt(res.rows[0].count, 10);
}

async function getProductCounts(shopId) {
  const res = await db.query(
    `SELECT c.id, c.name, c.slug, COUNT(p.id)::int AS product_count
     FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.shop_id = c.shop_id
     WHERE c.shop_id = $1 AND c.status = 'active'
     GROUP BY c.id ORDER BY c.sort_order ASC, c.name ASC`,
    [shopId]
  );
  return res.rows;
}

module.exports = { listByShop, findById, findBySlug, create, update, remove, countByShop, getProductCounts };
