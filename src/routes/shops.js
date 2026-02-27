const express = require('express');
const { shops } = require('../store');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant);

router.get('/me', requireTenantContext, (req, res) => {
  const shop = shops.find((entry) => entry.id === req.tenantShopId);

  if (!shop) {
    return res.status(404).json({ message: 'Shop not found' });
  }

  return res.json(shop);
});

router.get('/', requireRoles(['super_admin']), (req, res) => {
  return res.json({ items: shops, count: shops.length });
});

module.exports = router;
