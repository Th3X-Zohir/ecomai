const orderRepo = require('../repositories/orders');
const productRepo = require('../repositories/products');
const { DomainError } = require('../errors/domain-error');

const ORDER_STATUSES = ['pending', 'confirmed', 'fulfilled', 'cancelled'];

function calculateTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.line_total), 0);
  return {
    subtotal,
    tax_amount: 0,
    shipping_amount: 0,
    discount_amount: 0,
    total_amount: subtotal,
  };
}

function createOrder({ shopId, customer_email, items }) {
  if (!customer_email || !Array.isArray(items) || items.length === 0) {
    throw new DomainError('VALIDATION_ERROR', 'customer_email and non-empty items are required', 400);
  }

  const resolvedItems = items.map((item) => {
    const product = productRepo.findByIdAndShop(item.product_id, shopId);

    if (!product) {
      throw new DomainError('PRODUCT_NOT_FOUND', `Unknown product for tenant scope: ${item.product_id}`, 400);
    }

    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(product.base_price);

    if (quantity <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'quantity must be greater than 0', 400);
    }

    return {
      shop_id: shopId,
      product_id: product.id,
      item_name: product.name,
      quantity,
      unit_price: unitPrice,
      line_total: Number((quantity * unitPrice).toFixed(2)),
    };
  });

  const totals = calculateTotals(resolvedItems);

  const order = orderRepo.createOrder({
    shop_id: shopId,
    customer_email,
    status: 'pending',
    ...totals,
  });

  orderRepo.addOrderItems(resolvedItems.map((item) => ({ ...item, order_id: order.id })));

  return {
    ...order,
    items: orderRepo.listItemsByOrder(order.id),
  };
}

function listOrdersByShop(shopId) {
  return orderRepo.listByShop(shopId).map((order) => ({
    ...order,
    items: orderRepo.listItemsByOrder(order.id),
  }));
}

function ensureOrderExists(shopId, orderId) {
  const order = orderRepo.findByIdAndShop(orderId, shopId);
  if (!order) {
    throw new DomainError('ORDER_NOT_FOUND', 'Order not found', 404);
  }

  return order;
}

function getOrderById(shopId, orderId) {
  const order = ensureOrderExists(shopId, orderId);
  return {
    ...order,
    items: orderRepo.listItemsByOrder(order.id),
  };
}

function updateOrderStatus({ shopId, orderId, status }) {
  if (!status || !ORDER_STATUSES.includes(status)) {
    throw new DomainError('VALIDATION_ERROR', `status must be one of: ${ORDER_STATUSES.join(', ')}`, 400);
  }

  const order = ensureOrderExists(shopId, orderId);

  if (order.status === 'cancelled') {
    throw new DomainError('INVALID_TRANSITION', 'Cannot update a cancelled order', 409);
  }

  return orderRepo.updateOrder(order, { status });
}

function cancelOrder({ shopId, orderId }) {
  const order = ensureOrderExists(shopId, orderId);
  if (order.status === 'fulfilled') {
    throw new DomainError('INVALID_TRANSITION', 'Cannot cancel a fulfilled order', 409);
  }

  return orderRepo.updateOrder(order, { status: 'cancelled' });
}

module.exports = { createOrder, listOrdersByShop, ensureOrderExists, getOrderById, updateOrderStatus, cancelOrder };
