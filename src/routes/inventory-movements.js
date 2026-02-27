const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const inventoryService = require('../services/inventory-movements');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', (req, res) => {
  const items = inventoryService.listMovements(req.tenantShopId, req.query.variantId);
  return res.json({ items, count: items.length });
});

module.exports = router;
