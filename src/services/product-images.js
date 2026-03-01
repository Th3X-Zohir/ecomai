const imageRepo = require('../repositories/product-images');
const productRepo = require('../repositories/products');
const engine = require('./subscription-engine');
const { DomainError } = require('../errors/domain-error');

async function listImages(productId, shopId) {
  // Verify product belongs to shop
  const product = await productRepo.findByIdAndShop(productId, shopId);
  if (!product) throw new DomainError('NOT_FOUND', 'Product not found', 404);
  return imageRepo.listByProduct(productId, shopId);
}

async function addImage(productId, shopId, imageData) {
  const product = await productRepo.findByIdAndShop(productId, shopId);
  if (!product) throw new DomainError('NOT_FOUND', 'Product not found', 404);

  // Check dynamic image limit from plan
  const existing = await imageRepo.listByProduct(productId, shopId);
  const { plan } = await engine.resolveShopPlan(shopId);
  const imageLimit = plan.image_limit_per_product === -1 ? Infinity : (plan.image_limit_per_product || 10);
  if (existing.length >= imageLimit) {
    throw new DomainError('LIMIT_EXCEEDED', `Maximum ${imageLimit} images per product on your ${plan.name} plan`, 400);
  }

  // First image is automatically primary
  const isPrimary = existing.length === 0 ? true : (imageData.is_primary || false);

  return imageRepo.create(shopId, productId, {
    url: imageData.url,
    alt_text: imageData.alt_text,
    sort_order: imageData.sort_order ?? existing.length,
    is_primary: isPrimary,
  });
}

async function setPrimary(imageId, productId, shopId) {
  const result = await imageRepo.setPrimary(imageId, productId, shopId);
  if (!result) throw new DomainError('NOT_FOUND', 'Image not found', 404);
  return result;
}

async function removeImage(imageId, shopId) {
  const result = await imageRepo.remove(imageId, shopId);
  if (!result) throw new DomainError('NOT_FOUND', 'Image not found', 404);
  return result;
}

module.exports = { listImages, addImage, setPrimary, removeImage };
