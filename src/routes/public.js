const express = require('express');
const shopRepo = require('../repositories/shops');
const productRepo = require('../repositories/products');
const websiteRepo = require('../repositories/website-settings');
const orderService = require('../services/orders');
const customerRepo = require('../repositories/customers');
const { DomainError } = require('../errors/domain-error');
const { createId } = require('../store');

const router = express.Router();

/* ---------- helpers ---------- */
function resolveShopBySlug(req, res, next) {
  const shop = shopRepo.findBySlug(req.params.shopSlug);
  if (!shop || shop.status !== 'active') {
    return res.status(404).json({ message: 'Shop not found' });
  }
  req.shop = shop;
  next();
}

/* ---------- shop info + website settings ---------- */
router.get('/shops/:shopSlug', resolveShopBySlug, (req, res) => {
  const shop = req.shop;
  let settings = websiteRepo.getByShop(shop.id);
  if (!settings) {
    settings = websiteRepo.createDefault(shop.id, null);
  }
  return res.json({
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    industry: shop.industry,
    settings: {
      theme_name: settings.theme_name,
      design_tokens: settings.design_tokens,
      layout_config: settings.layout_config,
      navigation_config: settings.navigation_config,
      homepage_config: settings.homepage_config,
      custom_css: settings.custom_css,
    },
  });
});

/* ---------- public product list ---------- */
router.get('/shops/:shopSlug/products', resolveShopBySlug, (req, res) => {
  const all = productRepo.listByShop(req.shop.id);
  // Only return active products to public
  const active = all.filter((p) => p.status === 'active');
  return res.json({ items: active, count: active.length });
});

/* ---------- public single product ---------- */
router.get('/shops/:shopSlug/products/:productId', resolveShopBySlug, (req, res) => {
  const product = productRepo.findByIdAndShop(req.params.productId, req.shop.id);
  if (!product || product.status !== 'active') {
    return res.status(404).json({ message: 'Product not found' });
  }

  // Also return variants
  const { productVariants } = require('../store');
  const variants = productVariants.filter(
    (v) => v.product_id === product.id && v.shop_id === req.shop.id
  );

  return res.json({ ...product, variants });
});

/* ---------- public checkout (create order) ---------- */
router.post('/shops/:shopSlug/orders', resolveShopBySlug, (req, res) => {
  try {
    const { customer_email, customer_name, customer_phone, items, shipping_address } = req.body;

    if (!customer_email || !items || !items.length) {
      return res.status(400).json({ message: 'customer_email and items are required' });
    }

    // Upsert customer
    let customer = customerRepo.findByEmail(req.shop.id, customer_email);
    if (!customer) {
      customer = customerRepo.createCustomer({
        shopId: req.shop.id,
        email: customer_email,
        full_name: customer_name || null,
        phone: customer_phone || null,
      });
    }

    const order = orderService.createOrder({
      shopId: req.shop.id,
      customer_email,
      items,
      shipping_address: shipping_address || {},
    });

    return res.status(201).json(order);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Checkout failed' });
  }
});

module.exports = router;
