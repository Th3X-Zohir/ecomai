const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId } = require('./helpers/setup');
const productService = require('../src/services/products');
const variantService = require('../src/services/product-variants');
const orderService = require('../src/services/orders');

describe('order status service', () => {
  before(setup);
  after(teardown);

  let orderId;

  it('creates order and updates status', async () => {
    const product = await productService.createProduct({
      shopId, name: 'Drip Pack', slug: `drip-${Date.now()}`, base_price: 5,
    });
    const variant = await variantService.createVariant({
      shopId, productId: product.id,
      sku: `DRP-${Date.now()}`, title: 'Default', price: 5, inventory_qty: 50,
    });
    const order = await orderService.createOrder({
      shopId, customer_email: 'buyer2@example.com',
      items: [{ product_id: product.id, variant_id: variant.id, quantity: 1 }],
    });
    orderId = order.id;

    const fetched = await orderService.getOrder(shopId, orderId);
    assert.equal(fetched.id, orderId);
  });

  it('updates order status to confirmed', async () => {
    const confirmed = await orderService.updateOrderStatus(shopId, orderId, 'confirmed');
    assert.equal(confirmed.status, 'confirmed');
  });

  it('updates order status to cancelled', async () => {
    const cancelled = await orderService.updateOrderStatus(shopId, orderId, 'cancelled');
    assert.equal(cancelled.status, 'cancelled');
  });
});