const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const websiteService = require('../services/website-settings');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/me', (req, res) => {
  const settings = websiteService.getWebsiteSettings(req.tenantShopId, req.auth.sub);
  return res.json(settings);
});

router.patch('/me', (req, res) => {
  const settings = websiteService.updateWebsiteSettings(req.tenantShopId, req.body, req.auth.sub);
  return res.json(settings);
});

module.exports = router;
