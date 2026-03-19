const express = require('express');
const { authRequired, requireRoles } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const settlementsService = require('../services/settlements');

const router = express.Router();
router.use(authRequired, requireTenantContext);

/* ── Shop-level Settlements ──────────────────────────────────────── */

router.get('/balance', asyncHandler(async (req, res) => {
  const balance = await settlementsService.getBalance(req.tenantShopId);
  res.json(balance);
}));

router.get('/config', asyncHandler(async (req, res) => {
  const config = await settlementsService.getConfig(req.tenantShopId);
  res.json(config);
}));

router.patch('/config', requireRoles('shop_admin'), asyncHandler(async (req, res) => {
  const config = await settlementsService.saveConfig(req.tenantShopId, req.body);
  res.json(config);
}));

router.get('/ledger', asyncHandler(async (req, res) => {
  const ledger = await settlementsService.getLedger(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    type: req.query.type,
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
  });
  res.json(ledger);
}));

router.get('/report', asyncHandler(async (req, res) => {
  const report = await settlementsService.getSettlementReport(req.tenantShopId, {
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
  });
  res.json(report);
}));

/* ── Disputes ────────────────────────────────────────────────────── */

router.get('/disputes', requireRoles('shop_admin'), asyncHandler(async (req, res) => {
  const disputes = await settlementsService.listDisputes(req.tenantShopId);
  res.json({ items: disputes });
}));

router.post('/disputes', requireRoles('shop_admin'), asyncHandler(async (req, res) => {
  const dispute = await settlementsService.createDispute({
    refundRequestId: req.body.refundRequestId,
    shopId: req.tenantShopId,
    disputedByUserId: req.auth.sub,
    reason: req.body.reason,
  });
  res.status(201).json(dispute);
}));

router.patch('/disputes/:disputeId/resolve', requireRoles('shop_admin'), asyncHandler(async (req, res) => {
  const dispute = await settlementsService.resolveDispute(req.params.disputeId, {
    resolvedBy: req.auth.sub,
    status: req.body.status,
    resolutionNotes: req.body.resolutionNotes,
  });
  if (!dispute) throw new (require('../errors/domain-error'))('NOT_FOUND', 'Dispute not found', 404);
  res.json(dispute);
}));

module.exports = router;
