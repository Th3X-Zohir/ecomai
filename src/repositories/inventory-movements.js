const db = require('../db');

async function createMovement(data, client) {
  const q = client || db;
  const res = await q.query(
    `INSERT INTO inventory_movements (shop_id, variant_id, product_id, type, quantity, reason, reference_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.shop_id, data.variant_id || null, data.product_id || null,
     data.type, data.quantity, data.reason || null, data.reference_id || null]
  );
  return res.rows[0];
}

async function findById(movementId) {
  const res = await db.query('SELECT * FROM inventory_movements WHERE id = $1', [movementId]);
  return res.rows[0] || null;
}

async function listByShop(shopId, { page = 1, limit = 50, type } = {}) {
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (type) { conditions.push(`type = $${idx}`); params.push(type); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const countRes = await db.query(`SELECT COUNT(*) FROM inventory_movements ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT * FROM inventory_movements ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function listByVariant(variantId, { page = 1, limit = 50 } = {}) {
  const countRes = await db.query('SELECT COUNT(*) FROM inventory_movements WHERE variant_id = $1', [variantId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    'SELECT * FROM inventory_movements WHERE variant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [variantId, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function listByProduct(productId, { page = 1, limit = 50 } = {}) {
  const countRes = await db.query('SELECT COUNT(*) FROM inventory_movements WHERE product_id = $1', [productId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    'SELECT * FROM inventory_movements WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [productId, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = { createMovement, findById, listByShop, listByVariant, listByProduct };

