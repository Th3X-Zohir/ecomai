const db = require('../db');

async function listByShop(shopId, { page = 1, limit = 50, search, category, category_id, status } = {}) {
  const conditions = ['p.shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (search) { conditions.push(`(p.name ILIKE $${idx} OR p.slug ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  if (category) { conditions.push(`p.category = $${idx}`); params.push(category); idx++; }
  if (category_id) { conditions.push(`p.category_id = $${idx}`); params.push(category_id); idx++; }
  if (status) { conditions.push(`p.status = $${idx}`); params.push(status); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const countRes = await db.query(`SELECT COUNT(*) FROM products p ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     ${where} ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function findByIdAndShop(id, shopId) {
  const res = await db.query('SELECT * FROM products WHERE id = $1 AND shop_id = $2', [id, shopId]);
  return res.rows[0] || null;
}

async function findBySlugAndShop(slug, shopId) {
  const res = await db.query('SELECT * FROM products WHERE slug = $1 AND shop_id = $2', [slug, shopId]);
  return res.rows[0] || null;
}

async function createProduct({ shop_id, name, slug, base_price, description, category, category_id, status, image_url, stock_quantity }) {
  const res = await db.query(
    `INSERT INTO products (shop_id, name, slug, base_price, description, category, category_id, status, image_url, stock_quantity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [shop_id, name, slug, Number(base_price), description || null, category || null, category_id || null, status || 'draft', image_url || null, stock_quantity || 0]
  );
  return res.rows[0];
}

async function updateProduct(productId, shopId, patch) {
  const allowed = ['name', 'slug', 'base_price', 'description', 'category', 'category_id', 'status', 'image_url', 'stock_quantity'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(k === 'base_price' ? Number(patch[k]) : patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return findByIdAndShop(productId, shopId);
  sets.push(`updated_at = now()`);
  params.push(productId, shopId);
  const res = await db.query(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $${idx} AND shop_id = $${idx + 1} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function deleteProduct(productId, shopId) {
  const res = await db.query('DELETE FROM products WHERE id = $1 AND shop_id = $2 RETURNING id', [productId, shopId]);
  return res.rowCount > 0;
}

async function countByShop(shopId) {
  const res = await db.query('SELECT COUNT(*) FROM products WHERE shop_id = $1', [shopId]);
  return parseInt(res.rows[0].count, 10);
}

module.exports = { listByShop, findByIdAndShop, findBySlugAndShop, createProduct, updateProduct, deleteProduct, countByShop };

