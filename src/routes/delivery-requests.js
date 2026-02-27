const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const deliveryService = require('../services/delivery-requests');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', (req, res) => {
  const items = deliveryService.listDeliveryRequests(req.tenantShopId);
  return res.json({ items, count: items.length });
});

router.patch('/:deliveryRequestId/status', (req, res) => {
  try {
    const request = deliveryService.updateDeliveryStatus({
      shopId: req.tenantShopId,
      deliveryRequestId: req.params.deliveryRequestId,
      status: req.body.status,
    });

    return res.json(request);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }

    return res.status(500).json({ message: 'Failed to update delivery request status' });
  }
});

module.exports = router;
