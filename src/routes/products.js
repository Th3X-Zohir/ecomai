const express = require('express');
const { products, createId } = require('../store');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant);

router.get('/', (req, res) => {
  if (!req.tenantShopId) {
    return res.status(400).json({ message: 'x-shop-id is required for super_admin' });
  }

  const items = products.filter((p) => p.shop_id === req.tenantShopId);
  return res.json({ items, count: items.length });
});

router.post('/', (req, res) => {
  try {
    const product = productService.createProduct({
      shopId: req.tenantShopId,
      ...req.body,
    });

    return res.status(201).json(product);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }

    return res.status(500).json({ message: 'Failed to create product' });
  }
});

module.exports = router;
