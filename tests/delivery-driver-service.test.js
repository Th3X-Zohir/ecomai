const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId } = require('./helpers/setup');
const productService = require('../src/services/products');
const variantService = require('../src/services/product-variants');
const orderService = require('../src/services/orders');
const deliveryService = require('../src/services/delivery-requests');

describe('delivery driver service', () => {
  before(setup);
  after(teardown);

  let orderId, deliveryId;

  it('creates delivery request for order', async () => {
    const product = await productService.createProduct({
      shopId, name: 'Night Roast', slug: `night-roast-${Date.now()}`, base_price: 14,
    });
    const variant = await variantService.createVariant({
      shopId, productId: product.id,
      sku: `NR-${Date.now()}`, title: 'Default', price: 14, inventory_qty: 50,
    });
    const order = await orderService.createOrder({
      shopId, customer_email: 'driver@example.com',
      items: [{ product_id: product.id, variant_id: variant.id, quantity: 1 }],
    });
    orderId = order.id;

    const request = await deliveryService.createDeliveryRequest({
      shopId, orderId,
      pickup_address: { city: 'Dhaka' }, delivery_address: { city: 'Chittagong' },
    });
    assert.ok(request.id);
    assert.equal(request.status, 'pending');
    deliveryId = request.id;
  });

  it('assigns driver to delivery', async () => {
    const assigned = await deliveryService.assignDriver({
      shopId, deliveryRequestId: deliveryId, driverUserId: 'driver_1',
    });
    assert.equal(assigned.status, 'assigned');
  });

  it('lists driver assignments', async () => {
    const assignments = await deliveryService.listDriverAssignments('driver_1');
    assert.ok(assignments.items.length >= 1);
  });
});