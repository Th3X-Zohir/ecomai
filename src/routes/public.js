const express = require('express');
const { asyncHandler } = require('../middleware/async-handler');
const shopRepo = require('../repositories/shops');
const productRepo = require('../repositories/products');
const variantRepo = require('../repositories/product-variants');
const websiteRepo = require('../repositories/website-settings');
const categoryRepo = require('../repositories/categories');
const catReqRepo = require('../repositories/category-requests');
const customerService = require('../services/customers');
const orderService = require('../services/orders');
const paymentService = require('../services/payments');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();

// --- Public shop info ---

router.get('/shops/:slug', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop || shop.status !== 'active') {
    throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  }
  // Return safe public info — strip all sensitive fields using correct column names
  const { sslcommerz_store_id, sslcommerz_store_pass, owner_user_id, ...publicShop } = shop;
  res.json(publicShop);
}));

router.get('/shops/:slug/settings', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const settings = await websiteRepo.getByShop(shop.id);
  res.json(settings || {});
}));

router.get('/shops/:slug/products', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const result = await productRepo.listByShop(shop.id, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    search: req.query.search,
    category: req.query.category,
    category_id: req.query.category_id,
    status: 'active',
  });
  res.json(result);
}));

router.get('/shops/:slug/products/:productIdOrSlug', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const val = req.params.productIdOrSlug;
  // Try by UUID first, then by slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  const product = isUuid
    ? await productRepo.findByIdAndShop(val, shop.id)
    : await productRepo.findBySlugAndShop(val, shop.id);
  if (!product) throw new DomainError('PRODUCT_NOT_FOUND', 'Product not found', 404);
  // Include variants
  const variants = await variantRepo.listByProduct(shop.id, product.id);
  res.json({ ...product, variants });
}));

// --- Public categories ---

router.get('/shops/:slug/categories', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const cats = await categoryRepo.getProductCounts(shop.id);
  res.json(cats);
}));

// --- Category request (anonymous or authenticated customer) ---

router.post('/shops/:slug/category-requests', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const { name, reason, customer_id } = req.body;
  if (!name || name.trim().length < 2) {
    throw new DomainError('VALIDATION_ERROR', 'Category name is required (min 2 chars)', 400);
  }
  const request = await catReqRepo.create({
    shop_id: shop.id, customer_id: customer_id || null, name: name.trim(), reason: reason || null,
  });
  res.status(201).json(request);
}));

// --- Customer auth ---

router.post('/shops/:slug/auth/register', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const result = await customerService.registerCustomer({
    shopId: shop.id, email: req.body.email, password: req.body.password,
    full_name: req.body.full_name, phone: req.body.phone,
  });
  res.status(201).json(result);
}));

router.post('/shops/:slug/auth/login', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const result = await customerService.loginCustomer({
    shopId: shop.id, email: req.body.email, password: req.body.password,
  });
  res.json(result);
}));

// --- Customer-authenticated routes ---

function customerAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.type !== 'customer') {
      return res.status(403).json({ message: 'Not a customer token' });
    }
    req.customer = payload;
    next();
  } catch (_e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

router.get('/shops/:slug/account/me', customerAuth, asyncHandler(async (req, res) => {
  const profile = await customerService.getCustomerProfile(req.customer.sub);
  res.json(profile);
}));

router.patch('/shops/:slug/account/me', customerAuth, asyncHandler(async (req, res) => {
  const updated = await customerService.updateCustomerProfile(req.customer.sub, req.body);
  res.json(updated);
}));

router.get('/shops/:slug/account/orders', customerAuth, asyncHandler(async (req, res) => {
  const result = await orderService.listOrdersByCustomer(req.customer.sub, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.json(result);
}));

// Order detail for a customer
router.get('/shops/:slug/account/orders/:orderId', customerAuth, asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const order = await orderService.getOrder(shop.id, req.params.orderId);
  // Ensure customer owns this order
  if (order.customer_id !== req.customer.sub) {
    throw new DomainError('FORBIDDEN', 'You do not have access to this order', 403);
  }
  res.json(order);
}));

// Change password
router.post('/shops/:slug/account/change-password', customerAuth, asyncHandler(async (req, res) => {
  const result = await customerService.changePassword(req.customer.sub, {
    currentPassword: req.body.current_password,
    newPassword: req.body.new_password,
  });
  res.json(result);
}));

// --- Storefront checkout ---

router.post('/shops/:slug/checkout', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);

  const { customer_email, customer_id, items, shipping_address, customer_name, customer_phone } = req.body;

  // Auto-create or find customer by email
  const { customer, token: customerToken } = await customerService.findOrCreateByEmail({
    shopId: shop.id, email: customer_email, full_name: customer_name, phone: customer_phone,
  });

  // Save shipping address to customer's addresses list if not already saved
  if (shipping_address && customer) {
    try {
      const profile = await customerService.getCustomerProfile(customer.id);
      const addrs = Array.isArray(profile.addresses) ? profile.addresses : [];
      const addrStr = JSON.stringify(shipping_address);
      const alreadySaved = addrs.some(a => JSON.stringify(a) === addrStr);
      if (!alreadySaved && addrs.length < 5) {
        await customerService.updateCustomerProfile(customer.id, {
          addresses: [...addrs, shipping_address],
        });
      }
    } catch (_) { /* non-critical */ }
  }

  // Create order linked to customer
  const order = await orderService.createOrder({
    shopId: shop.id, customer_email, customer_id: customer.id, items, shipping_address,
  });

  // Initiate SSLCommerz payment
  const paymentResult = await paymentService.initiatePayment({
    shopId: shop.id, orderId: order.id,
    customerName: customer_name, customerEmail: customer_email,
    customerPhone: customer_phone, shippingAddress: shipping_address,
  });

  res.status(201).json({ order, payment: paymentResult, customerToken, customer });
}));

module.exports = router;
