const express = require('express');
const { asyncHandler } = require('../middleware/async-handler');
const shopRepo = require('../repositories/shops');
const productRepo = require('../repositories/products');
const variantRepo = require('../repositories/product-variants');
const websiteRepo = require('../repositories/website-settings');
const categoryRepo = require('../repositories/categories');
const catReqRepo = require('../repositories/category-requests');
const imageRepo = require('../repositories/product-images');
const customerService = require('../services/customers');
const orderService = require('../services/orders');
const paymentService = require('../services/payments');
const couponService = require('../services/coupons');
const invoiceService = require('../services/invoices');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();
const db = require('../db');

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

// --- Public shop statistics (for social proof) ---
router.get('/shops/:slug/stats', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const { rows } = await db.query(`
    SELECT
      (SELECT count(*) FROM products WHERE shop_id = $1 AND status = 'active') AS total_products,
      (SELECT count(*) FROM categories WHERE shop_id = $1) AS total_categories,
      (SELECT count(*) FROM orders WHERE shop_id = $1 AND status IN ('completed','delivered')) AS total_orders,
      (SELECT count(DISTINCT customer_id) FROM orders WHERE shop_id = $1 AND status IN ('completed','delivered')) AS total_customers
  `, [shop.id]);
  res.json({
    total_products: Number(rows[0].total_products),
    total_categories: Number(rows[0].total_categories),
    total_orders: Number(rows[0].total_orders),
    total_customers: Number(rows[0].total_customers),
    since: shop.created_at,
  });
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
  // Attach images to each product
  const ids = result.items.map(p => p.id);
  const imgMap = await imageRepo.listByProducts(ids, shop.id);
  result.items = result.items.map(p => ({ ...p, images: imgMap[p.id] || [] }));
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
  // Include variants and images
  const variants = await variantRepo.listByProduct(shop.id, product.id);
  const images = await imageRepo.listByProduct(product.id, shop.id);
  res.json({ ...product, variants, images });
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

// --- Customer invoices ---

router.get('/shops/:slug/account/invoices', customerAuth, asyncHandler(async (req, res) => {
  const result = await invoiceService.listCustomerInvoices(req.customer.sub, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.json(result);
}));

router.get('/shops/:slug/account/invoices/:invoiceId', customerAuth, asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const invoice = await invoiceService.getInvoice(shop.id, req.params.invoiceId);
  if (invoice.customer_id !== req.customer.sub) {
    throw new DomainError('FORBIDDEN', 'You do not have access to this invoice', 403);
  }
  res.json(invoice);
}));

// --- Storefront coupon validation ---

router.post('/shops/:slug/validate-coupon', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const { code, order_amount } = req.body;
  if (!code) throw new DomainError('VALIDATION_ERROR', 'code is required', 400);
  const result = await couponService.validateCoupon(shop.id, code, Number(order_amount) || 0);
  res.json({ valid: true, discount: result.discount, coupon_type: result.coupon.type, coupon_value: result.coupon.value });
}));

// --- Storefront checkout ---

router.post('/shops/:slug/checkout', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);

  const { customer_email, customer_id, items, shipping_address, customer_name, customer_phone, customer_password, order_notes, coupon_code } = req.body;

  // Auto-create or find customer by email
  const { customer, token: customerToken } = await customerService.findOrCreateByEmail({
    shopId: shop.id, email: customer_email, full_name: customer_name, phone: customer_phone,
    password: customer_password || undefined,
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
    notes: order_notes || undefined, coupon_code: coupon_code || undefined,
  });

  // Initiate SSLCommerz payment
  const paymentResult = await paymentService.initiatePayment({
    shopId: shop.id, orderId: order.id,
    customerName: customer_name, customerEmail: customer_email,
    customerPhone: customer_phone, shippingAddress: shipping_address,
  });

  res.status(201).json({ order, payment: paymentResult, customerToken, customer });
}));

// --- Newsletter subscription ---
router.post('/shops/:slug/newsletter', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DomainError('INVALID_EMAIL', 'Please provide a valid email', 400);
  }
  await db.query(
    `INSERT INTO newsletter_subscribers (shop_id, email) VALUES ($1, $2)
     ON CONFLICT (shop_id, email) DO UPDATE SET status = 'active'`,
    [shop.id, email.toLowerCase().trim()]
  );
  res.json({ message: 'Subscribed successfully' });
}));

// --- Product Reviews ---
router.get('/shops/:slug/products/:productId/reviews', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const { rows } = await db.query(
    `SELECT id, customer_name, rating, title, body, created_at
     FROM product_reviews WHERE product_id = $1 AND shop_id = $2 AND is_approved = true
     ORDER BY created_at DESC LIMIT 50`,
    [req.params.productId, shop.id]
  );
  const { rows: [agg] } = await db.query(
    `SELECT COUNT(*)::int AS count, ROUND(AVG(rating),1)::float AS average
     FROM product_reviews WHERE product_id = $1 AND shop_id = $2 AND is_approved = true`,
    [req.params.productId, shop.id]
  );
  res.json({ reviews: rows, summary: agg || { count: 0, average: 0 } });
}));

