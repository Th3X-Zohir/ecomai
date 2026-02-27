const deliveryRepo = require('../repositories/delivery-requests');
const { ensureOrderExists } = require('./orders');
const { DomainError } = require('../errors/domain-error');

const ALLOWED_STATUSES = ['requested', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];

function createDeliveryRequest({ shopId, orderId, provider, pickup_address, dropoff_address }) {
  if (!pickup_address || !dropoff_address) {
    throw new DomainError('VALIDATION_ERROR', 'pickup_address and dropoff_address are required', 400);
  }

  ensureOrderExists(shopId, orderId);

  const existing = deliveryRepo.findByOrderAndShop(orderId, shopId);
  if (existing) {
    throw new DomainError('DELIVERY_ALREADY_EXISTS', 'delivery request already exists for this order', 409);
  }

  return deliveryRepo.createDeliveryRequest({
    shopId,
    orderId,
    provider,
    pickup_address,
    dropoff_address,
  });
}

function listDeliveryRequests(shopId) {
  return deliveryRepo.listByShop(shopId);
}

function updateDeliveryStatus({ shopId, deliveryRequestId, status }) {
  const request = deliveryRepo.findByIdAndShop(deliveryRequestId, shopId);
  if (!request) {
    throw new DomainError('DELIVERY_NOT_FOUND', 'delivery request not found', 404);
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new DomainError('INVALID_STATUS', `status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  request.status = status;
  request.updated_at = new Date().toISOString();
  if (status === 'delivered') {
    request.delivered_at = request.updated_at;
  }

  return request;
}

module.exports = { createDeliveryRequest, listDeliveryRequests, updateDeliveryStatus };
