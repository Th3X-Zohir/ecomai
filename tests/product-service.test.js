const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId } = require('./helpers/setup');
const productService = require('../src/services/products');

describe('product service', () => {
  before(setup);
  after(teardown);

  let productId;

  it('creates a product', async () => {
    const product = await productService.createProduct({
      shopId,
      name: 'Cold Brew Bottle',
      slug: `cold-brew-${Date.now()}`,
      base_price: 8.75,
      description: 'Ready-to-drink',
    });
    assert.ok(product.id);
    assert.equal(product.name, 'Cold Brew Bottle');
    productId = product.id;
  });

  it('gets product by id', async () => {
    const fetched = await productService.getProduct(shopId, productId);
    assert.equal(fetched.id, productId);
  });

  it('updates a product', async () => {
    const updated = await productService.updateProduct(shopId, productId, { base_price: 9.25, description: 'Updated desc' });
    assert.equal(Number(updated.base_price), 9.25);
    assert.equal(updated.description, 'Updated desc');
  });

  it('lists products for shop', async () => {
    const result = await productService.listProducts(shopId, { page: 1, limit: 10 });
    assert.ok(Array.isArray(result.items));
    assert.ok(result.total >= 1);
  });
});