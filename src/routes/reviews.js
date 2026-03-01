const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const db = require('../db');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin']), resolveTenant, requireTenantContext);

// ── Product Reviews ─────────────────────────────────────────

// List all reviews for the shop (admin can see unapproved too)
router.get('/', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 25;
  const offset = (page - 1) * limit;
  const status = req.query.status; // 'approved', 'pending', or undefined (all)

  const conditions = ['r.shop_id = $1'];
  const params = [req.tenantShopId];
  let idx = 2;

  if (status === 'approved') { conditions.push('r.is_approved = true'); }
  if (status === 'pending') { conditions.push('r.is_approved = false'); }

  const where = conditions.join(' AND ');

  const countRes = await db.query(`SELECT COUNT(*) FROM product_reviews r WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await db.query(`
    SELECT r.id, r.product_id, r.customer_id, r.customer_name, r.rating,
           r.title, r.body, r.is_approved, r.created_at,
           p.name AS product_name, p.slug AS product_slug
    FROM product_reviews r
    LEFT JOIN products p ON p.id = r.product_id
    WHERE ${where}
    ORDER BY r.created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `, [...params, limit, offset]);

  res.json({ items: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
}));

// Approve a review
router.patch('/:reviewId/approve', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `UPDATE product_reviews SET is_approved = true WHERE id = $1 AND shop_id = $2 RETURNING id`,
    [req.params.reviewId, req.tenantShopId]
  );
  if (!rows.length) return res.status(404).json({ code: 'NOT_FOUND', message: 'Review not found' });
  res.json({ message: 'Review approved' });
}));

// Reject (unapprove) a review
router.patch('/:reviewId/reject', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `UPDATE product_reviews SET is_approved = false WHERE id = $1 AND shop_id = $2 RETURNING id`,
    [req.params.reviewId, req.tenantShopId]
  );
  if (!rows.length) return res.status(404).json({ code: 'NOT_FOUND', message: 'Review not found' });
  res.json({ message: 'Review rejected' });
}));

// Delete a review
router.delete('/:reviewId', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `DELETE FROM product_reviews WHERE id = $1 AND shop_id = $2 RETURNING id`,
    [req.params.reviewId, req.tenantShopId]
  );
  if (!rows.length) return res.status(404).json({ code: 'NOT_FOUND', message: 'Review not found' });
  res.json({ message: 'Review deleted' });
}));

// Review stats for the shop
router.get('/stats', asyncHandler(async (req, res) => {
  const { rows: [stats] } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE is_approved = false)::int AS pending,
      COUNT(*) FILTER (WHERE is_approved = true)::int AS approved,
      COUNT(*)::int AS total,
      ROUND(AVG(rating), 1)::float AS avg_rating
    FROM product_reviews WHERE shop_id = $1
  `, [req.tenantShopId]);
  res.json(stats || { pending: 0, approved: 0, total: 0, avg_rating: 0 });
}));

module.exports = router;
