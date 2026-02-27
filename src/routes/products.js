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
  if (!req.tenantShopId) {
    return res.status(400).json({ message: 'x-shop-id is required for super_admin' });
  }

  const { name, slug, base_price, description } = req.body;
  if (!name || !slug || base_price == null) {
    return res.status(400).json({ message: 'name, slug, base_price are required' });
  }

  const product = {
    id: createId('prod'),
    shop_id: req.tenantShopId,
    name,
    slug,
    base_price,
    description: description || null,
    status: 'draft',
    created_at: new Date().toISOString(),
  };

  products.push(product);
  return res.status(201).json(product);
});

module.exports = router;
