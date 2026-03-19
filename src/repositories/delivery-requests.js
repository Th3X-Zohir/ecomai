const db = require('../db');

async function createDeliveryRequest(data) {
  const res = await db.query(
    `INSERT INTO delivery_requests (
      order_id, shop_id, status, assigned_driver_user_id,
      pickup_address, dropoff_address,
      estimated_delivery,
      zone_id, area_code, package_weight, package_contents,
      sla_profile_id, scheduled_date, scheduled_time_slot, customer_notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [
      data.order_id, data.shop_id, data.status || 'pending', data.assigned_driver_user_id || null,
      data.pickup_address ? JSON.stringify(data.pickup_address) : null,
      (data.dropoff_address || data.delivery_address) ? JSON.stringify(data.dropoff_address || data.delivery_address) : null,
      data.estimated_delivery || null,
      data.zone_id || null, data.area_code || null,
      data.package_weight || null, data.package_contents || null,
      data.sla_profile_id || null, data.scheduled_date || null,
      data.scheduled_time_slot || null, data.customer_notes || null,
    ]
  );
  return res.rows[0];
}

async function findById(requestId) {
  const res = await db.query('SELECT * FROM delivery_requests WHERE id = $1', [requestId]);
  return res.rows[0] || null;
}

async function findByIdAndShop(requestId, shopId) {
  if (shopId) {
    const res = await db.query('SELECT * FROM delivery_requests WHERE id = $1 AND shop_id = $2', [requestId, shopId]);
    return res.rows[0] || null;
  }
  const res = await db.query('SELECT * FROM delivery_requests WHERE id = $1', [requestId]);
  return res.rows[0] || null;
}

async function findByOrderAndShop(orderId, shopId) {
  const res = await db.query(
    'SELECT * FROM delivery_requests WHERE order_id = $1 AND shop_id = $2 ORDER BY created_at DESC LIMIT 1',
    [orderId, shopId]
  );
  return res.rows[0] || null;
}

async function updateDeliveryRequest(requestId, shopId, patch) {
  const allowed = [
    'status', 'assigned_driver_user_id', 'pickup_address', 'dropoff_address',
    'notes', 'estimated_delivery', 'location_updates',
    'zone_id', 'area_code', 'package_weight', 'package_contents',
    'sla_profile_id', 'scheduled_date', 'scheduled_time_slot', 'customer_notes',
    'failure_reason', 'failure_code', 'attempt_count',
    'proof_of_delivery', 'delivery_charge', 'packaging_charge',
    'cod_amount', 'collected_at', 'returned_at', 'return_reason',
  ];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(
        ['location_updates', 'pickup_address', 'dropoff_address'].includes(k)
          ? JSON.stringify(patch[k]) : patch[k]
      );
      idx++;
    }
  }
  if (sets.length === 0) return findById(requestId);
  sets.push(`updated_at = now()`);
  params.push(requestId);
  let where = `id = $${idx}`;
  if (shopId) {
    idx++;
    params.push(shopId);
    where += ` AND shop_id = $${idx}`;
  }
  const res = await db.query(
    `UPDATE delivery_requests SET ${sets.join(', ')} WHERE ${where} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function listByShop(shopId, { page = 1, limit = 50, status, search, driverId, fromDate, toDate, scheduledDate } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (shopId) { conditions.push(`dr.shop_id = $${idx}`); params.push(shopId); idx++; }
  if (status) { conditions.push(`dr.status = $${idx}`); params.push(status); idx++; }
  if (search) { conditions.push(`(dr.id::text ILIKE $${idx} OR dr.order_id::text ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  if (driverId) { conditions.push(`dr.assigned_driver_user_id = $${idx}`); params.push(driverId); idx++; }
  if (fromDate) { conditions.push(`dr.created_at >= $${idx}`); params.push(fromDate); idx++; }
  if (toDate) { conditions.push(`dr.created_at <= $${idx}`); params.push(toDate); idx++; }
  if (scheduledDate) { conditions.push(`dr.scheduled_date = $${idx}`); params.push(scheduledDate); idx++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRes = await db.query(`SELECT COUNT(*) FROM delivery_requests dr ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT dr.*, u.full_name AS driver_name
     FROM delivery_requests dr
     LEFT JOIN users u ON u.id = dr.assigned_driver_user_id
     ${where} ORDER BY dr.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
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

async function deleteDeliveryRequest(requestId) {
  const res = await db.query('DELETE FROM delivery_requests WHERE id = $1 RETURNING *', [requestId]);
  return res.rows[0] || null;
}

/**
 * Conditional UPDATE with optimistic locking.
 * Only updates if current status matches expectedStatus.
 * Returns the updated row, or null if no rows matched (concurrent modification).
 */
async function updateDeliveryRequestConditional(requestId, expectedStatus, patch) {
  const allowed = [
    'status', 'assigned_driver_user_id', 'pickup_address', 'dropoff_address',
    'notes', 'estimated_delivery', 'location_updates',
    'zone_id', 'area_code', 'package_weight', 'package_contents',
    'sla_profile_id', 'scheduled_date', 'scheduled_time_slot', 'customer_notes',
    'failure_reason', 'failure_code', 'attempt_count',
    'proof_of_delivery', 'delivery_charge', 'packaging_charge',
    'cod_amount', 'collected_at', 'returned_at', 'return_reason',
  ];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(
        ['location_updates', 'pickup_address', 'dropoff_address'].includes(k)
          ? JSON.stringify(patch[k]) : patch[k]
      );
      idx++;
    }
  }
  if (sets.length === 0) return null;
  sets.push(`updated_at = now()`);
  params.push(requestId, expectedStatus);
  const res = await db.query(
    `UPDATE delivery_requests SET ${sets.join(', ')}
     WHERE id = $${idx} AND status = $${idx + 1}
     RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

module.exports = {
  createDeliveryRequest, findById, findByIdAndShop, findByOrderAndShop,
  updateDeliveryRequest, updateDeliveryRequestConditional, deleteDeliveryRequest,
  listByShop, listByDriver,
};

