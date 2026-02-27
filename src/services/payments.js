const SSLCommerzPayment = require('sslcommerz-lts');
const config = require('../config');
const orderRepo = require('../repositories/orders');
const paymentRepo = require('../repositories/payments');
const db = require('../db');
const { DomainError } = require('../errors/domain-error');

async function ensureOrder(shopId, orderId) {
  const order = await orderRepo.findById(orderId);
  if (!order || order.shop_id !== shopId) {
    throw new DomainError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  return order;
}

/**
 * Initiate SSLCommerz payment session for an order.
 * Returns { GatewayPageURL, ... } to redirect the customer.
 */
async function initiatePayment({ shopId, orderId, customerName, customerEmail, customerPhone, shippingAddress }) {
  const order = await ensureOrder(shopId, orderId);

  const tranId = `TXN_${order.id}_${Date.now()}`;

  // Create pending payment record
  const payment = await paymentRepo.createPayment({
    order_id: orderId,
    shop_id: shopId,
    amount: order.total_amount,
    currency: 'BDT',
    method: 'sslcommerz',
    status: 'pending',
    gateway_tran_id: tranId,
  });

  const sslcz = new SSLCommerzPayment(
    config.sslcommerzStoreId,
    config.sslcommerzStorePasswd,
    config.sslcommerzIsLive
  );

  const sslData = {
    total_amount: Number(order.total_amount),
    currency: 'BDT',
    tran_id: tranId,
    success_url: `${config.apiUrl}/v1/payments/sslcommerz/success`,
    fail_url: `${config.apiUrl}/v1/payments/sslcommerz/fail`,
    cancel_url: `${config.apiUrl}/v1/payments/sslcommerz/cancel`,
    ipn_url: `${config.apiUrl}/v1/payments/sslcommerz/ipn`,
    shipping_method: 'NO',
    product_name: `Order #${order.id}`,
    product_category: 'ecommerce',
    product_profile: 'general',
    cus_name: customerName || 'Customer',
    cus_email: customerEmail || order.customer_email,
    cus_phone: customerPhone || '01700000000',
    cus_add1: shippingAddress || 'Dhaka',
    cus_city: 'Dhaka',
    cus_country: 'Bangladesh',
    value_a: payment.id,  // our payment ID
    value_b: shopId,       // shop ID for routing
  };

  const response = await sslcz.init(sslData);

  if (!response?.GatewayPageURL) {
    throw new DomainError('PAYMENT_INIT_FAILED', 'Failed to initialize payment gateway', 502);
  }

  await paymentRepo.updatePayment(payment.id, { gateway_response: response });

  return { gatewayUrl: response.GatewayPageURL, paymentId: payment.id, tranId };
}

/**
 * Validate IPN/callback from SSLCommerz and update payment + order status.
 */
async function handleSSLCommerzCallback(body) {
  const { tran_id, status, val_id } = body;

  const payment = await paymentRepo.findByTranId(tran_id);
  if (!payment) return { valid: false, message: 'Payment not found' };

  if (payment.status === 'completed') return { valid: true, payment, alreadyProcessed: true };

  if (status === 'VALID' || status === 'VALIDATED') {
    // Optionally validate with SSLCommerz
    const sslcz = new SSLCommerzPayment(config.sslcommerzStoreId, config.sslcommerzStorePasswd, config.sslcommerzIsLive);
    try {
      const validation = await sslcz.validate({ val_id });
      if (validation.status !== 'VALID' && validation.status !== 'VALIDATED') {
        await paymentRepo.updatePayment(payment.id, { status: 'failed', gateway_response: validation });
        return { valid: false, payment };
      }
    } catch (_e) {
      // If validation call fails, trust the callback status
    }

    await paymentRepo.updatePayment(payment.id, { status: 'completed', gateway_response: body });
    await orderRepo.updateOrder(payment.order_id, payment.shop_id, { status: 'confirmed', payment_status: 'paid' });
    return { valid: true, payment: { ...payment, status: 'completed' } };
  }

  const newStatus = status === 'FAILED' ? 'failed' : 'cancelled';
  await paymentRepo.updatePayment(payment.id, { status: newStatus, gateway_response: body });
  return { valid: false, payment: { ...payment, status: newStatus } };
}

async function createManualPayment({ shopId, orderId, amount, currency, method }) {
  const order = await ensureOrder(shopId, orderId);
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new DomainError('VALIDATION_ERROR', 'amount must be greater than 0', 400);
  }
  if (normalizedAmount > Number(order.total_amount)) {
    throw new DomainError('VALIDATION_ERROR', 'payment amount cannot exceed order total', 400);
  }
  return paymentRepo.createPayment({
    shop_id: shopId, order_id: orderId, amount: normalizedAmount,
    currency: currency || 'BDT', method: method || 'manual', status: 'completed',
  });
}

async function listPayments(shopId, opts) {
  return paymentRepo.listByShop(shopId, opts);
}

async function listPaymentsByOrder(orderId) {
  return paymentRepo.listByOrder(orderId);
}

async function getPayment(shopId, paymentId) {
  const payment = await paymentRepo.findByIdAndShop(paymentId, shopId);
  if (!payment) throw new DomainError('PAYMENT_NOT_FOUND', 'payment not found', 404);
  return payment;
}

async function createRefund({ shopId, paymentId, amount, reason }) {
  const payment = await getPayment(shopId, paymentId);
  const existingRefunds = await paymentRepo.listRefundsByPayment(paymentId);
  const refundedAmount = existingRefunds.reduce((sum, r) => sum + Number(r.amount), 0);
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new DomainError('VALIDATION_ERROR', 'refund amount must be > 0', 400);
  }
  if (refundedAmount + normalizedAmount > Number(payment.amount)) {
    throw new DomainError('VALIDATION_ERROR', 'refund amount exceeds paid amount', 400);
  }
  return paymentRepo.createRefund({ payment_id: paymentId, shop_id: shopId, amount: normalizedAmount, reason });
}

module.exports = {
  initiatePayment, handleSSLCommerzCallback, createManualPayment,
  listPayments, listPaymentsByOrder, getPayment, createRefund,
};