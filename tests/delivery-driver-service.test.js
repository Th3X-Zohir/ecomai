const test = require('node:test');
const assert = require('node:assert/strict');
const productService = require('../src/services/products');
const orderService = require('../src/services/orders');
const deliveryService = require('../src/services/delivery-requests');

test('delivery service supports assign driver and driver assignment flows', () => {
  const product = productService.createProduct({
    shopId: 'shop_1',
    name: 'Night Roast',
    slug: `night-roast-${Date.now()}`,
    base_price: 14,
  });

  const order = orderService.createOrder({
    shopId: 'shop_1',
    customer_email: 'driverflow@example.com',
    items: [{ product_id: product.id, quantity: 1 }],
  });

  const request = deliveryService.createDeliveryRequest({
    shopId: 'shop_1',
    orderId: order.id,
    pickup_address: { city: 'A' },
    dropoff_address: { city: 'B' },
  });

  const assigned = deliveryService.assignDriver({
    shopId: 'shop_1',
    deliveryRequestId: request.id,
    driverUserId: 'user_driver_1',
  });
  assert.equal(assigned.status, 'assigned');

  const assignments = deliveryService.listDriverAssignments('user_driver_1');
  assert.equal(assignments.length >= 1, true);

  const withLocation = deliveryService.driverPostLocation({
    driverUserId: 'user_driver_1',
    deliveryRequestId: request.id,
    lat: 12.34,
    lng: 56.78,
  });
  assert.equal(withLocation.location_updates.length >= 1, true);

  const inTransit = deliveryService.driverUpdateStatus({
    driverUserId: 'user_driver_1',
    deliveryRequestId: request.id,
    status: 'in_transit',
  });
  assert.equal(inTransit.status, 'in_transit');
});
