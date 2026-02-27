const { orders, orderItems, products, createId } = require('../store');

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

    return {
      id: createId('item'),
      shop_id: shopId,
      product_id: product.id,
      item_name: product.name,
      quantity,
      unit_price: unitPrice,
      line_total: Number((quantity * unitPrice).toFixed(2)),
    };
  });

  const totals = calculateTotals(resolvedItems);

  const order = {
    id: createId('ord'),
    shop_id: shopId,
    customer_email,
    status: 'pending',
    ...totals,
    created_at: new Date().toISOString(),
  };

  orders.push(order);
  resolvedItems.forEach((item) => orderItems.push({ ...item, order_id: order.id }));

  return {
    ...order,
    items: resolvedItems,
  };
}

function listOrdersByShop(shopId) {
  return orders
    .filter((order) => order.shop_id === shopId)
    .map((order) => ({
      ...order,
      items: orderItems.filter((item) => item.order_id === order.id),
    }));
}

module.exports = { createOrder, listOrdersByShop };
