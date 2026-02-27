const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId } = require('./helpers/setup');
const productService = require('../src/services/products');
const variantService = require('../src/services/product-variants');
const orderService = require('../src/services/orders');
const paymentService = require('../src/services/payments');

describe('payment service', () => {
  before(setup);
  after(teardown);

  let orderId, paymentId;

  it('creates a manual payment for order', async () => {
    const product = await productService.createProduct({
      shopId, name: 'Payment Beans', slug: `pay-beans-${Date.now()}`, base_price: 20,
    });
    const variant = await variantService.createVariant({
      shopId, productId: product.id,
      sku: `PAY-${Date.now()}`, title: 'Default', price: 20, inventory_qty: 50,
    });
    const order = await orderService.createOrder({
      shopId, customer_email: 'pay@example.com',
      items: [{ product_id: product.id, variant_id: variant.id, quantity: 1 }],
    });
    orderId = order.id;

    const payment = await paymentService.createManualPayment({
      shopId, orderId, amount: 20, method: 'cash', currency: 'BDT',
    });
    assert.ok(payment.id);
    assert.equal(payment.order_id, orderId);
    assert.equal(Number(payment.amount), 20);
    paymentId = payment.id;
  });

  it('creates a refund', async () => {
    const refund = await paymentService.createRefund({
      shopId, paymentId, amount: 5, reason: 'partial refund',
    });
    assert.ok(refund.id);
    assert.equal(refund.payment_id, paymentId);
    assert.equal(Number(refund.amount), 5);
  });
});