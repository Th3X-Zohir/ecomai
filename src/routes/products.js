const express = require('express');
const { products, createId } = require('../store');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', (req, res) => {
  const items = products.filter((p) => p.shop_id === req.tenantShopId);
  return res.json({ items, count: items.length });
});

router.post('/', (req, res) => {
  const { name, slug, base_price, description } = req.body;
  if (!name || !slug || base_price == null) {
    return res.status(400).json({ message: 'name, slug, base_price are required' });
  }

  const existing = products.find((p) => p.shop_id === req.tenantShopId && p.slug === slug);
  if (existing) {
    return res.status(409).json({ message: 'slug must be unique per shop' });
  }

  const product = {
    id: createId('prod'),
    shop_id: req.tenantShopId,
    name,
    slug,
    base_price: Number(base_price),
    description: description || null,
    status: 'draft',
    created_at: new Date().toISOString(),
  };

  products.push(product);
  return res.status(201).json(product);
});

module.exports = router;
