const productRepo = require('../repositories/products');
const { DomainError } = require('../errors/domain-error');

function listProducts(shopId) {
  return productRepo.listByShop(shopId);
}

function getProductById(shopId, productId) {
  const product = productRepo.findByIdAndShop(productId, shopId);
  if (!product) {
    throw new DomainError('PRODUCT_NOT_FOUND', 'Product not found', 404);
  }

  return product;
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

function updateProduct({ shopId, productId, patch }) {
  const product = getProductById(shopId, productId);

  if (patch.slug && patch.slug !== product.slug) {
    const existing = productRepo.findBySlugAndShop(patch.slug, shopId);
    if (existing) {
      throw new DomainError('DUPLICATE_SLUG', 'slug must be unique per shop', 409);
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'base_price') && Number(patch.base_price) < 0) {
    throw new DomainError('VALIDATION_ERROR', 'base_price must be greater than or equal to 0', 400);
  }

  const normalizedPatch = {
    ...patch,
    base_price: Object.prototype.hasOwnProperty.call(patch, 'base_price') ? Number(patch.base_price) : patch.base_price,
  };

  return productRepo.updateProduct(product, normalizedPatch);
}

function archiveProduct({ shopId, productId }) {
  const product = getProductById(shopId, productId);
  return productRepo.updateProduct(product, { status: 'archived' });
}

module.exports = { listProducts, getProductById, createProduct, updateProduct, archiveProduct };
