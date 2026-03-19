const express = require('express');
const { authRequired, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const deliveryZonesService = require('../services/delivery-zones');

const router = express.Router();
router.use(authRequired, resolveTenant, requireTenantContext);

/* ── Delivery Settings ─────────────────────────────────────────────── */

router.get('/settings', asyncHandler(async (req, res) => {
  const settings = await deliveryZonesService.getSettings(req.tenantShopId);
  res.json(settings);
}));

router.patch('/settings', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  const settings = await deliveryZonesService.saveSettings(req.tenantShopId, req.body);
  res.json(settings);
}));

/* ── Zones ──────────────────────────────────────────────────────────── */

router.get('/zones', asyncHandler(async (req, res) => {
  const zones = await deliveryZonesService.getZones(req.tenantShopId);
  res.json({ items: zones });
}));

router.post('/zones', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  const zone = await deliveryZonesService.createZone(req.tenantShopId, req.body);
  res.status(201).json(zone);
}));

router.get('/zones/:zoneId', asyncHandler(async (req, res) => {
  const zone = await deliveryZonesService.getZone(req.tenantShopId, req.params.zoneId);
  res.json(zone);
}));

router.patch('/zones/:zoneId', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  const zone = await deliveryZonesService.updateZone(req.tenantShopId, req.params.zoneId, req.body);
  res.json(zone);
}));

router.delete('/zones/:zoneId', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  await deliveryZonesService.deleteZone(req.tenantShopId, req.params.zoneId);
  res.json({ success: true });
}));

router.post('/zones/:zoneId/areas', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  const area = await deliveryZonesService.addAreaToZone(req.tenantShopId, req.params.zoneId, req.body);
  res.status(201).json(area);
}));

router.delete('/zones/:zoneId/areas/:areaId', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  await deliveryZonesService.removeAreaFromZone(req.tenantShopId, req.params.zoneId, req.params.areaId);
  res.json({ success: true });
}));

/* ── Charge Rules ───────────────────────────────────────────────────── */

router.get('/charge-rules', asyncHandler(async (req, res) => {
  const zoneId = req.query.zone_id || undefined;
  const rules = await deliveryZonesService.getChargeRules(req.tenantShopId, zoneId);
  res.json({ items: rules });
}));

router.post('/charge-rules', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  const rule = await deliveryZonesService.createChargeRule(req.tenantShopId, req.body);
  res.status(201).json(rule);
}));

router.patch('/charge-rules/:ruleId', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  const rule = await deliveryZonesService.updateChargeRule(req.tenantShopId, req.params.ruleId, req.body);
  res.json(rule);
}));

router.delete('/charge-rules/:ruleId', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  await deliveryZonesService.deleteChargeRule(req.tenantShopId, req.params.ruleId);
  res.json({ success: true });
}));

/* ── SLA Profiles ──────────────────────────────────────────────────── */

router.get('/sla-profiles', asyncHandler(async (req, res) => {
  const profiles = await deliveryZonesService.getSlaProfiles(req.tenantShopId);
  res.json({ items: profiles });
}));

router.post('/sla-profiles', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  const profile = await deliveryZonesService.createSlaProfile(req.tenantShopId, req.body);
  res.status(201).json(profile);
}));

router.patch('/sla-profiles/:profileId', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  const profile = await deliveryZonesService.updateSlaProfile(req.tenantShopId, req.params.profileId, req.body);
  res.json(profile);
}));

router.delete('/sla-profiles/:profileId', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  await deliveryZonesService.deleteSlaProfile(req.tenantShopId, req.params.profileId);
  res.json({ success: true });
}));

/* ── Calculate Charge ───────────────────────────────────────────────── */

router.post('/calculate', asyncHandler(async (req, res) => {
  const { zoneId, packageWeight, orderAmount, itemCount, isCod } = req.body;
  const result = await deliveryZonesService.calculateCharge({
    shopId: req.tenantShopId,
    zoneId,
    packageWeight,
    orderAmount,
    itemCount,
    isCod,
  });
  res.json(result);
}));

router.post('/estimate-delivery', asyncHandler(async (req, res) => {
  const { zoneId, slaProfileId } = req.body;
  const estimate = await deliveryZonesService.estimateDeliveryWindow(req.tenantShopId, zoneId, slaProfileId);
  res.json(estimate);
}));

/* ── Driver Fleet ───────────────────────────────────────────────────── */

router.get('/fleet', requireRole('shop_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const fleet = await deliveryZonesService.getFleet(req.tenantShopId);
  res.json({ items: fleet });
}));

router.post('/fleet', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  const driver = await deliveryZonesService.registerDriver(req.tenantShopId, req.body);
  res.status(201).json(driver);
}));

router.patch('/fleet/:userId/availability', requireRole('shop_admin'), asyncHandler(async (req, res) => {
  const driver = await deliveryZonesService.setDriverAvailability(req.params.userId, req.body.isAvailable);
  if (!driver) throw new (require('../errors/domain-error'))('NOT_FOUND', 'Driver not found in fleet', 404);
  res.json(driver);
}));

module.exports = router;
