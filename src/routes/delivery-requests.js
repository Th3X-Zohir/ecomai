const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const deliveryService = require('../services/delivery-requests');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', asyncHandler(async (req, res) => {
  const result = await deliveryService.listDeliveryRequests(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
  });
  res.json(result);
}));

router.post('/', asyncHandler(async (req, res) => {
  const delivery = await deliveryService.createDeliveryRequest({
    shopId: req.tenantShopId,
    orderId: req.body.orderId,
    pickup_address: req.body.pickup_address,
    delivery_address: req.body.delivery_address,
    notes: req.body.notes,
  });
  res.status(201).json(delivery);
}));

router.patch('/:deliveryRequestId/status', asyncHandler(async (req, res) => {
  const request = await deliveryService.updateDeliveryStatus({
    shopId: req.tenantShopId, deliveryRequestId: req.params.deliveryRequestId, status: req.body.status,
  });
  res.json(request);
}));

router.patch('/:deliveryRequestId/assign', asyncHandler(async (req, res) => {
  const request = await deliveryService.assignDriver({
    shopId: req.tenantShopId, deliveryRequestId: req.params.deliveryRequestId, driverUserId: req.body.driver_user_id,
  });
  res.json(request);
}));

module.exports = router;