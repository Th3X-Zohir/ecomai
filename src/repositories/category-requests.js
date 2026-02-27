const db = require('../db');

async function listByShop(shopId, { status, page = 1, limit = 50 } = {}) {
  const conditions = ['cr.shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (status) { conditions.push(`cr.status = $${idx}`); params.push(status); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const countRes = await db.query(`SELECT COUNT(*) FROM category_requests cr ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT cr.*, c.full_name AS customer_name, c.email AS customer_email
     FROM category_requests cr
     LEFT JOIN customers c ON c.id = cr.customer_id
     ${where} ORDER BY cr.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function findById(id, shopId) {
  const res = await db.query('SELECT * FROM category_requests WHERE id = $1 AND shop_id = $2', [id, shopId]);
  return res.rows[0] || null;
}

async function create({ shop_id, customer_id, name, reason }) {
  const res = await db.query(
    `INSERT INTO category_requests (shop_id, customer_id, name, reason) VALUES ($1, $2, $3, $4) RETURNING *`,
    [shop_id, customer_id || null, name, reason || null]
  );
  return res.rows[0];
}

async function updateStatus(id, shopId, { status, admin_notes }) {
  const res = await db.query(
    `UPDATE category_requests SET status = $1, admin_notes = $2, updated_at = now()
     WHERE id = $3 AND shop_id = $4 RETURNING *`,
    [status, admin_notes || null, id, shopId]
  );
  return res.rows[0] || null;
}

async function countPending(shopId) {
  const res = await db.query(
    `SELECT COUNT(*) FROM category_requests WHERE shop_id = $1 AND status = 'pending'`,
    [shopId]
  );
  return parseInt(res.rows[0].count, 10);
}

module.exports = { listByShop, findById, create, updateStatus, countPending };
