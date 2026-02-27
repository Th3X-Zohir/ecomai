const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const orderService = require('../services/orders');
const deliveryService = require('../services/delivery-requests');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', (req, res) => {
  const items = orderService.listOrdersByShop(req.tenantShopId);
  return res.json({ items, count: items.length });
});

router.get('/:orderId', (req, res) => {
  try {
    const order = orderService.getOrderById(req.tenantShopId, req.params.orderId);
    return res.json(order);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to get order' });
  }
});

router.post('/', (req, res) => {
  try {
    const order = orderService.createOrder({
      shopId: req.tenantShopId,
      ...req.body,
    });

    return res.status(201).json(order);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }

    return res.status(500).json({ message: 'Failed to create order' });
  }
});

router.patch('/:orderId/status', (req, res) => {
  try {
    const order = orderService.updateOrderStatus({
      shopId: req.tenantShopId,
      orderId: req.params.orderId,
      status: req.body.status,
    });
    return res.json(order);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to update order status' });
  }
});

router.post('/:orderId/cancel', (req, res) => {
  try {
    const order = orderService.cancelOrder({
      shopId: req.tenantShopId,
      orderId: req.params.orderId,
    });
    return res.json(order);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to cancel order' });
  }
});

router.post('/:orderId/delivery-requests', (req, res) => {
  try {
    const request = deliveryService.createDeliveryRequest({
      shopId: req.tenantShopId,
      orderId: req.params.orderId,
      ...req.body,
    });

    return res.status(201).json(request);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }

    return res.status(500).json({ message: 'Failed to create delivery request' });
  }
});

module.exports = router;
