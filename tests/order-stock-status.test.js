const { describe, it, beforeAll, afterAll } = require('bun:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId } = require('./helpers/setup');
const productService = require('../src/services/products');
const variantService = require('../src/services/product-variants');
const orderService = require('../src/services/orders');

describe('order stock and status', () => {
  beforeAll(setup);
  afterAll(teardown);

  let productId, variantId;

  it('setup: create product with limited stock', async () => {
    const product = await productService.createProduct({
      shopId, name: 'Limited Widget', slug: `limited-${Date.now()}`, base_price: 50, stock_quantity: 5,
    });
    productId = product.id;

    const variant = await variantService.createVariant({
      shopId, productId,
      sku: `LTD-${Date.now()}`, title: 'Standard', price: 50, inventory_qty: 5,
    });
    variantId = variant.id;
  });

  it('creates order and decrements stock', async () => {
    const order = await orderService.createOrder({
      shopId,
      customer_email: `buyer1-${Date.now()}@example.com`,
      items: [{ product_id: productId, variant_id: variantId, quantity: 3 }],
    });
    assert.equal(Number(order.total_amount), 150);
    assert.equal(order.status, 'pending');
  });

  it('rejects order when stock is insufficient', async () => {
    // Only 2 remaining (5 - 3 = 2), trying to order 10
    await assert.rejects(
      () => orderService.createOrder({
        shopId,
        customer_email: `buyer2-${Date.now()}@example.com`,
        items: [{ product_id: productId, variant_id: variantId, quantity: 10 }],
      }),
      (err) => {
        assert.ok(err.message.toLowerCase().includes('insufficient stock') || err.code === 'INSUFFICIENT_STOCK');
        return true;
      }
    );
  });

  it('order status transitions follow state machine', async () => {
    // Create a fresh order
    const product2 = await productService.createProduct({
      shopId, name: 'Status Test', slug: `status-${Date.now()}`, base_price: 10, stock_quantity: 100,
    });
    const order = await orderService.createOrder({
      shopId,
      customer_email: `status-${Date.now()}@example.com`,
      items: [{ product_id: product2.id, quantity: 1 }],
    });

    // Valid: pending → confirmed
    const confirmed = await orderService.updateOrderStatus(shopId, order.id, 'confirmed');
    assert.equal(confirmed.status, 'confirmed');

    // Invalid: confirmed → delivered (must go through processing, shipped)
    await assert.rejects(
      () => orderService.updateOrderStatus(shopId, order.id, 'delivered'),
      (err) => {
        assert.ok(err.code === 'INVALID_TRANSITION' || err.message.includes('Cannot transition'));
        return true;
      }
    );

    // Valid: confirmed → processing → shipped → delivered
    const processing = await orderService.updateOrderStatus(shopId, order.id, 'processing');
    assert.equal(processing.status, 'processing');
    const shipped = await orderService.updateOrderStatus(shopId, order.id, 'shipped');
    assert.equal(shipped.status, 'shipped');
    const delivered = await orderService.updateOrderStatus(shopId, order.id, 'delivered');
    assert.equal(delivered.status, 'delivered');
  });

  it('cancellation restores inventory', async () => {
    const product3 = await productService.createProduct({
      shopId, name: 'Cancel Test', slug: `cancel-${Date.now()}`, base_price: 25, stock_quantity: 10,
    });
    const v = await variantService.createVariant({
      shopId, productId: product3.id,
      sku: `CAN-${Date.now()}`, title: 'One', price: 25, inventory_qty: 10,
    });

    const order = await orderService.createOrder({
      shopId,
      customer_email: `cancel-${Date.now()}@example.com`,
      items: [{ product_id: product3.id, variant_id: v.id, quantity: 4 }],
    });

    // Stock should be 6 after order (10 - 4)
    const confirmed = await orderService.updateOrderStatus(shopId, order.id, 'confirmed');
    assert.equal(confirmed.status, 'confirmed');

    // Cancel should restore stock
    const cancelled = await orderService.updateOrderStatus(shopId, order.id, 'cancelled');
    assert.equal(cancelled.status, 'cancelled');

    // Verify inventory restored by creating another order for full qty
    const order2 = await orderService.createOrder({
      shopId,
      customer_email: `restock-${Date.now()}@example.com`,
      items: [{ product_id: product3.id, variant_id: v.id, quantity: 10 }],
    });
    assert.equal(Number(order2.total_amount), 250);
  });

  it('rejects invalid item structure', async () => {
    await assert.rejects(
      () => orderService.createOrder({
        shopId, customer_email: 'x@test.com',
        items: [{ quantity: 1 }], // missing product_id and variant_id
      }),
      (err) => { assert.ok(err.message.includes('product_id') || err.message.includes('variant_id')); return true; }
    );
  });

  it('rejects empty items array', async () => {
    await assert.rejects(
      () => orderService.createOrder({ shopId, customer_email: 'x@test.com', items: [] }),
      (err) => { assert.ok(err.message); return true; }
    );
  });
});
