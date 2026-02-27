const { productVariants, createId } = require('../store');

function listByProduct(shopId, productId) {
  return productVariants.filter((entry) => entry.shop_id === shopId && entry.product_id === productId);
}

function findByIdAndShop(variantId, shopId) {
  return productVariants.find((entry) => entry.id === variantId && entry.shop_id === shopId) || null;
}

function findBySkuAndShop(sku, shopId) {
  return productVariants.find((entry) => entry.sku === sku && entry.shop_id === shopId) || null;
}

function createVariant({ shop_id, product_id, sku, title, attributes, price, inventory_qty }) {
  const now = new Date().toISOString();
  const variant = {
    id: createId('var'),
    shop_id,
    product_id,
    sku,
    title,
    attributes: attributes || {},
    price,
    inventory_qty,
    created_at: now,
    updated_at: now,
  };
  productVariants.push(variant);
  return variant;
}

function updateVariant(variant, patch) {
  const allowed = ['sku', 'title', 'attributes', 'price', 'inventory_qty'];
  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      variant[key] = patch[key];
    }
  });
  variant.updated_at = new Date().toISOString();
  return variant;
}

function deleteVariant(variantId) {
  const idx = productVariants.findIndex((entry) => entry.id === variantId);
  if (idx >= 0) {
    productVariants.splice(idx, 1);
    return true;
  }
  return false;
}

module.exports = {
  listByProduct,
  findByIdAndShop,
  findBySkuAndShop,
  createVariant,
  updateVariant,
  deleteVariant,
};
