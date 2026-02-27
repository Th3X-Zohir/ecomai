const test = require('node:test');
const assert = require('node:assert/strict');
const productService = require('../src/services/products');
const orderService = require('../src/services/orders');

const shopId = 'shop_1';

test('createOrder computes totals using tenant-scoped products', () => {
  const product = productService.createProduct({
    shopId,
    name: 'Espresso Beans',
    slug: `espresso-beans-${Date.now()}`,
    base_price: 12.5,
  });

  const order = orderService.createOrder({
    shopId,
    customer_email: 'buyer@example.com',
    items: [{ product_id: product.id, quantity: 2 }],
  });

  assert.equal(order.shop_id, shopId);
  assert.equal(order.total_amount, 25);
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].quantity, 2);
});
