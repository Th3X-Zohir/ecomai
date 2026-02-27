const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId } = require('./helpers/setup');
const productService = require('../src/services/products');
const variantService = require('../src/services/product-variants');
const orderService = require('../src/services/orders');

describe('order service', () => {
  before(setup);
  after(teardown);

  let productId, variantId;

  it('creates order with computed totals', async () => {
    const product = await productService.createProduct({
      shopId, name: 'Espresso Beans', slug: `espresso-${Date.now()}`, base_price: 12.5,
    });
    productId = product.id;

    const variant = await variantService.createVariant({
      shopId, productId,
      sku: `ESP-${Date.now()}`, title: 'Default', price: 12.5, inventory_qty: 100,
    });
    variantId = variant.id;

    const order = await orderService.createOrder({
      shopId,
      customer_email: `buyer-${Date.now()}@example.com`,
      items: [{ product_id: productId, variant_id: variantId, quantity: 2 }],
    });
    assert.equal(order.shop_id, shopId);
    assert.equal(Number(order.total_amount), 25);
  });
});