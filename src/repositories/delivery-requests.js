const db = require('../db');

async function createDeliveryRequest(data) {
  const res = await db.query(
    `INSERT INTO delivery_requests (order_id, shop_id, status, assigned_driver_user_id, pickup_address, dropoff_address, estimated_delivery)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.order_id, data.shop_id, data.status || 'pending', data.assigned_driver_user_id || null,
     data.pickup_address ? JSON.stringify(data.pickup_address) : null,
     data.delivery_address ? JSON.stringify(data.delivery_address) : null,
     data.estimated_delivery || null]
  );
  return res.rows[0];
}

async function findById(requestId) {
  const res = await db.query('SELECT * FROM delivery_requests WHERE id = $1', [requestId]);
  return res.rows[0] || null;
}

async function findByIdAndShop(requestId, shopId) {
  const res = await db.query('SELECT * FROM delivery_requests WHERE id = $1 AND shop_id = $2', [requestId, shopId]);
  return res.rows[0] || null;
}

async function findByOrderAndShop(orderId, shopId) {
  const res = await db.query(
    'SELECT * FROM delivery_requests WHERE order_id = $1 AND shop_id = $2 ORDER BY created_at DESC LIMIT 1',
    [orderId, shopId]
  );
  return res.rows[0] || null;
}

async function updateDeliveryRequest(requestId, patch) {
  const allowed = ['status', 'assigned_driver_user_id', 'pickup_address', 'dropoff_address', 'notes', 'estimated_delivery', 'location_updates'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(k === 'location_updates' ? JSON.stringify(patch[k]) : patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return findById(requestId);
  sets.push(`updated_at = now()`);
  params.push(requestId);
  const res = await db.query(
    `UPDATE delivery_requests SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function listByShop(shopId, { page = 1, limit = 50, status } = {}) {
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (status) { conditions.push(`status = $${idx}`); params.push(status); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const countRes = await db.query(`SELECT COUNT(*) FROM delivery_requests ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT * FROM delivery_requests ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function listByDriver(driverUserId, { page = 1, limit = 50, status } = {}) {
  const conditions = ['assigned_driver_user_id = $1'];
  const params = [driverUserId];
  let idx = 2;
  if (status) { conditions.push(`status = $${idx}`); params.push(status); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const countRes = await db.query(`SELECT COUNT(*) FROM delivery_requests ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT * FROM delivery_requests ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = { createDeliveryRequest, findById, findByIdAndShop, findByOrderAndShop, updateDeliveryRequest, listByShop, listByDriver };

