const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/error-handler');
const { csrfToken, csrfValidate } = require('./middleware/csrf');
const { requestLogger } = require('./middleware/request-logger');
const config = require('./config');

// Routes
const authRoutes = require('./routes/auth');
const registerRoutes = require('./routes/register');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const shopRoutes = require('./routes/shops');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const deliveryRoutes = require('./routes/delivery-requests');
const campaignRoutes = require('./routes/marketing-campaigns');
const variantRoutes = require('./routes/product-variants');
const inventoryRoutes = require('./routes/inventory-movements');
const websiteSettingsRoutes = require('./routes/website-settings');
const categoryRoutes = require('./routes/categories');
const driverRoutes = require('./routes/driver');
const publicRoutes = require('./routes/public');
const productImageRoutes = require('./routes/product-images');
const couponRoutes = require('./routes/coupons');
const dashboardRoutes = require('./routes/dashboard');
const invoiceRoutes = require('./routes/invoices');
const earningsRoutes = require('./routes/earnings');
const subscriptionRoutes = require('./routes/subscriptions');
const reviewRoutes = require('./routes/reviews');
const newsletterRoutes = require('./routes/newsletter');
const analyticsRoutes = require('./routes/analytics');
const affiliateRoutes = require('./routes/affiliates');
const upsellRoutes = require('./routes/upsell');
const refundRoutes = require('./routes/refunds');
const notificationRoutes = require('./routes/notifications');

const app = express();

// ── Security middleware ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", config.apiUrl, config.appUrl, 'https://sandbox.sslcommerz.com', 'https://securepay.sslcommerz.com'],
      frameSrc: ["'self'", 'https://sandbox.sslcommerz.com', 'https://securepay.sslcommerz.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: config.nodeEnv === 'production'
    ? [config.appUrl]
    : [config.appUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' })); // SSLCommerz form POST callbacks
app.use(cookieParser()); // Parse cookies for CSRF validation

// Request correlation ID for distributed tracing
app.use((req, res, next) => {
  const id = req.headers['x-request-id'] || require('crypto').randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
});

app.use(requestLogger);

// Set CSRF token cookie on safe (non-mutating) requests
app.use(csrfToken);
// Validate CSRF token on all mutating requests
app.use(csrfValidate);

// ── Rate limiting ────────────────────────────────────────────
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
});
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many authentication attempts, please try again later' },
});
const customerAuthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many login attempts, please try again later' },
});
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many submissions, please try again later' },
});
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many callback requests, please try again later' },
});

app.use('/v1', apiLimiter);
app.use('/v1/auth', authLimiter);
app.use('/v1/register', authLimiter);
// Payment webhook callbacks — stricter limits to prevent replay attacks
app.use('/v1/payments/sslcommerz', webhookLimiter);
app.use('/v1/public/shops/:slug/auth', customerAuthLimiter);
app.use('/v1/public/shops/:slug/newsletter', writeLimiter);
app.use('/v1/public/shops/:slug/checkout', writeLimiter);
app.use('/v1/public/shops/:slug/products/:productId/reviews', writeLimiter);

// ── Static files ──────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// ── Health check ─────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    const db = require('./db');
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'disconnected', error: err.message });
  }
});

// ── API routes ──────────────────────────────────────────────
// Public routes (no auth)
app.use('/v1/public', publicRoutes);
app.use('/v1/register', registerRoutes);

// Auth
app.use('/v1/auth', authRoutes);

// Authenticated admin API routes
app.use('/v1/products', productRoutes);
app.use('/v1/orders', orderRoutes);
app.use('/v1/customers', customerRoutes);
app.use('/v1/shops', shopRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/payments', paymentRoutes);
app.use('/v1/delivery-requests', deliveryRoutes);
app.use('/v1/marketing-campaigns', campaignRoutes);
app.use('/v1', variantRoutes);
app.use('/v1/inventory-movements', inventoryRoutes);
app.use('/v1/website-settings', websiteSettingsRoutes);
app.use('/v1/categories', categoryRoutes);
app.use('/v1/products', productImageRoutes);
app.use('/v1/driver', driverRoutes);
app.use('/v1/coupons', couponRoutes);
app.use('/v1/invoices', invoiceRoutes);
app.use('/v1/earnings', earningsRoutes);
app.use('/v1/subscriptions', subscriptionRoutes);
app.use('/v1/reviews', reviewRoutes);
app.use('/v1/newsletter', newsletterRoutes);
app.use('/v1/dashboard', dashboardRoutes);
app.use('/v1/analytics', analyticsRoutes);
app.use('/v1/affiliates', affiliateRoutes);
app.use('/v1/upsell', upsellRoutes);
app.use('/v1/refunds', refundRoutes);
app.use('/v1/notifications', notificationRoutes);

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/v1') && !req.path.startsWith('/health')) {
    return res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }
  return res.status(404).json({ message: 'Not found' });
});

// Global error handler — must be last
app.use(errorHandler);

module.exports = app;
