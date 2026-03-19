const dotenv = require('dotenv');
const path = require('path');

// Load .env for local dev; Docker sets env vars directly
dotenv.config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://ecomai:ecomai_secret@127.0.0.1:5432/ecomai',

  // Auth
  jwtSecret: (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET must be set in production');
    }
    return secret || 'dev-secret-change-me';
  })(),
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',

  // SSLCommerz
  sslcommerzStoreId: process.env.SSLCOMMERZ_STORE_ID || '',
  sslcommerzStorePasswd: process.env.SSLCOMMERZ_STORE_PASSWD || '',
  sslcommerzIsLive: process.env.SSLCOMMERZ_IS_LIVE === 'true',

  // URLs
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3000',

  // Email
  emailProvider: process.env.EMAIL_PROVIDER || 'console',  // 'resend' | 'smtp' | 'console'
  resendApiKey: process.env.RESEND_API_KEY || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'Ecomai <noreply@ecomai.com>',
};

