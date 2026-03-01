const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/error-handler');
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
const { requestLogger } = require('./middleware/request-logger');

const app = express();

// Security
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
app.use(express.urlencoded({ extended: true, limit: '100kb' })); // SSLCommerz callbacks use form POST

// Request correlation ID for distributed tracing
app.use((req, res, next) => {
  const id = req.headers['x-request-id'] || require('crypto').randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
});

app.use(requestLogger);

// Rate limiting
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

app.use('/v1', apiLimiter);
app.use('/v1/auth', authLimiter);
app.use('/v1/register', authLimiter);
// Rate limit customer auth endpoints (storefront login/register)
app.use('/v1/public/shops/:slug/auth', customerAuthLimiter);
// Rate limit storefront write endpoints (reviews, newsletter, checkout)
app.use('/v1/public/shops/:slug/newsletter', writeLimiter);
app.use('/v1/public/shops/:slug/checkout', writeLimiter);
app.use('/v1/public/shops/:slug/products/:productId/reviews', writeLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// API routes
app.get('/health', async (_req, res) => {
  try {
    const db = require('./db');
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'disconnected', error: err.message });
  }
});

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

// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/v1') && !req.path.startsWith('/health')) {
    return res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }
  return res.status(404).json({ message: 'Not found' });
});

// Global error handler — must be after all routes
app.use(errorHandler);

module.exports = app;
