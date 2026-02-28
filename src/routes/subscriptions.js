const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const subService = require('../services/subscriptions');

const router = express.Router();

// All subscription management routes are super_admin only
router.use(authRequired, requireRoles(['super_admin']));

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

router.patch('/plans/:id', asyncHandler(async (req, res) => {
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
  const shop = await subService.updateShopSubscription(req.params.shopId, req.body.plan);
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

module.exports = router;
