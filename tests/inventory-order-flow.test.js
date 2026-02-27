const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId } = require('./helpers/setup');
const productService = require('../src/services/products');
const variantService = require('../src/services/product-variants');
const orderService = require('../src/services/orders');
const inventoryService = require('../src/services/inventory-movements');

describe('inventory order flow', () => {
  before(setup);
  after(teardown);

  it('order decrements inventory and creates movement', async () => {
    const product = await productService.createProduct({
      shopId, name: 'Stock Product', slug: `stock-${Date.now()}`, base_price: 9,
    });
    const variant = await variantService.createVariant({
      shopId, productId: product.id,
      sku: `STK-${Date.now()}`, title: '1kg', price: 11, inventory_qty: 6,
    });

    await orderService.createOrder({
      shopId, customer_email: 'stock@example.com',
      items: [{ product_id: product.id, variant_id: variant.id, quantity: 2 }],
    });

    const updated = await variantService.getVariant(shopId, variant.id);
    assert.equal(updated.inventory_qty, 4);

    const movements = await inventoryService.listByVariant(variant.id);
    assert.ok(movements.items.length >= 1);
  });
});