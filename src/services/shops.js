const shopRepo = require('../repositories/shops');
const { DomainError } = require('../errors/domain-error');

function listShops() {
  return shopRepo.listShops();
}

function getShop(shopId) {
  const shop = shopRepo.findById(shopId);
  if (!shop) {
    throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  }
  return shop;
}

function createShop({ name, slug, status, industry, subscription_plan }) {
  if (!name || !slug) {
    throw new DomainError('VALIDATION_ERROR', 'name and slug are required', 400);
  }
  if (shopRepo.findBySlug(slug)) {
    throw new DomainError('DUPLICATE_SLUG', 'shop slug already exists', 409);
  }
  return shopRepo.createShop({ name, slug, status, industry, subscription_plan });
}

function updateShop(shopId, patch) {
  const shop = getShop(shopId);

  if (patch.slug && patch.slug !== shop.slug) {
    const existing = shopRepo.findBySlug(patch.slug);
    if (existing) {
      throw new DomainError('DUPLICATE_SLUG', 'shop slug already exists', 409);
    }
  }

  return shopRepo.updateShop(shop, patch);
}

module.exports = { listShops, getShop, createShop, updateShop };
