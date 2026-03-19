/**
 * Refunds Service — refund request workflow.
 * Supports both merchant-initiated and customer-initiated refunds.
 * For online payments: initiates SSLCommerz refund API call.
 * For COD: marks as processed directly.
 */
const refundRepo = require('../repositories/refunds');
const paymentRepo = require('../repositories/payments');
const orderRepo = require('../repositories/orders');
const earningsService = require('./earnings');
const settlementsService = require('./settlements');
const notificationService = require('./notifications');
const shopRepo = require('../repositories/shops');
const config = require('../config');
const { DomainError } = require('../errors/domain-error');

const SSLCZ_BASE = config.sslcommerzIsLive
  ? 'https://securepay.sslcommerz.com'
  : 'https://sandbox.sslcommerz.com';

/**
 * Submit a refund request.
 * Can be initiated by merchant (userId) or customer (customerId).
 */
async function submitRefundRequest({ shopId, orderId, paymentId, customerId, requestedBy, reason, refundAmount }) {
  // Validate order belongs to shop
  const order = await orderRepo.findByIdAndShop(orderId, shopId);
  if (!order) throw new DomainError('ORDER_NOT_FOUND', 'Order not found', 404);
  if (!['delivered', 'confirmed', 'processing'].includes(order.status)) {
    throw new DomainError('INVALID_STATE', 'Refunds can only be requested for active orders', 400);
  }

  // Validate payment exists for online refunds
  let payment = null;
  if (paymentId) {
    payment = await paymentRepo.findByIdAndShop(paymentId, shopId);
  } else {
    // Find the payment for this order
    const payments = await paymentRepo.listByOrder(orderId);
    payment = payments.find(p => p.status === 'completed');
  }

  // Validate refund amount
  const maxRefund = payment ? Number(payment.amount) : Number(order.total_amount);
  const requestedAmount = Number(refundAmount) || Number(order.total_amount);
  if (requestedAmount <= 0) {
    throw new DomainError('VALIDATION_ERROR', 'Refund amount must be positive', 400);
  }
  if (requestedAmount > maxRefund) {
    throw new DomainError('VALIDATION_ERROR', `Refund amount cannot exceed ${maxRefund}`, 400);
  }

  // Check for existing pending refund request
  const existing = await refundRepo.listByShop(shopId, { status: 'pending' });
  const duplicate = existing.items?.find(r => r.order_id === orderId && r.status === 'pending');
  if (duplicate) {
    throw new DomainError('DUPLICATE_REQUEST', 'A pending refund request already exists for this order', 400);
  }

  const request = await refundRepo.createRefundRequest({
    shopId, orderId,
    paymentId: payment?.id || null,
    customerId: customerId || null,
    requestedBy: requestedBy || null,
    reason,
    refundAmount: requestedAmount,
    currency: payment?.currency || 'BDT',
  });

  // Notify merchant of refund request (fire-and-forget)
  try {
    const shop = await shopRepo.findById(shopId);
    const customer = customerId ? await require('../repositories/customers').findById(customerId) : null;
    await notificationService.notifyRefundRequested({
      shopId,
      shopName: shop?.name || 'the shop',
      shopSlug: shop?.slug,
      orderId,
      customerEmail: customer?.email || order?.customer_email || 'Unknown',
      refundAmount: requestedAmount,
      reason,
    });
  } catch (_) { /* non-critical */ }

  return request;
}

/**
 * Approve a refund request and initiate the refund process.
 * For online payments: calls SSLCommerz refund API.
 * For COD: marks as completed directly.
 */
