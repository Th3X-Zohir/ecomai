const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const websiteService = require('../services/website-settings');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/me', asyncHandler(async (req, res) => {
  const settings = await websiteService.getWebsiteSettings(req.tenantShopId);
  res.json(settings);
}));

router.patch('/me', asyncHandler(async (req, res) => {
  const settings = await websiteService.updateWebsiteSettings(req.tenantShopId, req.body);
  res.json(settings);
}));

module.exports = router;