const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const shopRoutes = require('./routes/shops');
const customerRoutes = require('./routes/customers');
const deliveryRequestRoutes = require('./routes/delivery-requests');
const marketingCampaignRoutes = require('./routes/marketing-campaigns');
const websiteSettingsRoutes = require('./routes/website-settings');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/v1/auth', authRoutes);
app.use('/v1/products', productRoutes);
app.use('/v1/orders', orderRoutes);
app.use('/v1/shops', shopRoutes);
app.use('/v1/customers', customerRoutes);
app.use('/v1/delivery-requests', deliveryRequestRoutes);
app.use('/v1/marketing-campaigns', marketingCampaignRoutes);
app.use('/v1/website-settings', websiteSettingsRoutes);

module.exports = app;
