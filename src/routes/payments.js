const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const paymentService = require('../services/payments');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', (req, res) => {
  const items = paymentService.listPayments(req.tenantShopId, req.query.orderId);
  return res.json({ items, count: items.length });
});

router.get('/:paymentId', (req, res) => {
  try {
    const payment = paymentService.getPayment(req.tenantShopId, req.params.paymentId);
    return res.json(payment);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to fetch payment' });
  }
});

router.post('/:paymentId/refunds', (req, res) => {
  try {
    const refund = paymentService.createRefund({
      shopId: req.tenantShopId,
      paymentId: req.params.paymentId,
      amount: req.body.amount,
      reason: req.body.reason,
    });
    return res.status(201).json(refund);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to create refund' });
  }
});

module.exports = router;
