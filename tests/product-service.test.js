const test = require('node:test');
const assert = require('node:assert/strict');
const productService = require('../src/services/products');

test('product service supports detail/update/archive flow', () => {
  const product = productService.createProduct({
    shopId: 'shop_1',
    name: 'Cold Brew Bottle',
    slug: `cold-brew-${Date.now()}`,
    base_price: 8.75,
    description: 'Ready-to-drink',
  });

  const fetched = productService.getProductById('shop_1', product.id);
  assert.equal(fetched.id, product.id);

  const updated = productService.updateProduct({
    shopId: 'shop_1',
    productId: product.id,
    patch: { base_price: 9.25, description: 'Updated desc' },
  });
  assert.equal(updated.base_price, 9.25);
  assert.equal(updated.description, 'Updated desc');

  const archived = productService.archiveProduct({
    shopId: 'shop_1',
    productId: product.id,
  });
  assert.equal(archived.status, 'archived');
});
