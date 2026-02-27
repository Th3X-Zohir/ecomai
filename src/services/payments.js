const orderService = require('./orders');
const paymentRepo = require('../repositories/payments');
const { DomainError } = require('../errors/domain-error');

function createPayment({ shopId, orderId, amount, currency, provider }) {
  const order = orderService.ensureOrderExists(shopId, orderId);

  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new DomainError('VALIDATION_ERROR', 'amount must be greater than 0', 400);
  }

  if (normalizedAmount > Number(order.total_amount)) {
    throw new DomainError('VALIDATION_ERROR', 'payment amount cannot exceed order total', 400);
  }

  return paymentRepo.createPayment({
    shop_id: shopId,
    order_id: orderId,
    amount: normalizedAmount,
    currency,
    provider,
    status: 'captured',
  });
}

function listPayments(shopId, orderId) {
  if (orderId) {
    return paymentRepo.listByOrder(shopId, orderId);
  }
  return paymentRepo.listByShop(shopId);
}

function getPayment(shopId, paymentId) {
  const payment = paymentRepo.findByIdAndShop(paymentId, shopId);
  if (!payment) {
    throw new DomainError('PAYMENT_NOT_FOUND', 'payment not found', 404);
  }
  return payment;
}

function createRefund({ shopId, paymentId, amount, reason }) {
  const payment = getPayment(shopId, paymentId);
  const existingRefunds = paymentRepo.listRefundsByPayment(shopId, paymentId);
  const refundedAmount = existingRefunds.reduce((sum, entry) => sum + Number(entry.amount), 0);

  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new DomainError('VALIDATION_ERROR', 'refund amount must be greater than 0', 400);
  }

  if (refundedAmount + normalizedAmount > Number(payment.amount)) {
    throw new DomainError('VALIDATION_ERROR', 'refund amount exceeds paid amount', 400);
  }

  return paymentRepo.createRefund({
    shop_id: shopId,
    payment_id: paymentId,
    amount: normalizedAmount,
    reason,
  });
}

module.exports = { createPayment, listPayments, getPayment, createRefund };
