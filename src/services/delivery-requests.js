const deliveryRepo = require('../repositories/delivery-requests');
const usersRepo = require('../repositories/users');
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

function getDeliveryRequest(shopId, deliveryRequestId) {
  const request = deliveryRepo.findByIdAndShop(deliveryRequestId, shopId);
  if (!request) {
    throw new DomainError('DELIVERY_NOT_FOUND', 'delivery request not found', 404);
  }
  return request;
}

function updateDeliveryStatus({ shopId, deliveryRequestId, status }) {
  const request = getDeliveryRequest(shopId, deliveryRequestId);

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new DomainError('INVALID_STATUS', `status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  return deliveryRepo.updateRequest(request, { status });
}

function assignDriver({ shopId, deliveryRequestId, driverUserId }) {
  const request = getDeliveryRequest(shopId, deliveryRequestId);
  const driver = usersRepo.findById(driverUserId);

  if (!driver || driver.role !== 'delivery_agent' || driver.shopId !== shopId) {
    throw new DomainError('DRIVER_NOT_FOUND', 'delivery driver not found for this shop', 404);
  }

  return deliveryRepo.updateRequest(request, {
    assigned_driver_user_id: driver.id,
    status: 'assigned',
  });
}

function listDriverAssignments(driverUserId) {
  return deliveryRepo.listByDriver(driverUserId);
}

function driverUpdateStatus({ driverUserId, deliveryRequestId, status }) {
  const assignments = listDriverAssignments(driverUserId);
  const request = assignments.find((entry) => entry.id === deliveryRequestId);
  if (!request) {
    throw new DomainError('DELIVERY_NOT_FOUND', 'assignment not found', 404);
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new DomainError('INVALID_STATUS', `status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  return deliveryRepo.updateRequest(request, { status });
}

function driverPostLocation({ driverUserId, deliveryRequestId, lat, lng }) {
  if (lat == null || lng == null) {
    throw new DomainError('VALIDATION_ERROR', 'lat and lng are required', 400);
  }

  const assignments = listDriverAssignments(driverUserId);
  const request = assignments.find((entry) => entry.id === deliveryRequestId);
  if (!request) {
    throw new DomainError('DELIVERY_NOT_FOUND', 'assignment not found', 404);
  }

  return deliveryRepo.appendLocationUpdate(request, { lat: Number(lat), lng: Number(lng), by: driverUserId });
}

module.exports = {
  createDeliveryRequest,
  listDeliveryRequests,
  getDeliveryRequest,
  updateDeliveryStatus,
  assignDriver,
  listDriverAssignments,
  driverUpdateStatus,
  driverPostLocation,
};
