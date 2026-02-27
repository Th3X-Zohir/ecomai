const test = require('node:test');
const assert = require('node:assert/strict');
const productService = require('../src/services/products');
const variantService = require('../src/services/product-variants');

test('product variant service supports create/list/update/delete', () => {
  const product = productService.createProduct({
    shopId: 'shop_1',
    name: 'Signature Beans',
    slug: `signature-beans-${Date.now()}`,
    base_price: 10,
  });

  const created = variantService.createVariant({
    shopId: 'shop_1',
    productId: product.id,
    sku: `BEAN-500-${Date.now()}`,
    title: '500g Pack',
    price: 12,
    inventory_qty: 20,
    attributes: { size: '500g' },
  });

  assert.equal(created.product_id, product.id);
  assert.equal(created.inventory_qty, 20);

  const listed = variantService.listVariants('shop_1', product.id);
  assert.equal(listed.length >= 1, true);

  const updated = variantService.updateVariant({
    shopId: 'shop_1',
    variantId: created.id,
    patch: { inventory_qty: 15, price: 11.5 },
  });
  assert.equal(updated.inventory_qty, 15);
  assert.equal(updated.price, 11.5);

  const deleted = variantService.deleteVariant('shop_1', created.id);
  assert.equal(deleted.success, true);
});
