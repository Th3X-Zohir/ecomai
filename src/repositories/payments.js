const { payments, refunds, createId } = require('../store');

function createPayment({ shop_id, order_id, amount, currency, provider, status }) {
  const now = new Date().toISOString();
  const payment = {
    id: createId('pay'),
    shop_id,
    order_id,
    amount,
    currency: currency || 'USD',
    provider: provider || 'manual',
    status: status || 'captured',
    created_at: now,
    updated_at: now,
  };
  payments.push(payment);
  return payment;
}

function listByShop(shopId) {
  return payments.filter((entry) => entry.shop_id === shopId);
}

function listByOrder(shopId, orderId) {
  return payments.filter((entry) => entry.shop_id === shopId && entry.order_id === orderId);
}

function findByIdAndShop(paymentId, shopId) {
  return payments.find((entry) => entry.id === paymentId && entry.shop_id === shopId) || null;
}

function createRefund({ shop_id, payment_id, amount, reason }) {
  const refund = {
    id: createId('ref'),
    shop_id,
    payment_id,
    amount,
    reason: reason || null,
    status: 'processed',
    created_at: new Date().toISOString(),
  };
  refunds.push(refund);
  return refund;
}

function listRefundsByPayment(shopId, paymentId) {
  return refunds.filter((entry) => entry.shop_id === shopId && entry.payment_id === paymentId);
}

module.exports = {
  createPayment,
  listByShop,
  listByOrder,
  findByIdAndShop,
  createRefund,
  listRefundsByPayment,
};
