/**
 * Notifications Repository — in-app notification data access.
 */
const db = require('../db');

async function createNotification({ shopId, userId = null, type, title, body, data = {}, deliveryMethod = 'in_app' }) {
  const { rows } = await db.query(
    `INSERT INTO notifications (shop_id, user_id, type, title, body, data, delivery_method)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [shopId, userId, type, title, body, JSON.stringify(data), deliveryMethod]
  );
  return rows[0];
}

async function getPreferences(shopId, userId = null) {
  const { rows } = await db.query(
    `SELECT * FROM notification_preferences
     WHERE shop_id = $1 AND (user_id = $2 OR user_id IS NULL)
     ORDER BY user_id DESC NULLS LAST
     LIMIT 1`,
    [shopId, userId]
  );
  return rows[0] || null;
}

async function upsertPreferences(shopId, userId, patch) {
  const cols = [];
  const vals = [];
  let idx = 1;
  for (const [k, v] of Object.entries(patch)) {
    cols.push(k);
    vals.push(v);
  }
  cols.push('updated_at');
  vals.push('now()');
  const { rows } = await db.query(
    `INSERT INTO notification_preferences (shop_id, user_id, ${cols.join(', ')})
     VALUES ($${idx}, $${idx + 1}, ${vals.map((_, i) => `$${idx + 2 + i}`).join(', ')})
     ON CONFLICT (shop_id, user_id) DO UPDATE SET ${cols.map((c, i) => `${c} = $${idx + 2 + i}`).join(', ')}, updated_at = now()
     RETURNING *`,
    [shopId, userId, ...vals]
  );
  return rows[0];
}

async function listNotifications(shopId, { page = 1, limit = 30, isRead, userId = null } = {}) {
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (isRead !== undefined) { conditions.push(`is_read = $${idx}`); params.push(isRead); idx++; }
  if (userId) { conditions.push(`(user_id = $${idx} OR user_id IS NULL)`); params.push(userId); idx++; }

  const countRes = await db.query(
    `SELECT COUNT(*) FROM notifications WHERE ${conditions.join(' AND ')}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT * FROM notifications
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function markAsRead(notificationId, shopId) {
  const { rows } = await db.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND shop_id = $2 RETURNING *`,
    [notificationId, shopId]
  );
  return rows[0] || null;
}

async function markAllAsRead(shopId, userId = null) {
  const condition = userId ? 'shop_id = $1 AND (user_id = $2 OR user_id IS NULL)' : 'shop_id = $1';
  const params = userId ? [shopId, userId] : [shopId];
  await db.query(
    `UPDATE notifications SET is_read = true WHERE ${condition} AND is_read = false`,
    params
  );
}

async function getUnreadCount(shopId, userId = null) {
  const condition = userId ? 'shop_id = $1 AND (user_id = $2 OR user_id IS NULL)' : 'shop_id = $1';
  const params = userId ? [shopId, userId] : [shopId];
  const { rows } = await db.query(
    `SELECT COUNT(*) FROM notifications WHERE ${condition} AND is_read = false`,
    params
  );
  return parseInt(rows[0].count, 10);
}

async function deleteOldNotifications(olderThanDays = 30) {
  const { rowCount } = await db.query(
    `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '${parseInt(olderThanDays)} days' AND is_read = true`
  );
  return rowCount;
}

module.exports = {
  createNotification,
  getPreferences, upsertPreferences,
  listNotifications, markAsRead, markAllAsRead, getUnreadCount, deleteOldNotifications,
};
