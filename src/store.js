const crypto = require('crypto');

const shops = [
  { id: 'shop_1', name: 'Demo Coffee', slug: 'demo-coffee', status: 'active' },
  { id: 'shop_2', name: 'Demo Fashion', slug: 'demo-fashion', status: 'active' },
];

const users = [
  { id: 'user_super', email: 'super@ecomai.dev', password: 'password123', role: 'super_admin', shopId: null },
  { id: 'user_shop_admin', email: 'admin@coffee.dev', password: 'password123', role: 'shop_admin', shopId: 'shop_1' },
  { id: 'user_shop_user', email: 'staff@coffee.dev', password: 'password123', role: 'shop_user', shopId: 'shop_1' },
  { id: 'user_driver_1', email: 'driver@coffee.dev', password: 'password123', role: 'delivery_agent', shopId: 'shop_1' },
];

const refreshTokens = [];
const products = [];
const productVariants = [];
const customers = [];
const orders = [];
const orderItems = [];
const deliveryRequests = [];
const marketingCampaigns = [];
const websiteSettings = [];
const payments = [];
const refunds = [];

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

module.exports = {
  shops,
  users,
  refreshTokens,
  products,
  productVariants,
  customers,
  orders,
  orderItems,
  deliveryRequests,
  marketingCampaigns,
  websiteSettings,
  payments,
  refunds,
  createId,
};
