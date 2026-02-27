const productRepo = require('../repositories/products');
const { DomainError } = require('../errors/domain-error');

function listProducts(shopId) {
  return productRepo.listByShop(shopId);
}

function createProduct({ shopId, name, slug, base_price, description }) {
  if (!name || !slug || base_price == null) {
    throw new DomainError('VALIDATION_ERROR', 'name, slug, base_price are required', 400);
  }

  if (Number(base_price) < 0) {
    throw new DomainError('VALIDATION_ERROR', 'base_price must be greater than or equal to 0', 400);
  }

  const existing = productRepo.findBySlugAndShop(slug, shopId);
  if (existing) {
    throw new DomainError('DUPLICATE_SLUG', 'slug must be unique per shop', 409);
  }

  return productRepo.createProduct({
    shop_id: shopId,
    name,
    slug,
    base_price: Number(base_price),
    description: description || null,
  });
}

module.exports = { listProducts, createProduct };
