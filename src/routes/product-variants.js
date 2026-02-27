const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const variantService = require('../services/product-variants');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/products/:productId/variants', asyncHandler(async (req, res) => {
  const items = await variantService.listVariants(req.tenantShopId, req.params.productId);
  res.json({ items, count: items.length });
}));

router.post('/products/:productId/variants', asyncHandler(async (req, res) => {
  const variant = await variantService.createVariant({
    shopId: req.tenantShopId, productId: req.params.productId, ...req.body,
  });
  res.status(201).json(variant);
}));

router.get('/product-variants/:variantId', asyncHandler(async (req, res) => {
  const variant = await variantService.getVariant(req.tenantShopId, req.params.variantId);
  res.json(variant);
}));

router.patch('/product-variants/:variantId', asyncHandler(async (req, res) => {
  const variant = await variantService.updateVariant({
    shopId: req.tenantShopId, variantId: req.params.variantId, patch: req.body,
  });
  res.json(variant);
}));

router.delete('/product-variants/:variantId', asyncHandler(async (req, res) => {
  const result = await variantService.deleteVariant(req.tenantShopId, req.params.variantId);
  res.json(result);
}));

module.exports = router;