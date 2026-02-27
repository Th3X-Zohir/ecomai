const { products, createId } = require('../store');

function listByShop(shopId) {
  return products.filter((entry) => entry.shop_id === shopId);
}

function findByIdAndShop(id, shopId) {
  return products.find((entry) => entry.id === id && entry.shop_id === shopId);
}

function findBySlugAndShop(slug, shopId) {
  return products.find((entry) => entry.slug === slug && entry.shop_id === shopId);
}

function createProduct({ shop_id, name, slug, base_price, description }) {
  const product = {
    id: createId('prod'),
    shop_id,
    name,
    slug,
    base_price,
    description,
    status: 'draft',
    created_at: new Date().toISOString(),
  };

  products.push(product);
  return product;
}

module.exports = { listByShop, findByIdAndShop, findBySlugAndShop, createProduct };
