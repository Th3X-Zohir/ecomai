// Direct fetch-based SSLCommerz integration (Bun-compatible, no form-data dependency)
const config = require('../config');
const orderRepo = require('../repositories/orders');
const paymentRepo = require('../repositories/payments');
const earningsService = require('../services/earnings');
const analyticsService = require('../services/analytics');
const db = require('../db');
const { DomainError } = require('../errors/domain-error');

const SSLCZ_BASE = config.sslcommerzIsLive
  ? 'https://securepay.sslcommerz.com'
  : 'https://sandbox.sslcommerz.com';

/** POST form-encoded data to SSLCommerz using native fetch */
async function sslczPost(endpoint, data, timeoutMs = 15_000) {
  const body = new URLSearchParams(data).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${SSLCZ_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** GET with query params from SSLCommerz */
async function sslczGet(endpoint, params, timeoutMs = 10_000) {
  const qs = new URLSearchParams(params).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${SSLCZ_BASE}${endpoint}?${qs}`, { signal: controller.signal });
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verify SSLCommerz IPN signature.
 * SSLCommerz IPN validation requires posting the received fields back to their
 * validation API with store credentials. Returns true if the IPN is verified.
 */
async function verifyIPNSignature(ipnBody) {
  const { tran_id, val_id, store_id, store_passwd } = ipnBody;
  if (!tran_id || !val_id) return false;
  try {
    const result = await sslczPost('/validator/api/validationserverAPI.php', {
      val_id: val_id,
      store_id: config.sslcommerzStoreId,
      store_passwd: config.sslcommerzStorePasswd,
      v: '1',
      format: 'json',
    });
    // If the response status matches the IPN status, signature is valid
    return result.status === 'VALID' || result.status === 'VALIDATED';
  } catch (_e) {
    return false;
  }
}

async function ensureOrder(shopId, orderId) {
  const order = await orderRepo.findById(orderId);
  if (!order || (shopId && order.shop_id !== shopId)) {
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

  // Idempotency: if a pending payment already exists for this order, return it instead of creating a duplicate
  const existingPending = await paymentRepo.findPendingByOrder(orderId);
  if (existingPending) {
    return { gatewayUrl: null, paymentId: existingPending.id, tranId: existingPending.gateway_tran_id, alreadyExists: true };
  }

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

  const sslData = {
    store_id: config.sslcommerzStoreId,
    store_passwd: config.sslcommerzStorePasswd,
    total_amount: String(Number(order.total_amount)),
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
    value_a: payment.id,
    value_b: shopId,
  };

  const response = await sslczPost('/gwprocess/v4/api.php', sslData);

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
    // Validate with SSLCommerz
    try {
      const validation = await sslczGet('/validator/api/validationserverAPI.php', {
        val_id,
        store_id: config.sslcommerzStoreId,
        store_passwd: config.sslcommerzStorePasswd,
        v: '1',
        format: 'json',
      });
      if (validation.status !== 'VALID' && validation.status !== 'VALIDATED') {
        await paymentRepo.updatePayment(payment.id, { status: 'failed', gateway_response: validation });
        return { valid: false, payment };
      }
    } catch (_e) {
      // Validation call failed — do NOT trust the unverified callback
      await paymentRepo.updatePayment(payment.id, { status: 'failed', gateway_response: { error: 'validation_call_failed', raw: body } });
      return { valid: false, payment: { ...payment, status: 'failed' }, message: 'Gateway validation unreachable' };
    }

    await paymentRepo.updatePayment(payment.id, { status: 'completed', gateway_response: body });
    await orderRepo.updateOrder(payment.order_id, payment.shop_id, { status: 'confirmed', payment_status: 'paid' });
    // Record shop earnings (online payment only — not COD)
    try {
      await earningsService.recordSaleEarning({
        shopId: payment.shop_id,
        paymentId: payment.id,
        orderId: payment.order_id,
        grossAmount: payment.amount,
        currency: payment.currency,
      });
    } catch (_e) { /* non-critical — don't block payment flow */ }

    // Refresh customer metrics for benchmarking (non-blocking)
    try {
      const order = await orderRepo.findById(payment.order_id);
      if (order?.customer_id) {
        await analyticsService.refreshCustomerMetrics(order.customer_id, payment.shop_id);
      }
    } catch (_e) { /* non-critical — don't block payment flow */ }
    return { valid: true, payment: { ...payment, status: 'completed' } };
  }

  const newStatus = status === 'FAILED' ? 'failed' : 'cancelled';
  await paymentRepo.updatePayment(payment.id, { status: newStatus, gateway_response: body });

  // Cancel any pending affiliate referral for this failed order (non-blocking)
  try {
    const affiliateRepo = require('../repositories/affiliates');
    await affiliateRepo.cancelReferralByOrderId(payment.order_id);
  } catch (_) { /* non-critical */ }

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
  const payment = await paymentRepo.createPayment({
    shop_id: shopId, order_id: orderId, amount: normalizedAmount,
    currency: currency || 'BDT', method: method || 'manual', status: 'completed',
  });
  // Update order payment_status to 'paid'
  await orderRepo.updateOrder(orderId, shopId, { payment_status: 'paid' });

  // Refresh customer metrics for benchmarking (non-blocking)
  if (order.customer_id) {
    try {
      await analyticsService.refreshCustomerMetrics(order.customer_id, shopId);
    } catch (_e) { /* non-critical */ }
  }

  return payment;
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

async function updatePaymentDetails(shopId, paymentId, patch) {
  const payment = await getPayment(shopId, paymentId);
  const safePatch = {};
  if (patch.status !== undefined) safePatch.status = patch.status;
  if (patch.method !== undefined) safePatch.method = patch.method;
  if (shopId) safePatch._shopId = shopId;
  return paymentRepo.updatePayment(payment.id, safePatch);
}

async function deletePayment(shopId, paymentId) {
  const payment = await getPayment(shopId, paymentId);
  if (!['pending', 'failed', 'cancelled'].includes(payment.status)) {
    throw new DomainError('INVALID_STATE', 'can only delete pending, failed or cancelled payments', 400);
  }
  return paymentRepo.deletePayment(paymentId);
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
  listPayments, listPaymentsByOrder, getPayment, updatePaymentDetails, deletePayment, createRefund,
};