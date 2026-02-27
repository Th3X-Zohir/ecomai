const { deliveryRequests, createId } = require('../store');

function createDeliveryRequest({ shopId, orderId, provider, pickup_address, dropoff_address }) {
  const request = {
    id: createId('del'),
    shop_id: shopId,
    order_id: orderId,
    provider: provider || 'internal',
    status: 'requested',
    pickup_address,
    dropoff_address,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  deliveryRequests.push(request);
  return request;
}

function listByShop(shopId) {
  return deliveryRequests.filter((entry) => entry.shop_id === shopId);
}

function findByIdAndShop(id, shopId) {
  return deliveryRequests.find((entry) => entry.id === id && entry.shop_id === shopId);
}

function findByOrderAndShop(orderId, shopId) {
  return deliveryRequests.find((entry) => entry.order_id === orderId && entry.shop_id === shopId);
}

module.exports = { createDeliveryRequest, listByShop, findByIdAndShop, findByOrderAndShop };
