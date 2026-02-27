const dotenv = require('dotenv');
const path = require('path');

// Load .env for local dev; Docker sets env vars directly
dotenv.config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://ecomai:ecomai_secret@127.0.0.1:5432/ecomai',

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',

  // SSLCommerz
  sslcommerzStoreId: process.env.SSLCOMMERZ_STORE_ID || '',
  sslcommerzStorePasswd: process.env.SSLCOMMERZ_STORE_PASSWD || '',
  sslcommerzIsLive: process.env.SSLCOMMERZ_IS_LIVE === 'true',

  // URLs
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
};

