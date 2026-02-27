const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const shopService = require('../services/shops');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant);

router.get('/me', requireTenantContext, asyncHandler(async (req, res) => {
  const shop = await shopService.getShop(req.tenantShopId);
  res.json(shop);
}));

router.get('/', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const result = await shopService.listShops({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    search: req.query.search,
  });
  res.json(result);
}));

router.post('/', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const shop = await shopService.createShop(req.body);
  res.status(201).json(shop);
}));

router.patch('/me', requireTenantContext, requireRoles(['super_admin', 'shop_admin']), asyncHandler(async (req, res) => {
  const shop = await shopService.updateShop(req.tenantShopId, req.body);
  res.json(shop);
}));

module.exports = router;