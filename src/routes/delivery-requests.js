const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const deliveryService = require('../services/delivery-requests');
const deliveryExceptionsService = require('../services/delivery-exceptions');
const deliveryZonesService = require('../services/delivery-zones');

const router = express.Router();
router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

/* ── List / Search ──────────────────────────────────────────────────── */

router.get('/', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.auth.role === 'super_admin';
  const opts = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
    search: req.query.search,
    driverId: req.query.driver_id,
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
    scheduledDate: req.query.scheduled_date,
  };
  if (isSuperAdmin && req.query.all === 'true') {
    const result = await deliveryService.listDeliveryRequests(null, opts);
    return res.json(result);
  }
  const result = await deliveryService.listDeliveryRequests(req.tenantShopId, opts);
  res.json(result);
}));

router.get('/by-driver/:driverUserId', asyncHandler(async (req, res) => {
  const result = await deliveryService.listDriverAssignments(req.params.driverUserId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
  });
  res.json(result);
}));

/* ── Single Request ─────────────────────────────────────────────────── */

router.get('/:deliveryRequestId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const request = await deliveryService.getDeliveryRequest(shopId, req.params.deliveryRequestId);
  if (!request) {
    return res.status(404).json({ message: 'Delivery request not found' });
  }
  // Include exceptions audit trail
  const exceptions = await deliveryExceptionsService.getDeliveryExceptions(req.params.deliveryRequestId);
  res.json({ ...request, exceptions });
}));

router.post('/', validateBody({
  orderId: { required: true, type: 'string' },
  pickup_address: { required: true },
  delivery_address: { required: true },
}), asyncHandler(async (req, res) => {
  const delivery = await deliveryService.createDeliveryRequest({
    shopId: req.tenantShopId,
    orderId: req.body.orderId,
    pickup_address: req.body.pickup_address,
    delivery_address: req.body.delivery_address,
    notes: req.body.notes,
    zoneId: req.body.zone_id,
    areaCode: req.body.area_code,
    packageWeight: req.body.package_weight,
    packageContents: req.body.package_contents,
    slaProfileId: req.body.sla_profile_id,
    scheduledDate: req.body.scheduled_date,
    scheduledTimeSlot: req.body.scheduled_time_slot,
    customerNotes: req.body.customer_notes,
  });
  res.status(201).json(delivery);
}));

/* ── Status Updates ─────────────────────────────────────────────────── */

router.patch('/:deliveryRequestId/status', validateBody({
  status: { required: true, type: 'string', oneOf: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled'] },
}), asyncHandler(async (req, res) => {
  const request = await deliveryService.updateDeliveryStatus({
    shopId: req.tenantShopId, deliveryRequestId: req.params.deliveryRequestId, status: req.body.status,
  });
  res.json(request);
}));

router.patch('/:deliveryRequestId/assign', validateBody({
  driver_user_id: { required: true, type: 'string' },
}), asyncHandler(async (req, res) => {
  const request = await deliveryService.assignDriver({
    shopId: req.tenantShopId, deliveryRequestId: req.params.deliveryRequestId, driverUserId: req.body.driver_user_id,
  });
  res.json(request);
}));

/* ── Delivery Exceptions ───────────────────────────────────────────── */

router.post('/:deliveryRequestId/failed-attempt', validateBody({
  reason_code: { required: true, type: 'string' },
  reason_description: { type: 'string' },
}), asyncHandler(async (req, res) => {
  const result = await deliveryExceptionsService.recordFailedAttempt({
    deliveryRequestId: req.params.deliveryRequestId,
    reasonCode: req.body.reason_code,
    reasonDescription: req.body.reason_description,
    attemptCount: req.body.attempt_count,
    recordedByUserId: req.auth.sub,
  });
  res.json(result);
}));

router.post('/:deliveryRequestId/return', validateBody({
  reason: { type: 'string' },
}), asyncHandler(async (req, res) => {
  const delivery = await deliveryExceptionsService.initiateReturn({
    deliveryRequestId: req.params.deliveryRequestId,
    reason: req.body.reason,
    recordedByUserId: req.auth.sub,
  });
  res.json(delivery);
}));

router.post('/:deliveryRequestId/return/complete', asyncHandler(async (req, res) => {
  const delivery = await deliveryExceptionsService.completeReturn({
    deliveryRequestId: req.params.deliveryRequestId,
    recordedByUserId: req.auth.sub,
  });
  res.json(delivery);
}));

router.post('/:deliveryRequestId/confirm-delivery', validateBody({
  proof_of_delivery: { type: 'string' },
  cod_amount: { type: 'number' },
  notes: { type: 'string' },
}), asyncHandler(async (req, res) => {
  const delivery = await deliveryExceptionsService.confirmDelivery({
    deliveryRequestId: req.params.deliveryRequestId,
    proofOfDelivery: req.body.proof_of_delivery,
    codAmount: req.body.cod_amount,
    notes: req.body.notes,
    recordedByUserId: req.auth.sub,
  });
  res.json(delivery);
}));

router.post('/:deliveryRequestId/reschedule', validateBody({
  new_date: { required: true, type: 'string' },
  new_time_slot: { type: 'string' },
  notes: { type: 'string' },
}), asyncHandler(async (req, res) => {
  const delivery = await deliveryExceptionsService.rescheduleDelivery({
    deliveryRequestId: req.params.deliveryRequestId,
    newDate: req.body.new_date,
    newTimeSlot: req.body.new_time_slot,
    notes: req.body.notes,
    recordedByUserId: req.auth.sub,
  });
  res.json(delivery);
}));

/* ── Delete ──────────────────────────────────────────────────────────── */

router.delete('/:deliveryRequestId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  await deliveryService.deleteDeliveryRequest(shopId, req.params.deliveryRequestId);
  res.json({ message: 'Delivery request deleted' });
}));

module.exports = router;