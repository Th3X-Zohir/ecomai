const { customers, createId } = require('../store');

function findByEmail(shopId, email) {
  return customers.find((entry) => entry.shop_id === shopId && entry.email.toLowerCase() === email.toLowerCase());
}

function createCustomer({ shopId, email, full_name, phone }) {
  const customer = {
    id: createId('cus'),
    shop_id: shopId,
    email,
    full_name: full_name || null,
    phone: phone || null,
    created_at: new Date().toISOString(),
  };

  customers.push(customer);
  return customer;
}

function listByShop(shopId) {
  return customers.filter((entry) => entry.shop_id === shopId);
}

module.exports = { findByEmail, createCustomer, listByShop };
