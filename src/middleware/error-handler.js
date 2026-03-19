const { DomainError } = require('../errors/domain-error');
const Sentry = require('@sentry/node');

function errorHandler(err, req, res, _next) {
  if (err instanceof DomainError) {
    return res.status(err.status).json({ code: err.code, message: err.message });
  }

  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'INVALID_JSON', message: 'Invalid JSON in request body' });
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ code: 'FILE_TOO_LARGE', message: 'File size exceeds limit' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ code: 'UNEXPECTED_FILE', message: 'Unexpected file field' });
  }

  // Structured error logging
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    error: err.message,
    stack: err.stack,
    userId: req.auth?.sub || null,
    shopId: req.tenantShopId || null,
  };
  console.error('[ERROR]', JSON.stringify(logEntry));

  // Report to Sentry (only in production/development, not in test)
  if (process.env.NODE_ENV !== 'test' && process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setTag('request_id', req.requestId);
      scope.setTag('method', req.method);
      scope.setTag('path', req.originalUrl);
      if (req.auth?.sub) scope.setUser({ id: req.auth.sub, shop_id: req.tenantShopId || undefined });
      Sentry.captureException(err);
    });
  }

  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
}

module.exports = { errorHandler };
