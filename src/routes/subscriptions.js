const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const subService = require('../services/subscriptions');
const engine = require('../services/subscription-engine');

const router = express.Router();

// All subscription management routes require auth
router.use(authRequired);

// ── Shop-facing: usage summary (for shop_admin) ─────────
router.get('/my-usage', requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext, asyncHandler(async (req, res) => {
  const usage = await engine.getShopUsageSummary(req.tenantShopId);
  res.json(usage);
}));

router.get('/my-plan', requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext, asyncHandler(async (req, res) => {
  const { subscription, plan } = await engine.resolveShopPlan(req.tenantShopId);
  res.json({ subscription, plan });
}));

// ── Shop-facing: cancel subscription ─────────────────────
router.post('/cancel', requireRoles(['shop_admin']), resolveTenant, requireTenantContext, asyncHandler(async (req, res) => {
  const immediate = req.body.immediate === true;
  const result = await engine.cancelSubscription(req.tenantShopId, immediate, req.auth.sub);
  res.json(result);
}));

// ── Shop-facing: audit log for own shop ──────────────────
router.get('/my-audit-log', requireRoles(['super_admin', 'shop_admin']), resolveTenant, requireTenantContext, asyncHandler(async (req, res) => {
  const result = await subService.getAuditLog({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    shopId: req.tenantShopId,
  });
  res.json(result);
}));

// ── Super-admin only routes below ────────────────────────
router.use(requireRoles(['super_admin']));

// ── Stats / Dashboard ────────────────────────────────────
router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = await subService.getStats();
  res.json(stats);
}));

// ── Plans CRUD ───────────────────────────────────────────
router.get('/plans', asyncHandler(async (req, res) => {
  const includeInactive = req.query.all === 'true';
  const plans = await subService.listPlans(includeInactive);
  res.json(plans);
}));

router.post('/plans', validateBody({
  name: { required: true, type: 'string' },
  slug: { required: true, type: 'string' },
}), asyncHandler(async (req, res) => {
  const plan = await subService.createPlan(req.body);
  res.status(201).json(plan);
}));

router.patch('/plans/:id', validateBody({
  name: { type: 'string' },
  slug: { type: 'string' },
}), asyncHandler(async (req, res) => {
  const plan = await subService.updatePlan(req.params.id, req.body);
  res.json(plan);
}));

router.delete('/plans/:id', asyncHandler(async (req, res) => {
  await subService.deletePlan(req.params.id);
  res.json({ message: 'Plan deleted' });
}));

// ── Shop subscriptions ───────────────────────────────────
router.get('/shops', asyncHandler(async (req, res) => {
  const result = await subService.listShopSubscriptions({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    plan: req.query.plan,
    status: req.query.status,
    search: req.query.search,
  });
  res.json(result);
}));

router.patch('/shops/:shopId', validateBody({
  plan: { required: true, type: 'string' },
}), asyncHandler(async (req, res) => {
  const { plan, billing_cycle } = req.body;
  // Validate plan exists
  const planObj = await engine.getPlanBySlug(plan);
  if (!planObj) return res.status(400).json({ code: 'PLAN_NOT_FOUND', message: `Plan "${plan}" not found` });

  // Activate subscription via engine (handles audit log, old plan cancellation)
  await engine.activateSubscription(req.params.shopId, plan, billing_cycle || 'monthly', req.auth.sub);
  const shop = await subService.updateShopSubscription(req.params.shopId, plan);
  res.json(shop);
}));

// ── Subscription Payments ────────────────────────────────
router.get('/payments', asyncHandler(async (req, res) => {
  const result = await subService.listPayments({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
    shopId: req.query.shop_id,
    search: req.query.search,
  });
  res.json(result);
}));

router.get('/payments/:id', asyncHandler(async (req, res) => {
  const payment = await subService.getPayment(req.params.id);
  res.json(payment);
}));

router.patch('/payments/:id', asyncHandler(async (req, res) => {
  const payment = await subService.updatePayment(req.params.id, req.body);
  res.json(payment);
}));

router.delete('/payments/:id', asyncHandler(async (req, res) => {
  await subService.deletePayment(req.params.id);
  res.json({ message: 'Subscription payment deleted' });
}));

// ── Audit log ────────────────────────────────────────────
router.get('/audit-log', asyncHandler(async (req, res) => {
  const result = await subService.getAuditLog({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    shopId: req.query.shop_id,
  });
  res.json(result);
}));

// ── Shop usage (super admin) ─────────────────────────────
router.get('/shops/:shopId/usage', asyncHandler(async (req, res) => {
  const usage = await engine.getShopUsageSummary(req.params.shopId);
  res.json(usage);
}));

module.exports = router;
