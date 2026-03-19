const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const operationsService = require('../services/operations');

const router = express.Router();
router.use(authRequired, resolveTenant);

/* ═══════════════════════════════════════════════════════
   MERCHANT OPERATIONS
   ═══════════════════════════════════════════════════════ */

router.get('/merchant/overview', asyncHandler(async (req, res) => {
  if (!['shop_admin', 'shop_user'].includes(req.auth.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const ops = await operationsService.getMerchantOperations(req.tenantShopId);
  res.json(ops);
}));

router.get('/merchant/fulfillment-queue', asyncHandler(async (req, res) => {
  if (!['shop_admin', 'shop_user'].includes(req.auth.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const queue = await operationsService.getFulfillmentQueue(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    sort: req.query.sort || 'oldest',
  });
  res.json(queue);
}));

router.get('/merchant/delivery-queue', asyncHandler(async (req, res) => {
  if (!['shop_admin', 'shop_user'].includes(req.auth.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const queue = await operationsService.getDeliveryQueue(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
    driverId: req.query.driver_id,
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
    scheduledDate: req.query.scheduled_date,
  });
  res.json(queue);
}));

router.get('/merchant/financial-ops', asyncHandler(async (req, res) => {
  if (!['shop_admin', 'shop_user'].includes(req.auth.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const ops = await operationsService.getMerchantFinancialOps(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    type: req.query.type,
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
  });
  res.json(ops);
}));

/* ═══════════════════════════════════════════════════════
   PLATFORM OPERATIONS (super_admin only)
   ═══════════════════════════════════════════════════════ */

router.get('/platform/overview', requireRoles('super_admin'), asyncHandler(async (req, res) => {
  const ops = await operationsService.getPlatformOperations();
  res.json(ops);
}));

router.get('/platform/exceptions', requireRoles('super_admin'), asyncHandler(async (req, res) => {
  const queue = await operationsService.getPlatformExceptionQueue({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    type: req.query.type,
  });
  res.json(queue);
}));

router.get('/platform/deliveries', requireRoles('super_admin'), asyncHandler(async (req, res) => {
  const oversight = await operationsService.getPlatformDeliveryOversight({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
  });
  res.json(oversight);
}));

module.exports = router;
