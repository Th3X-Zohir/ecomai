const imageRepo = require('../repositories/product-images');
const productRepo = require('../repositories/products');
const DomainError = require('../errors/domain-error');

async function listImages(productId, shopId) {
  // Verify product belongs to shop
  const product = await productRepo.findByIdAndShop(productId, shopId);
  if (!product) throw new DomainError('NOT_FOUND', 'Product not found', 404);
  return imageRepo.listByProduct(productId, shopId);
}

async function addImage(productId, shopId, imageData) {
  const product = await productRepo.findByIdAndShop(productId, shopId);
  if (!product) throw new DomainError('NOT_FOUND', 'Product not found', 404);

  // Check limit (max 10 images per product)
  const existing = await imageRepo.listByProduct(productId, shopId);
  if (existing.length >= 10) {
    throw new DomainError('LIMIT_EXCEEDED', 'Maximum 10 images per product', 400);
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
