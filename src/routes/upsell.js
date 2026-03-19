const express = require('express');
const { authRequired, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const upsellService = require('../services/upsell');

const router = express.Router();
router.use(authRequired, resolveTenant, requireTenantContext);

// ── Shop rules ──────────────────────────────────────────────

// GET /v1/upsell/rules
router.get('/rules', asyncHandler(async (req, res) => {
  const isActive = req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined;
  const result = await upsellService.listRules(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    isActive,
  });
  res.json(result);
}));

// POST /v1/upsell/rules
router.post('/rules', validateBody({
  trigger_product_id: { type: 'string' },
  trigger_type: { type: 'string', oneOf: ['bought', 'viewed', 'cart_abandoned'] },
  upsell_product_id: { type: 'string' },
  upsell_type: { type: 'string', oneOf: ['product', 'category', 'bundle'] },
  discount_type: { type: 'string', oneOf: ['percentage', 'fixed', 'none'] },
  discount_value: { type: 'number' },
  display_text: { type: 'string' },
  priority: { type: 'number' },
}), asyncHandler(async (req, res) => {
  const rule = await upsellService.createRule({
    shopId: req.tenantShopId,
    ...req.body,
  });
  res.status(201).json(rule);
}));

// GET /v1/upsell/rules/:ruleId
router.get('/rules/:ruleId', asyncHandler(async (req, res) => {
  const upsellService = require('../services/upsell');
  const rules = await upsellService.listRules(req.tenantShopId, {});
  const rule = rules.items.find(r => r.id === req.params.ruleId);
  if (!rule) throw new (require('../errors/domain-error'))('NOT_FOUND', 'Rule not found', 404);
  res.json(rule);
}));

// PATCH /v1/upsell/rules/:ruleId
router.patch('/rules/:ruleId', asyncHandler(async (req, res) => {
  const rule = await upsellService.updateRule(req.tenantShopId, req.params.ruleId, req.body);
  if (!rule) throw new (require('../errors/domain-error'))('NOT_FOUND', 'Rule not found', 404);
  res.json(rule);
}));

// DELETE /v1/upsell/rules/:ruleId
router.delete('/rules/:ruleId', asyncHandler(async (req, res) => {
  const deleted = await upsellService.deleteRule(req.tenantShopId, req.params.ruleId);
  if (!deleted) throw new (require('../errors/domain-error'))('NOT_FOUND', 'Rule not found', 404);
  res.json({ deleted: true });
}));

module.exports = router;
