const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/v1/auth', authRoutes);
app.use('/v1/products', productRoutes);

module.exports = app;
