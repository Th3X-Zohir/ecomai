/**
 * Request Logging Middleware
 *
 * Logs incoming requests with timing, status code, and key metadata.
 * Uses structured JSON format for easy parsing by log aggregators.
 */

function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl } = req;

  // Capture the original end to intercept status code
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Skip health checks and static assets to reduce noise
    if (originalUrl === '/health' || originalUrl.startsWith('/uploads/') || !originalUrl.startsWith('/v1')) {
      return originalEnd.apply(res, args);
    }

    const logEntry = {
      requestId: req.requestId,
      method,
      url: originalUrl,
      status,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userId: req.auth?.sub || undefined,
      shopId: req.tenantShopId || undefined,
    };

    // Log at appropriate level
    if (status >= 500) {
      console.error('[REQ]', JSON.stringify(logEntry));
    } else if (status >= 400 || duration > 1000) {
      console.warn('[REQ]', JSON.stringify(logEntry));
    } else if (process.env.NODE_ENV !== 'production' || duration > 200) {
      console.log('[REQ]', JSON.stringify(logEntry));
    }

    return originalEnd.apply(res, args);
  };

  next();
}

module.exports = { requestLogger };
