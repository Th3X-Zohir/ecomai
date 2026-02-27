const productRepo = require('../repositories/products');
const variantRepo = require('../repositories/product-variants');
const { DomainError } = require('../errors/domain-error');

async function ensureProduct(shopId, productId) {
  const product = await productRepo.findByIdAndShop(productId, shopId);
  if (!product) {
    throw new DomainError('PRODUCT_NOT_FOUND', 'Product not found', 404);
  }
  return product;
}

async function listVariants(shopId, productId) {
  await ensureProduct(shopId, productId);
  return variantRepo.listByProduct(shopId, productId);
}

async function createVariant({ shopId, productId, sku, title, attributes, price, inventory_qty }) {
  await ensureProduct(shopId, productId);
  if (!sku || !title || price == null) {
    throw new DomainError('VALIDATION_ERROR', 'sku, title, price are required', 400);
  }
  if (Number(price) < 0) {
    throw new DomainError('VALIDATION_ERROR', 'price must be greater than or equal to 0', 400);
  }
  const inventory = inventory_qty == null ? 0 : Number(inventory_qty);
  if (inventory < 0) {
    throw new DomainError('VALIDATION_ERROR', 'inventory_qty must be greater than or equal to 0', 400);
  }
  const existing = await variantRepo.findBySkuAndShop(sku, shopId);
  if (existing) {
    throw new DomainError('DUPLICATE_SKU', 'sku must be unique per shop', 409);
  }
  return variantRepo.createVariant({
    shop_id: shopId, product_id: productId, sku, title,
    attributes: attributes || null,
    price: Number(price), inventory_qty: inventory,
  });
}

async function getVariant(shopId, variantId) {
  const variant = await variantRepo.findByIdAndShop(variantId, shopId);
  if (!variant) {
    throw new DomainError('VARIANT_NOT_FOUND', 'Product variant not found', 404);
  }
  return variant;
}

async function updateVariant({ shopId, variantId, patch }) {
  const variant = await getVariant(shopId, variantId);
  if (patch.sku && patch.sku !== variant.sku) {
    const existing = await variantRepo.findBySkuAndShop(patch.sku, shopId);
    if (existing) {
      throw new DomainError('DUPLICATE_SKU', 'sku must be unique per shop', 409);
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'price') && Number(patch.price) < 0) {
    throw new DomainError('VALIDATION_ERROR', 'price must be >= 0', 400);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'inventory_qty') && Number(patch.inventory_qty) < 0) {
    throw new DomainError('VALIDATION_ERROR', 'inventory_qty must be >= 0', 400);
  }
  return variantRepo.updateVariant(variantId, shopId, patch);
}

async function deleteVariant(shopId, variantId) {
  await getVariant(shopId, variantId);
  await variantRepo.deleteVariant(variantId, shopId);
  return { success: true };
}

module.exports = { listVariants, createVariant, getVariant, updateVariant, deleteVariant };