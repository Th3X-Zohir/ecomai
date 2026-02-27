const crypto = require('crypto');

const shops = [
  { id: 'shop_1', name: 'Demo Coffee' },
  { id: 'shop_2', name: 'Demo Fashion' },
];

const users = [
  { id: 'user_super', email: 'super@ecomai.dev', password: 'password123', role: 'super_admin', shopId: null },
  { id: 'user_shop_admin', email: 'admin@coffee.dev', password: 'password123', role: 'shop_admin', shopId: 'shop_1' },
  { id: 'user_shop_user', email: 'staff@coffee.dev', password: 'password123', role: 'shop_user', shopId: 'shop_1' },
];

const products = [];

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

module.exports = { shops, users, products, createId };
