const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const paymentService = require('../services/payments');
const config = require('../config');

const router = express.Router();

// --- SSLCommerz callback routes (no auth needed, called by gateway) ---

router.post('/sslcommerz/success', asyncHandler(async (req, res) => {
  const result = await paymentService.handleSSLCommerzCallback(req.body);
  const shopId = req.body.value_b;
  if (result.valid) {
    return res.redirect(`${config.appUrl}/store/${shopId}/checkout/success?tran_id=${req.body.tran_id}`);
  }
  return res.redirect(`${config.appUrl}/store/${shopId}/checkout/fail?tran_id=${req.body.tran_id}`);
}));

router.post('/sslcommerz/fail', asyncHandler(async (req, res) => {
  await paymentService.handleSSLCommerzCallback(req.body);
  const shopId = req.body.value_b;
  return res.redirect(`${config.appUrl}/store/${shopId}/checkout/fail?tran_id=${req.body.tran_id}`);
}));

router.post('/sslcommerz/cancel', asyncHandler(async (req, res) => {
  await paymentService.handleSSLCommerzCallback(req.body);
  const shopId = req.body.value_b;
  return res.redirect(`${config.appUrl}/store/${shopId}/checkout/cancel?tran_id=${req.body.tran_id}`);
}));

router.post('/sslcommerz/ipn', asyncHandler(async (req, res) => {
  await paymentService.handleSSLCommerzCallback(req.body);
  return res.status(200).json({ message: 'IPN received' });
}));

// --- Authenticated admin payment routes ---

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', asyncHandler(async (req, res) => {
  const result = await paymentService.listPayments(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
  });
  res.json(result);
}));

router.post('/manual', asyncHandler(async (req, res) => {
  const payment = await paymentService.createManualPayment({
    shopId: req.tenantShopId,
    orderId: req.body.orderId,
    amount: req.body.amount,
    currency: req.body.currency,
    method: req.body.method,
  });
  res.status(201).json(payment);
}));

router.get('/:paymentId', asyncHandler(async (req, res) => {
  const payment = await paymentService.getPayment(req.tenantShopId, req.params.paymentId);
  res.json(payment);
}));

router.post('/:paymentId/refunds', asyncHandler(async (req, res) => {
  const refund = await paymentService.createRefund({
    shopId: req.tenantShopId, paymentId: req.params.paymentId,
    amount: req.body.amount, reason: req.body.reason,
  });
  res.status(201).json(refund);
}));

module.exports = router;