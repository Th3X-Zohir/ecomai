const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const codReconciliationService = require('../services/cod-reconciliation');

const router = express.Router();
router.use(authRequired);
router.use(resolveTenant, requireTenantContext);

/* ── Merchant / Admin Routes ─────────────────────────────────────── */

router.get('/summary', asyncHandler(async (req, res) => {
  const summary = await codReconciliationService.getShopCodSummary(req.tenantShopId, {
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
  });
  res.json(summary);
}));

router.get('/uncollected', asyncHandler(async (req, res) => {
  const orders = await codReconciliationService.getUncollectedOrders(req.tenantShopId);
  res.json({ items: orders });
}));

router.get('/collections', asyncHandler(async (req, res) => {
  const collections = await codReconciliationService.listCollections(req.tenantShopId, {
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
    driverId: req.query.driver_id,
  });
  res.json({ items: collections });
}));

router.get('/settlements', asyncHandler(async (req, res) => {
  const settlements = await codReconciliationService.listSettlements(req.tenantShopId, {
    status: req.query.status,
    driverId: req.query.driver_id,
  });
  res.json({ items: settlements });
}));

router.get('/settlements/:settlementId', asyncHandler(async (req, res) => {
  const settlement = await codReconciliationService.listSettlements(req.tenantShopId, {});
  // Find specific settlement
  const { listSettlementsByShop, getSettlementById, getSettlementItems } = require('../services/cod-reconciliation');
  const s = await require('../repositories/cod-reconciliation').getSettlementById(req.params.settlementId);
  if (!s) return res.status(404).json({ message: 'Settlement not found' });
  if (s.shop_id !== req.tenantShopId && req.auth.role !== 'super_admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const items = await require('../repositories/cod-reconciliation').getSettlementItems(req.params.settlementId);
  res.json({ ...s, items });
}));

router.patch('/settlements/:settlementId/review', asyncHandler(async (req, res) => {
  const { action, reviewNotes, bankReference } = req.body;
  if (!action) return res.status(400).json({ message: 'action is required' });

  const settlement = await require('../repositories/cod-reconciliation').getSettlementById(req.params.settlementId);
  if (!settlement) return res.status(404).json({ message: 'Settlement not found' });

  const result = await codReconciliationService.reviewSettlement(req.params.settlementId, {
    shopId: req.tenantShopId,
    reviewedBy: req.auth.sub,
    action,
    reviewNotes,
    bankReference,
  });
  res.json(result);
}));

router.get('/drivers', asyncHandler(async (req, res) => {
  const drivers = await codReconciliationService.listShopDrivers(req.tenantShopId);
  res.json({ items: drivers });
}));

/* ── Driver Routes ──────────────────────────────────────────────── */

router.post('/collect', requireRoles('delivery_agent', 'shop_admin', 'shop_user'), asyncHandler(async (req, res) => {
  const { delivery_request_id, order_id, collected_amount, proof_image_url, notes } = req.body;
  if (!delivery_request_id || !order_id || !collected_amount) {
    return res.status(400).json({ message: 'delivery_request_id, order_id, and collected_amount are required' });
  }

  const collection = await codReconciliationService.recordCollection({
    deliveryRequestId: delivery_request_id,
    shopId: req.tenantShopId,
    orderId: order_id,
    driverUserId: req.auth.sub,
    collectedAmount: Number(collected_amount),
    proofImageUrl: proof_image_url,
    notes,
  });
  res.status(201).json(collection);
}));

router.post('/settlements', requireRoles('delivery_agent', 'shop_admin'), asyncHandler(async (req, res) => {
  const { period_start, period_end, collection_ids, notes } = req.body;
  if (!period_start || !period_end) {
    return res.status(400).json({ message: 'period_start and period_end are required' });
  }

  const settlement = await codReconciliationService.submitSettlement({
    shopId: req.tenantShopId,
    driverUserId: req.auth.sub,
    periodStart: period_start,
    periodEnd: period_end,
    collectionIds: collection_ids,
    notes,
  });
  res.status(201).json(settlement);
}));

router.get('/my/collections', requireRoles('delivery_agent'), asyncHandler(async (req, res) => {
  const collections = await codReconciliationService.listDriverCollections(req.auth.sub, {
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
  });
  res.json({ items: collections });
}));

router.get('/my/settlements', requireRoles('delivery_agent'), asyncHandler(async (req, res) => {
  const settlements = await codReconciliationService.listDriverSettlements(req.auth.sub, req.tenantShopId);
  res.json({ items: settlements });
}));

router.get('/my/summary', requireRoles('delivery_agent'), asyncHandler(async (req, res) => {
  const summary = await codReconciliationService.getDriverSummary(req.auth.sub, {
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
  });
  res.json(summary);
}));

module.exports = router;
