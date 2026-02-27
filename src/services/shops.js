const shopRepo = require('../repositories/shops');
const { DomainError } = require('../errors/domain-error');

async function listShops(opts) {
  return shopRepo.listShops(opts);
}

async function getShop(shopId) {
  const shop = await shopRepo.findById(shopId);
  if (!shop) {
    throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  }
  return shop;
}

async function getShopBySlug(slug) {
  const shop = await shopRepo.findBySlug(slug);
  if (!shop) {
    throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  }
  return shop;
}

async function createShop({ name, slug, status, industry, subscription_plan, owner_id }) {
  if (!name || !slug) {
    throw new DomainError('VALIDATION_ERROR', 'name and slug are required', 400);
  }
  const existing = await shopRepo.findBySlug(slug);
  if (existing) {
    throw new DomainError('DUPLICATE_SLUG', 'shop slug already exists', 409);
  }
  return shopRepo.createShop({ name, slug, status, industry, subscription_plan, owner_id });
}

async function updateShop(shopId, patch) {
  const shop = await getShop(shopId);
  if (patch.slug && patch.slug !== shop.slug) {
    const existing = await shopRepo.findBySlug(patch.slug);
    if (existing) {
      throw new DomainError('DUPLICATE_SLUG', 'shop slug already exists', 409);
    }
  }
  return shopRepo.updateShop(shopId, patch);
}

module.exports = { listShops, getShop, getShopBySlug, createShop, updateShop };