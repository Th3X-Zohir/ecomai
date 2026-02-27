const test = require('node:test');
const assert = require('node:assert/strict');
const productService = require('../src/services/products');
const orderService = require('../src/services/orders');

test('order service supports get/update status/cancel', () => {
  const product = productService.createProduct({
    shopId: 'shop_1',
    name: 'Drip Coffee Pack',
    slug: `drip-pack-${Date.now()}`,
    base_price: 5,
  });

  const order = orderService.createOrder({
    shopId: 'shop_1',
    customer_email: 'buyer2@example.com',
    items: [{ product_id: product.id, quantity: 1 }],
  });

  const fetched = orderService.getOrderById('shop_1', order.id);
  assert.equal(fetched.id, order.id);
  assert.equal(fetched.items.length, 1);

  const confirmed = orderService.updateOrderStatus({
    shopId: 'shop_1',
    orderId: order.id,
    status: 'confirmed',
  });
  assert.equal(confirmed.status, 'confirmed');

  const cancelled = orderService.cancelOrder({
    shopId: 'shop_1',
    orderId: order.id,
  });
  assert.equal(cancelled.status, 'cancelled');
});
