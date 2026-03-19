/**
 * Delivery Exceptions Service
 * Handles failed delivery attempts, re-attempts, returns-to-seller, and COD collection
 */
const deliveryRequestsRepo = require('../repositories/delivery-requests');
const deliveryZonesRepo = require('../repositories/delivery-zones');
const orderRepo = require('../repositories/orders');
const notificationService = require('./notifications');
const { DomainError } = require('../errors/domain-error');

const FAILURE_CODES = [
  'customer_unavailable',
  'wrong_address',
  'address_incomplete',
  'refused',
  'not_home',
  'business_closed',
  'flooded_area',
  'area_out_of_delivery_zone',
  'package_damaged',
  'lost',
  'other',
];

const MAX_ATTEMPTS = 3;

async function recordFailedAttempt({ deliveryRequestId, reasonCode, reasonDescription, attemptCount, recordedByUserId }) {
  const delivery = await deliveryRequestsRepo.findById(deliveryRequestId);
  if (!delivery) throw new DomainError('NOT_FOUND', 'Delivery request not found', 404);
  if (!['assigned', 'picked_up', 'in_transit'].includes(delivery.status)) {
    throw new DomainError('INVALID_STATUS', `Cannot record failure for a ${delivery.status} delivery`, 400);
  }
  if (!FAILURE_CODES.includes(reasonCode)) {
    throw new DomainError('VALIDATION_ERROR', `reasonCode must be one of: ${FAILURE_CODES.join(', ')}`, 400);
  }

  const newAttemptCount = (attemptCount || delivery.attempt_count || 0) + 1;

  // Determine next status
  let nextStatus = 'failed';
  if (newAttemptCount < MAX_ATTEMPTS) {
    nextStatus = delivery.status === 'picked_up' ? 'picked_up' : 'assigned';
  }

  // Optimistic lock: only update if status hasn't changed since we read it
  const updated = await deliveryRequestsRepo.updateDeliveryRequestConditional(
    deliveryRequestId, delivery.status, {
      status: nextStatus,
      attempt_count: newAttemptCount,
      failure_reason: reasonDescription,
      failure_code: reasonCode,
    }
  );
  if (!updated) {
    throw new DomainError('CONFLICT', 'Delivery was modified by another operation. Please retry.', 409);
  }
  const updatedDelivery = updated;

  // Log the exception
  const exception = await deliveryZonesRepo.createDeliveryException({
    deliveryRequestId,
    exceptionType: 'failed_attempt',
    reasonCode,
    reasonDescription,
    recordedByUserId,
  });

  // Notify shop of failed attempt
  try {
    await notificationService.notifyDeliveryFailedAttempt({
      deliveryRequestId,
      shopId: delivery.shop_id,
      orderId: delivery.order_id,
      attemptCount: newAttemptCount,
      maxAttempts: MAX_ATTEMPTS,
      reason: reasonDescription || reasonCode,
    });
  } catch (_) { /* non-critical */ }

  return { delivery: updatedDelivery, exception, willRetry: newAttemptCount < MAX_ATTEMPTS };
}

async function initiateReturn({ deliveryRequestId, reason, recordedByUserId }) {
  const delivery = await deliveryRequestsRepo.findById(deliveryRequestId);
  if (!delivery) throw new DomainError('NOT_FOUND', 'Delivery request not found', 404);
  if (!['failed', 'in_transit', 'picked_up', 'delivered'].includes(delivery.status)) {
    throw new DomainError('INVALID_STATUS', `Cannot initiate return for a ${delivery.status} delivery`, 400);
  }

  // Optimistic lock: only update if status hasn't changed since we read it
  const updated = await deliveryRequestsRepo.updateDeliveryRequestConditional(
    deliveryRequestId, delivery.status, {
      status: 'cancelled',
      return_reason: reason || 'Delivery failed after maximum attempts',
      returned_at: new Date(),
    }
  );
  if (!updated) {
    throw new DomainError('CONFLICT', 'Delivery was modified by another operation. Please retry.', 409);
  }

  // Log the exception
  const returnDescription = reason || 'Returned to merchant after maximum delivery attempts';
  // If COD was collected on this delivery, flag for cash reconciliation
  const hasCollectedCash = delivery.cod_amount && Number(delivery.cod_amount) > 0;
  const exception = await deliveryZonesRepo.createDeliveryException({
    deliveryRequestId,
    exceptionType: 'return_initiated',
    reasonCode: 'max_attempts_reached',
    reasonDescription: hasCollectedCash
      ? `[CASH RECONCILIATION REQUIRED — BDT ${Number(delivery.cod_amount).toFixed(2)} collected] ${returnDescription}`
      : returnDescription,
    recordedByUserId,
  });

  // Create a dedicated cash reconciliation flag exception if COD was collected
  if (hasCollectedCash) {
    await deliveryZonesRepo.createDeliveryException({
      deliveryRequestId,
      exceptionType: 'cash_reconciliation',
      reasonCode: 'collected_cod_returned',
      reasonDescription: `COD amount BDT ${Number(delivery.cod_amount).toFixed(2)} collected by driver but delivery returned. Manual settlement required.`,
      recordedByUserId,
    });
  }

  // Update order status if applicable
  if (delivery.order_id) {
    const order = await orderRepo.findByIdAndShop(delivery.order_id, delivery.shop_id);
    if (order && ['shipped', 'delivered', 'processing'].includes(order.status)) {
      await orderRepo.updateOrder(delivery.order_id, delivery.shop_id, { status: 'returned' });
    }
  }

  // Notify shop
  try {
    await notificationService.notifyDeliveryReturned({
      deliveryRequestId,
      shopId: delivery.shop_id,
      orderId: delivery.order_id,
      reason: reason || 'Returned after failed attempts',
    });
  } catch (_) { /* non-critical */ }

  return updated;
}

