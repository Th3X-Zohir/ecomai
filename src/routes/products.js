const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const productService = require('../services/products');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    search: req.query.search,
    category: req.query.category,
    status: req.query.status,
  });
  res.json(result);
}));

router.get('/:productId', asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.tenantShopId, req.params.productId);
  res.json(product);
}));

router.post('/', asyncHandler(async (req, res) => {
  const product = await productService.createProduct({ shopId: req.tenantShopId, ...req.body });
  res.status(201).json(product);
}));

router.patch('/:productId', asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.tenantShopId, req.params.productId, req.body);
  res.json(product);
}));

router.delete('/:productId', asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(req.tenantShopId, req.params.productId);
  res.json(result);
}));

module.exports = router;