const test = require('node:test');
const assert = require('node:assert/strict');
const productService = require('../src/services/products');
const orderService = require('../src/services/orders');
const paymentService = require('../src/services/payments');

test('payment service supports payment capture and refund flow', () => {
  const product = productService.createProduct({
    shopId: 'shop_1',
    name: 'Payment Beans',
    slug: `payment-beans-${Date.now()}`,
    base_price: 20,
  });

  const order = orderService.createOrder({
    shopId: 'shop_1',
    customer_email: 'pay@example.com',
    items: [{ product_id: product.id, quantity: 1 }],
  });

  const payment = paymentService.createPayment({
    shopId: 'shop_1',
    orderId: order.id,
    amount: 20,
    provider: 'stripe',
    currency: 'USD',
  });

  assert.equal(payment.order_id, order.id);
  assert.equal(payment.amount, 20);

  const refund = paymentService.createRefund({
    shopId: 'shop_1',
    paymentId: payment.id,
    amount: 5,
    reason: 'partial refund',
  });

  assert.equal(refund.payment_id, payment.id);
  assert.equal(refund.amount, 5);
});
