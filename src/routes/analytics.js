const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const analyticsService = require('../services/analytics');

const router = express.Router();

// All routes require authentication and tenant context
router.use(authRequired, resolveTenant, requireTenantContext);

// ── GET /v1/analytics/benchmark ─────────────────────────────
// Full benchmark report: KPIs + peer comparison + percentile ranks + insights
router.get('/benchmark', asyncHandler(async (req, res) => {
  const benchmark = await analyticsService.getShopBenchmark(req.tenantShopId);
  res.json(benchmark);
}));

// ── GET /v1/analytics/customers ─────────────────────────────
// Customer analytics: segments, top LTV customers, at-risk customers
router.get('/customers', asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getCustomerAnalytics(req.tenantShopId);
  res.json(analytics);
}));

// ── GET /v1/analytics/trend ─────────────────────────────────
// Metrics trend for charts (weekly snapshots)
router.get('/trend', asyncHandler(async (req, res) => {
  const weeks = Math.min(Math.max(Number(req.query.weeks) || 8, 2), 24);
  const trend = await analyticsService.getMetricsTrend(req.tenantShopId, weeks);
  res.json({ trend });
}));

// ── Super admin: run weekly snapshot job ───────────────────
router.post('/snapshots/compute',
  authRequired,
  requireRoles(['super_admin']),
  asyncHandler(async (req, res) => {
    const result = await analyticsService.computeAllWeeklySnapshots();
    res.json({ message: 'Snapshot job complete', ...result });
  })
);

// ── Super admin: compute co-occurrence ─────────────────────
router.post('/cooccurrence/compute',
  authRequired,
  requireRoles(['super_admin']),
  asyncHandler(async (req, res) => {
    const upsellService = require('../services/upsell');
    await upsellService.computeCooccurrence();
    res.json({ message: 'Co-occurrence computation complete' });
  })
);

module.exports = router;