async function approveRefund(shopId, requestId, { approvedBy, notes }) {
  const request = await refundRepo.findByIdAndShop(requestId, shopId);
  if (!request) throw new DomainError('NOT_FOUND', 'Refund request not found', 404);
  if (request.status !== 'pending') {
    throw new DomainError('INVALID_STATE', `Cannot approve a ${request.status} refund request`, 400);
  }

  // Determine refund method
  const isOnlinePayment = request.payment_method && request.payment_method !== 'cod' && request.payment_method !== 'manual';

  let gatewayRefundId = null;
  let newStatus = 'approved';

  if (isOnlinePayment && request.gateway_tran_id) {
    // Initiate SSLCommerz refund
    try {
      gatewayRefundId = await initiateSSLCommerzRefund({
        tranId: request.gateway_tran_id,
        refundAmount: request.refund_amount,
        refundReason: notes || 'Merchant approved refund',
      });
      newStatus = gatewayRefundId ? 'processing' : 'approved';
    } catch (_) {
      // Gateway refund failed — mark as approved (merchant will process manually)
      newStatus = 'approved';
    }
  } else {
    // COD or manual payment: process immediately
    newStatus = 'completed';
    await processCompletedRefund(request, approvedBy);
  }

  const updated = await refundRepo.updateStatus(requestId, {
    status: newStatus,
    approved_by: approvedBy,
    approved_at: new Date(),
    admin_notes: notes || null,
    gateway_refund_id: gatewayRefundId || null,
  });

  return updated;
}

/**
 * Reject a refund request.
 */
async function rejectRefund(shopId, requestId, { rejectedBy, reason }) {
  const request = await refundRepo.findByIdAndShop(requestId, shopId);
  if (!request) throw new DomainError('NOT_FOUND', 'Refund request not found', 404);
  if (request.status !== 'pending') {
    throw new DomainError('INVALID_STATE', `Cannot reject a ${request.status} refund request`, 400);
  }

  return refundRepo.updateStatus(requestId, {
    status: 'rejected',
    rejected_by: rejectedBy,
    rejected_at: new Date(),
    rejection_reason: reason || null,
  });
}

/**
 * Mark a processing refund as completed (called after SSLCommerz confirms).
 */
async function completeRefund(shopId, requestId) {
  const request = await refundRepo.findByIdAndShop(requestId, shopId);
  if (!request) throw new DomainError('NOT_FOUND', 'Refund request not found', 404);
  if (request.status !== 'processing') {
    throw new DomainError('INVALID_STATE', 'Only processing refunds can be completed', 400);
  }

  await processCompletedRefund(request, null);
  return refundRepo.updateStatus(requestId, {
    status: 'completed',
    processed_at: new Date(),
    completed_at: new Date(),
  });
}

/**
 * Internal: process the financial side of a completed refund.
 * Updates settlement ledger: deducts from held or available balance.
 */
async function processCompletedRefund(request, processedBy) {
  // Mark order as refunded
  await orderRepo.updateOrder(request.order_id, request.shop_id, { status: 'refunded' });

  // Deduct from shop earnings (earnings ledger)
  try {
    await earningsService.recordRefundDeduction({
      shopId: request.shop_id,
      paymentId: request.payment_id,
      orderId: request.order_id,
      amount: request.refund_amount,
      currency: request.currency,
    });
  } catch (_) { /* non-critical */ }

  // Settle refund in escrow ledger (deduct from held or available balance)
  try {
    await settlementsService.settleRefund({
      shopId: request.shop_id,
      paymentId: request.payment_id,
      orderId: request.order_id,
      refundAmount: request.refund_amount,
      currency: request.currency,
    });
  } catch (_) { /* non-critical */ }
}

/**
 * Call SSLCommerz refund API.
 */
async function initiateSSLCommerzRefund({ tranId, refundAmount, refundReason }) {
  const params = new URLSearchParams({
    refund_amount: String(refundAmount),
    refund_tran_id: tranId,
    store_id: config.sslcommerzStoreId,
    store_passwd: config.sslcommerzStorePasswd,
    v: '1',
    format: 'json',
  });
  if (refundReason) params.set('refund_note', refundReason.slice(0, 500));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${SSLCZ_BASE}/validator/api/merchantTransApi.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: controller.signal,
    });
    const data = await res.json();
    return data?.bank_ref_id || data?.ref_id || null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Queries ───────────────────────────────────────────────

async function listRefundRequests(shopId, opts) {
  return refundRepo.listByShop(shopId, opts);
}

async function getRefundRequest(shopId, requestId) {
  const request = await refundRepo.findByIdAndShop(requestId, shopId);
  if (!request) throw new DomainError('NOT_FOUND', 'Refund request not found', 404);
  return request;
}

async function getRefundStats(shopId) {
  return refundRepo.getShopRefundStats(shopId);
}

module.exports = {
  submitRefundRequest,
  approveRefund,
  rejectRefund,
  completeRefund,
  listRefundRequests,
  getRefundRequest,
  getRefundStats,
};
