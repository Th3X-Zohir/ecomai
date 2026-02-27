const { deliveryRequests, createId } = require('../store');

function createDeliveryRequest({ shopId, orderId, provider, pickup_address, dropoff_address }) {
  const now = new Date().toISOString();
  const request = {
    id: createId('del'),
    shop_id: shopId,
    order_id: orderId,
    provider: provider || 'internal',
    assigned_driver_user_id: null,
    status: 'requested',
    pickup_address,
    dropoff_address,
    location_updates: [],
    created_at: now,
    updated_at: now,
  };

  deliveryRequests.push(request);
  return request;
}

function listByShop(shopId) {
  return deliveryRequests.filter((entry) => entry.shop_id === shopId);
}

function findByIdAndShop(id, shopId) {
  return deliveryRequests.find((entry) => entry.id === id && entry.shop_id === shopId) || null;
}

function findByOrderAndShop(orderId, shopId) {
  return deliveryRequests.find((entry) => entry.order_id === orderId && entry.shop_id === shopId) || null;
}

function updateRequest(request, patch) {
  const allowed = ['status', 'assigned_driver_user_id', 'provider'];
  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      request[key] = patch[key];
    }
  });
  request.updated_at = new Date().toISOString();
  if (request.status === 'delivered') {
    request.delivered_at = request.updated_at;
  }
  return request;
}

function appendLocationUpdate(request, location) {
  request.location_updates.push({ ...location, created_at: new Date().toISOString() });
  request.updated_at = new Date().toISOString();
  return request;
}

function listByDriver(driverUserId) {
  return deliveryRequests.filter((entry) => entry.assigned_driver_user_id === driverUserId);
}

module.exports = {
  createDeliveryRequest,
  listByShop,
  findByIdAndShop,
  findByOrderAndShop,
  updateRequest,
  appendLocationUpdate,
  listByDriver,
};
