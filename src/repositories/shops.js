const { shops, createId } = require('../store');

function listShops() {
  return shops;
}

function findById(shopId) {
  return shops.find((entry) => entry.id === shopId) || null;
}

function findBySlug(slug) {
  return shops.find((entry) => entry.slug === slug) || null;
}

function createShop({ name, slug, status, industry, subscription_plan }) {
  const shop = {
    id: createId('shop'),
    name,
    slug,
    status: status || 'active',
    industry: industry || null,
    subscription_plan: subscription_plan || 'starter',
  };
  shops.push(shop);
  return shop;
}

function updateShop(shop, patch) {
  const allowed = ['name', 'slug', 'status', 'industry', 'subscription_plan'];
  allowed.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      shop[k] = patch[k];
    }
  });
  return shop;
}

module.exports = { listShops, findById, findBySlug, createShop, updateShop };
