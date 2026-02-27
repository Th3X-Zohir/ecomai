const test = require('node:test');
const assert = require('node:assert/strict');
const productService = require('../src/services/products');
const variantService = require('../src/services/product-variants');
const orderService = require('../src/services/orders');
const inventoryService = require('../src/services/inventory-movements');

test('order with product_variant_id decrements inventory and records movement', () => {
  const product = productService.createProduct({
    shopId: 'shop_1',
    name: 'Variant Stock Product',
    slug: `variant-stock-${Date.now()}`,
    base_price: 9,
  });

  const variant = variantService.createVariant({
    shopId: 'shop_1',
    productId: product.id,
    sku: `VAR-STOCK-${Date.now()}`,
    title: '1kg',
    price: 11,
    inventory_qty: 6,
  });

  const order = orderService.createOrder({
    shopId: 'shop_1',
    customer_email: 'stock@example.com',
    items: [{ product_id: product.id, product_variant_id: variant.id, quantity: 2 }],
  });

  assert.equal(order.items[0].product_variant_id, variant.id);

  const updatedVariant = variantService.getVariant('shop_1', variant.id);
  assert.equal(updatedVariant.inventory_qty, 4);

  const movements = inventoryService.listMovements('shop_1', variant.id);
  assert.equal(movements.length >= 1, true);
  assert.equal(movements[movements.length - 1].quantity_delta, -2);
});
