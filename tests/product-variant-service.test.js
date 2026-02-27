const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId } = require('./helpers/setup');
const productService = require('../src/services/products');
const variantService = require('../src/services/product-variants');

describe('product variant service', () => {
  before(setup);
  after(teardown);

  let productId, variantId;

  it('creates a variant', async () => {
    const product = await productService.createProduct({
      shopId, name: 'Beans', slug: `beans-${Date.now()}`, base_price: 10,
    });
    productId = product.id;

    const variant = await variantService.createVariant({
      shopId, productId,
      sku: `BEAN-500-${Date.now()}`, title: '500g Pack', price: 12, inventory_qty: 20,
    });
    assert.ok(variant.id);
    assert.equal(variant.product_id, productId);
    assert.equal(variant.inventory_qty, 20);
    variantId = variant.id;
  });

  it('lists variants', async () => {
    const list = await variantService.listVariants(shopId, productId);
    assert.ok(list.length >= 1);
  });

  it('updates a variant', async () => {
    const updated = await variantService.updateVariant({
      shopId, variantId,
      patch: { inventory_qty: 15, price: 11.5 },
    });
    assert.equal(updated.inventory_qty, 15);
  });

  it('deletes a variant', async () => {
    const result = await variantService.deleteVariant(shopId, variantId);
    assert.equal(result.success, true);
  });
});