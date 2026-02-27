const express = require('express');
const cors = require('cors');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
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
const driverRoutes = require('./routes/driver');
const publicRoutes = require('./routes/public');

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// API routes
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Public storefront API (no auth required)
app.use('/v1/public', publicRoutes);

// Authenticated API routes
app.use('/v1/auth', authRoutes);
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
app.use('/v1/driver', driverRoutes);

// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/v1') && !req.path.startsWith('/health')) {
    return res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }
  return res.status(404).json({ message: 'Not found' });
});

module.exports = app;