async function completeReturn({ deliveryRequestId, recordedByUserId }) {
  const delivery = await deliveryRequestsRepo.findById(deliveryRequestId);
  if (!delivery) throw new DomainError('NOT_FOUND', 'Delivery request not found', 404);
  if (delivery.status !== 'cancelled' || !delivery.returned_at) {
    throw new DomainError('INVALID_STATUS', 'Return must be initiated before completing', 400);
  }

  await deliveryZonesRepo.createDeliveryException({
    deliveryRequestId,
    exceptionType: 'return_completed',
    reasonCode: 'return_completed',
    reasonDescription: 'Package returned to merchant',
    recordedByUserId,
  });

  return deliveryRequestsRepo.findById(deliveryRequestId);
}

async function confirmDelivery({ deliveryRequestId, proofOfDelivery, codAmount, notes, recordedByUserId }) {
  const delivery = await deliveryRequestsRepo.findById(deliveryRequestId);
  if (!delivery) throw new DomainError('NOT_FOUND', 'Delivery request not found', 404);
  if (!['picked_up', 'in_transit'].includes(delivery.status)) {
    throw new DomainError('INVALID_STATUS', `Cannot confirm delivery for a ${delivery.status} request`, 400);
  }

  const updates = {
    status: 'delivered',
    proof_of_delivery: proofOfDelivery || null,
    collected_at: codAmount ? new Date() : delivery.collected_at,
    delivery_charge: delivery.delivery_charge || 0,
  };

  if (codAmount !== undefined) {
    updates.cod_amount = codAmount;
  }

  // Optimistic lock: only update if status hasn't changed since we read it
  const updated = await deliveryRequestsRepo.updateDeliveryRequestConditional(
    deliveryRequestId, delivery.status, updates
  );
  if (!updated) {
    throw new DomainError('CONFLICT', 'Delivery was modified by another operation. Please retry.', 409);
  }

  // Update order to delivered if applicable
  if (delivery.order_id) {
    const order = await orderRepo.findByIdAndShop(delivery.order_id, delivery.shop_id);
    if (order && ['shipped', 'processing'].includes(order.status)) {
      await orderRepo.updateOrder(delivery.order_id, delivery.shop_id, { status: 'delivered' });
    }
  }

  // Log successful delivery
  await deliveryZonesRepo.createDeliveryException({
    deliveryRequestId,
    exceptionType: 'delivered',
    reasonDescription: notes || 'Delivery confirmed',
    recordedByUserId,
  });

  return updated;
}

async function rescheduleDelivery({ deliveryRequestId, newDate, newTimeSlot, notes, recordedByUserId }) {
  const delivery = await deliveryRequestsRepo.findById(deliveryRequestId);
  if (!delivery) throw new DomainError('NOT_FOUND', 'Delivery request not found', 404);
  if (!['pending', 'assigned', 'failed'].includes(delivery.status)) {
    throw new DomainError('INVALID_STATUS', 'Cannot reschedule a delivery that is in transit or delivered', 400);
  }

  const updates = {
    scheduled_date: newDate,
    scheduled_time_slot: newTimeSlot || delivery.scheduled_time_slot,
  };

  if (delivery.status === 'failed') {
    updates.status = 'assigned';
    updates.attempt_count = 0;
    updates.failure_reason = null;
    updates.failure_code = null;
  }

  // Optimistic lock: only update if status hasn't changed since we read it
  const updated = await deliveryRequestsRepo.updateDeliveryRequestConditional(
    deliveryRequestId, delivery.status, updates
  );
  if (!updated) {
    throw new DomainError('CONFLICT', 'Delivery was modified by another operation. Please retry.', 409);
  }

  if (notes) {
    await deliveryZonesRepo.createDeliveryException({
      deliveryRequestId,
      exceptionType: 'rescheduled',
      reasonDescription: notes,
      recordedByUserId,
    });
  }

  return updated;
}

async function getDeliveryExceptions(deliveryRequestId) {
  return deliveryZonesRepo.listDeliveryExceptions(deliveryRequestId);
}

module.exports = {
  recordFailedAttempt,
  initiateReturn,
  completeReturn,
  confirmDelivery,
  rescheduleDelivery,
  getDeliveryExceptions,
  FAILURE_CODES,
  MAX_ATTEMPTS,
};
