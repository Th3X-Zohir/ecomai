const { orders, orderItems, createId } = require('../store');

function createOrder({ shop_id, customer_email, status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount }) {
  const order = {
    id: createId('ord'),
    shop_id,
    customer_email,
    status,
    subtotal,
    tax_amount,
    shipping_amount,
    discount_amount,
    total_amount,
    created_at: new Date().toISOString(),
  };

  orders.push(order);
  return order;
}

function addOrderItems(items) {
  items.forEach((entry) => {
    orderItems.push({
      ...entry,
      id: createId('item'),
      created_at: new Date().toISOString(),
    });
  });
}

function listByShop(shopId) {
  return orders.filter((entry) => entry.shop_id === shopId);
}

function findByIdAndShop(id, shopId) {
  return orders.find((entry) => entry.id === id && entry.shop_id === shopId);
}

function listItemsByOrder(orderId) {
  return orderItems.filter((entry) => entry.order_id === orderId);
}

module.exports = { createOrder, addOrderItems, listByShop, findByIdAndShop, listItemsByOrder };
