const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const orderService = require('../services/orders');
const deliveryService = require('../services/delivery-requests');
const { DomainError } = require('../errors/domain-error');
const { createOrder, listOrdersByShop } = require('../services/orders');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', (req, res) => {
  const items = listOrdersByShop(req.tenantShopId);
  return res.json({ items, count: items.length });
});

router.post('/', (req, res) => {
  const { customer_email, items } = req.body;
  if (!customer_email || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'customer_email and non-empty items are required' });
  }

  try {
    const order = createOrder({
      shopId: req.tenantShopId,
      customer_email,
      items,
    });

    return res.status(201).json(order);
  } catch (err) {
    if (err.code === 'PRODUCT_NOT_FOUND') {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Failed to create order' });
  }
});

module.exports = router;
