const db = require('../db');

async function listByProduct(shopId, productId) {
  const res = await db.query(
    'SELECT * FROM product_variants WHERE shop_id = $1 AND product_id = $2 ORDER BY created_at',
    [shopId, productId]
  );
  return res.rows;
}

async function findByIdAndShop(variantId, shopId) {
  const res = await db.query(
    'SELECT * FROM product_variants WHERE id = $1 AND shop_id = $2',
    [variantId, shopId]
  );
  return res.rows[0] || null;
}

async function findBySkuAndShop(sku, shopId) {
  const res = await db.query(
    'SELECT * FROM product_variants WHERE sku = $1 AND shop_id = $2',
    [sku, shopId]
  );
  return res.rows[0] || null;
}

async function createVariant({ shop_id, product_id, sku, title, attributes, price, inventory_qty }) {
  const res = await db.query(
    `INSERT INTO product_variants (shop_id, product_id, sku, title, attributes, price, inventory_qty)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [shop_id, product_id, sku || null, title, JSON.stringify(attributes || {}), Number(price), inventory_qty || 0]
  );
  return res.rows[0];
}

async function updateVariant(variantId, shopId, patch) {
  const allowed = ['sku', 'title', 'attributes', 'price', 'inventory_qty'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(k === 'attributes' ? JSON.stringify(patch[k]) : patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return findByIdAndShop(variantId, shopId);
  sets.push(`updated_at = now()`);
  params.push(variantId, shopId);
  const res = await db.query(
    `UPDATE product_variants SET ${sets.join(', ')} WHERE id = $${idx} AND shop_id = $${idx + 1} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function deleteVariant(variantId, shopId) {
  const res = await db.query(
    'DELETE FROM product_variants WHERE id = $1 AND shop_id = $2 RETURNING id',
    [variantId, shopId]
  );
  return res.rowCount > 0;
}

async function decrementInventory(variantId, qty, client) {
  const q = client || db;
  const res = await q.query(
    `UPDATE product_variants SET inventory_qty = inventory_qty - $1, updated_at = now()
     WHERE id = $2 AND inventory_qty >= $1 RETURNING *`,
    [qty, variantId]
  );
  return res.rows[0] || null;
}

async function incrementInventory(variantId, qty, client) {
  const q = client || db;
  const res = await q.query(
    `UPDATE product_variants SET inventory_qty = inventory_qty + $1, updated_at = now()
     WHERE id = $2 RETURNING *`,
    [qty, variantId]
  );
  return res.rows[0] || null;
}

module.exports = {
  listByProduct,
  findByIdAndShop,
  findBySkuAndShop,
  createVariant,
  updateVariant,
  deleteVariant,
  decrementInventory,
  incrementInventory,
};

