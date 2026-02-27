const deliveryRepo = require('../repositories/delivery-requests');
const orderRepo = require('../repositories/orders');
const { DomainError } = require('../errors/domain-error');

const ALLOWED_STATUSES = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];

async function createDeliveryRequest({ shopId, orderId, pickup_address, delivery_address, notes }) {
  if (!pickup_address || !delivery_address) {
    throw new DomainError('VALIDATION_ERROR', 'pickup_address and delivery_address are required', 400);
  }
  const order = await orderRepo.findById(orderId);
  if (!order || order.shop_id !== shopId) {
    throw new DomainError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  const existing = await deliveryRepo.findByOrderAndShop(orderId, shopId);
  if (existing) {
    throw new DomainError('DELIVERY_ALREADY_EXISTS', 'delivery request already exists for this order', 409);
  }
  return deliveryRepo.createDeliveryRequest({
    order_id: orderId, shop_id: shopId, pickup_address, delivery_address, notes,
  });
}

async function listDeliveryRequests(shopId, opts) {
  return deliveryRepo.listByShop(shopId, opts);
}

async function updateDeliveryStatus({ shopId, deliveryRequestId, status }) {
  const request = await deliveryRepo.findByIdAndShop(deliveryRequestId, shopId);
  if (!request) throw new DomainError('DELIVERY_NOT_FOUND', 'delivery request not found', 404);
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new DomainError('INVALID_STATUS', `status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }
  return deliveryRepo.updateDeliveryRequest(deliveryRequestId, { status });
}

async function assignDriver({ shopId, deliveryRequestId, driverUserId }) {
  const request = await deliveryRepo.findByIdAndShop(deliveryRequestId, shopId);
  if (!request) throw new DomainError('DELIVERY_NOT_FOUND', 'delivery request not found', 404);
  return deliveryRepo.updateDeliveryRequest(deliveryRequestId, {
    assigned_driver_user_id: driverUserId, status: 'assigned',
  });
}

// Driver-specific functions
async function listDriverAssignments(driverUserId, opts) {
  return deliveryRepo.listByDriver(driverUserId, opts);
}

async function driverPostLocation({ driverUserId, deliveryRequestId, lat, lng }) {
  const request = await deliveryRepo.findById(deliveryRequestId);
  if (!request || request.assigned_driver_user_id !== driverUserId) {
    throw new DomainError('DELIVERY_NOT_FOUND', 'delivery request not found or not assigned to you', 404);
  }
  const updates = request.location_updates || [];
  updates.push({ lat, lng, updated_at: new Date().toISOString() });
  return deliveryRepo.updateDeliveryRequest(deliveryRequestId, { location_updates: updates });
}

async function driverUpdateStatus({ driverUserId, deliveryRequestId, status }) {
  const request = await deliveryRepo.findById(deliveryRequestId);
  if (!request || request.assigned_driver_user_id !== driverUserId) {
    throw new DomainError('DELIVERY_NOT_FOUND', 'delivery request not found or not assigned to you', 404);
  }
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new DomainError('INVALID_STATUS', `status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }
  return deliveryRepo.updateDeliveryRequest(deliveryRequestId, { status });
}

module.exports = {
  createDeliveryRequest, listDeliveryRequests, updateDeliveryStatus, assignDriver,
  listDriverAssignments, driverPostLocation, driverUpdateStatus,
};