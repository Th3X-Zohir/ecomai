const productRepo = require('../repositories/products');
const imageRepo = require('../repositories/product-images');
const { DomainError } = require('../errors/domain-error');
const engine = require('./subscription-engine');

async function listProducts(shopId, opts) {
  const result = await productRepo.listByShop(shopId, opts);
  const ids = result.items.map(p => p.id);
  const imgMap = await imageRepo.listByProducts(ids, shopId);
  result.items = result.items.map(p => ({ ...p, images: imgMap[p.id] || [] }));
  return result;
}

async function getProduct(shopId, productId) {
  const product = await productRepo.findByIdAndShop(productId, shopId);
  if (!product) {
    throw new DomainError('PRODUCT_NOT_FOUND', 'Product not found', 404);
  }
  const images = await imageRepo.listByProduct(productId, shopId);
  return { ...product, images };
}

async function getProductBySlug(shopId, slug) {
  const product = await productRepo.findBySlugAndShop(slug, shopId);
  if (!product) {
    throw new DomainError('PRODUCT_NOT_FOUND', 'Product not found', 404);
  }
  const images = await imageRepo.listByProduct(product.id, shopId);
  return { ...product, images };
}

async function createProduct({ shopId, name, slug, base_price, description, category, category_id, image_url, stock_quantity }) {
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
  const product = await productRepo.createProduct({
    shop_id: shopId, name, slug,
    base_price: Number(base_price),
    description: description || null,
    category: category || null,
    category_id: category_id || null,
    image_url: image_url || null,
    stock_quantity: stock_quantity != null ? Number(stock_quantity) : 0,
  });
  // Update usage counter
  await engine.incrementUsage(shopId, 'products', 1);
  return product;
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
  await productRepo.deleteProduct(productId, shopId);
  // Decrement usage counter
  if (shopId) await engine.incrementUsage(shopId, 'products', -1);
  return { success: true };
}

module.exports = { listProducts, getProduct, getProductBySlug, createProduct, updateProduct, deleteProduct };