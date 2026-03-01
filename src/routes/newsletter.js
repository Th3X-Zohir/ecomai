const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const db = require('../db');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin']), resolveTenant, requireTenantContext);

// List newsletter subscribers
router.get('/', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const status = req.query.status; // 'active', 'unsubscribed', or undefined (all)

  const conditions = ['shop_id = $1'];
  const params = [req.tenantShopId];
  let idx = 2;

  if (status === 'active' || status === 'unsubscribed') {
    conditions.push(`status = $${idx}`);
    params.push(status);
    idx++;
  }

  const where = conditions.join(' AND ');

  const countRes = await db.query(`SELECT COUNT(*) FROM newsletter_subscribers WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await db.query(`
    SELECT id, email, status, created_at
    FROM newsletter_subscribers WHERE ${where}
    ORDER BY created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `, [...params, limit, offset]);

  res.json({ items: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
}));

// Export all active subscribers (returns full list for CSV download)
router.get('/export', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT email, created_at FROM newsletter_subscribers WHERE shop_id = $1 AND status = 'active' ORDER BY created_at DESC`,
    [req.tenantShopId]
  );
  // Return as CSV
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=newsletter-subscribers.csv');
  let csv = 'email,subscribed_at\n';
  for (const row of rows) {
    csv += `${row.email},${row.created_at}\n`;
  }
  res.send(csv);
}));

// Newsletter stats
router.get('/stats', asyncHandler(async (req, res) => {
  const { rows: [stats] } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE status = 'unsubscribed')::int AS unsubscribed,
      COUNT(*)::int AS total
    FROM newsletter_subscribers WHERE shop_id = $1
  `, [req.tenantShopId]);
  res.json(stats || { active: 0, unsubscribed: 0, total: 0 });
}));

// Unsubscribe a subscriber (admin action)
router.patch('/:subscriberId/unsubscribe', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `UPDATE newsletter_subscribers SET status = 'unsubscribed' WHERE id = $1 AND shop_id = $2 RETURNING id`,
    [req.params.subscriberId, req.tenantShopId]
  );
  if (!rows.length) return res.status(404).json({ code: 'NOT_FOUND', message: 'Subscriber not found' });
  res.json({ message: 'Subscriber unsubscribed' });
}));

// Delete a subscriber
router.delete('/:subscriberId', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `DELETE FROM newsletter_subscribers WHERE id = $1 AND shop_id = $2 RETURNING id`,
    [req.params.subscriberId, req.tenantShopId]
  );
  if (!rows.length) return res.status(404).json({ code: 'NOT_FOUND', message: 'Subscriber not found' });
  res.json({ message: 'Subscriber deleted' });
}));

module.exports = router;