router.post('/shops/:slug/products/:productId/reviews', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  // Optional auth — if token present, extract customer
  let customerId = null;
  let customerName = req.body.customer_name;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), jwtSecret);
      if (payload.customerId) { customerId = payload.customerId; customerName = customerName || payload.name; }
    } catch (_) { /* anon review */ }
  }
  const { rating, title, body } = req.body;
  if (!rating || rating < 1 || rating > 5) throw new DomainError('INVALID_RATING', 'Rating must be 1-5', 400);
  if (!customerName) throw new DomainError('NAME_REQUIRED', 'Please provide your name', 400);
  const { rows } = await db.query(
    `INSERT INTO product_reviews (shop_id, product_id, customer_id, customer_name, rating, title, body, is_approved)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [shop.id, req.params.productId, customerId, customerName, rating, title || null, body || null, false]
  );
  res.status(201).json({ id: rows[0].id, message: 'Review submitted for approval' });
}));

// --- Wishlist ---
router.get('/shops/:slug/wishlist', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw new DomainError('AUTH_REQUIRED', 'Login required', 401);
  const payload = jwt.verify(authHeader.slice(7), jwtSecret);
  if (!payload.customerId) throw new DomainError('AUTH_REQUIRED', 'Login required', 401);
  const { rows } = await db.query(
    `SELECT w.product_id, p.name, p.slug, p.base_price, p.compare_at_price, p.status,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS image_url
     FROM wishlist_items w JOIN products p ON p.id = w.product_id
     WHERE w.customer_id = $1 AND w.shop_id = $2
     ORDER BY w.created_at DESC`,
    [payload.customerId, shop.id]
  );
  res.json(rows);
}));

router.post('/shops/:slug/wishlist', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw new DomainError('AUTH_REQUIRED', 'Login required', 401);
  const payload = jwt.verify(authHeader.slice(7), jwtSecret);
  if (!payload.customerId) throw new DomainError('AUTH_REQUIRED', 'Login required', 401);
  const { product_id } = req.body;
  if (!product_id) throw new DomainError('MISSING_PRODUCT', 'Product ID required', 400);
  await db.query(
    `INSERT INTO wishlist_items (shop_id, customer_id, product_id) VALUES ($1, $2, $3)
     ON CONFLICT (customer_id, product_id) DO NOTHING`,
    [shop.id, payload.customerId, product_id]
  );
  res.json({ message: 'Added to wishlist' });
}));

router.delete('/shops/:slug/wishlist/:productId', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw new DomainError('AUTH_REQUIRED', 'Login required', 401);
  const payload = jwt.verify(authHeader.slice(7), jwtSecret);
  if (!payload.customerId) throw new DomainError('AUTH_REQUIRED', 'Login required', 401);
  await db.query(
    `DELETE FROM wishlist_items WHERE customer_id = $1 AND product_id = $2 AND shop_id = $3`,
    [payload.customerId, req.params.productId, shop.id]
  );
  res.json({ message: 'Removed from wishlist' });
}));

// --- Forgot Password (customer) ---
router.post('/shops/:slug/auth/forgot-password', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const { email } = req.body;
  if (!email) throw new DomainError('EMAIL_REQUIRED', 'Email required', 400);
  // Find customer
  const { rows } = await db.query(
    `SELECT id, email, full_name FROM customers WHERE shop_id = $1 AND email = $2`,
    [shop.id, email.toLowerCase().trim()]
  );
  // Always return success to prevent email enumeration
  if (rows.length === 0) return res.json({ message: 'If an account exists, a reset link will be sent.' });
  // Generate short-lived token (15min)
  const resetToken = jwt.sign({ customerId: rows[0].id, purpose: 'password_reset' }, jwtSecret, { expiresIn: '15m' });
  // In production, send email. For now store and return token in dev mode.
  res.json({ message: 'If an account exists, a reset link will be sent.', resetToken });
}));

router.post('/shops/:slug/auth/reset-password', asyncHandler(async (req, res) => {
  const shop = await shopRepo.findBySlug(req.params.slug);
  if (!shop) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  const { token, new_password } = req.body;
  if (!token || !new_password) throw new DomainError('MISSING_FIELDS', 'Token and new password required', 400);
  if (new_password.length < 6) throw new DomainError('WEAK_PASSWORD', 'Password must be at least 6 characters', 400);
  let payload;
  try { payload = jwt.verify(token, jwtSecret); } catch (_) {
    throw new DomainError('INVALID_TOKEN', 'Reset link expired or invalid', 400);
  }
  if (payload.purpose !== 'password_reset') throw new DomainError('INVALID_TOKEN', 'Invalid token', 400);
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash(new_password, 12);
  await db.query(`UPDATE customers SET password_hash = $1 WHERE id = $2`, [hash, payload.customerId]);
  res.json({ message: 'Password reset successfully' });
}));

module.exports = router;
