const productRepo = require('../repositories/products');
const { DomainError } = require('../errors/domain-error');

async function listProducts(shopId, opts) {
  return productRepo.listByShop(shopId, opts);
}

async function getProduct(shopId, productId) {
  const product = await productRepo.findByIdAndShop(productId, shopId);
  if (!product) {
    throw new DomainError('PRODUCT_NOT_FOUND', 'Product not found', 404);
  }
  return product;
}

async function getProductBySlug(shopId, slug) {
  const product = await productRepo.findBySlugAndShop(slug, shopId);
  if (!product) {
    throw new DomainError('PRODUCT_NOT_FOUND', 'Product not found', 404);
  }
  return product;
}

async function createProduct({ shopId, name, slug, base_price, description, category, image_url, stock_quantity }) {
  if (!name || !slug || base_price == null) {
    throw new DomainError('VALIDATION_ERROR', 'name, slug, base_price are required', 400);
  }
  if (Number(base_price) < 0) {
    throw new DomainError('VALIDATION_ERROR', 'base_price must be greater than or equal to 0', 400);
  }
  const existing = await productRepo.findBySlugAndShop(slug, shopId);
  if (existing) {
    throw new DomainError('DUPLICATE_SLUG', 'slug must be unique per shop', 409);
  }
  return productRepo.createProduct({
    shop_id: shopId, name, slug,
    base_price: Number(base_price),
    description: description || null,
    category: category || null,
    image_url: image_url || null,
    stock_quantity: stock_quantity != null ? Number(stock_quantity) : 0,
  });
}

async function updateProduct(shopId, productId, patch) {
  const product = await getProduct(shopId, productId);
  if (patch.slug && patch.slug !== product.slug) {
    const existing = await productRepo.findBySlugAndShop(patch.slug, shopId);
    if (existing) {
      throw new DomainError('DUPLICATE_SLUG', 'slug must be unique per shop', 409);
    }
  }
  if (patch.base_price != null && Number(patch.base_price) < 0) {
    throw new DomainError('VALIDATION_ERROR', 'base_price must be >= 0', 400);
  }
  return productRepo.updateProduct(productId, shopId, patch);
}

async function deleteProduct(shopId, productId) {
  await getProduct(shopId, productId);
  await productRepo.deleteProduct(productId);
  return { success: true };
}

module.exports = { listProducts, getProduct, getProductBySlug, createProduct, updateProduct, deleteProduct };