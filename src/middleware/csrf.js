/**
 * CSRF Protection Middleware
 *
 * Implements Double-Submit Cookie pattern:
 * - Server sets a signed CSRF token cookie (not httpOnly so JS can read it for header)
 * - Client reads token and includes it as X-CSRF-Token header on all mutating requests
 * - Middleware validates header matches the cookie value
 *
 * Security rationale:
 * - SameSite=Lax prevents cross-origin form submissions from sending the cookie
 * - XSS cannot exfiltrate the token value to a third party (CORS blocks the read)
 * - TimingSafeEqual prevents timing attacks on token comparison
 *
 * IMPORTANT: Token is set ONLY on requests that need it (non-mutating, non-public).
 * It is NOT set on every request to avoid token rotation mid-session.
 */

const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_BYTES = 32;

function signToken(token) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(token);
  return `${token}.${hmac.digest('base64url')}`;
}

function verifyToken(signedToken) {
  if (!signedToken) return false;
  const lastDot = signedToken.lastIndexOf('.');
  if (lastDot === -1) return false;
  const rawToken = signedToken.slice(0, lastDot);
  const expected = signToken(rawToken);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signedToken));
  } catch (_) {
    return false;
  }
}

function extractRawToken(signedToken) {
  if (!signedToken) return null;
  const lastDot = signedToken.lastIndexOf('.');
  return lastDot === -1 ? null : signedToken.slice(0, lastDot);
}

// Track current token in memory per-shop/user session (optional: use Redis for multi-instance)
const _csrfTokens = new Map();

function getCurrentToken(key) {
  return _csrfTokens.get(key) || null;
}

function setToken(key, rawToken) {
  _csrfTokens.set(key, rawToken);
  // Clean up old tokens (prevent memory leak)
  if (_csrfTokens.size > 10000) {
    const firstKey = _csrfTokens.keys().next().value;
    _csrfTokens.delete(firstKey);
  }
}

/**
 * Set CSRF token cookie if one is not already set for this session.
 * Only sets on safe (non-mutating) requests to prevent token rotation mid-session.
 * Returns the raw token value for embedding in pages.
 */
function csrfToken(req, res, next) {
  // Only set token on safe methods and non-public routes
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  const publicPrefixes = ['/v1/public/', '/v1/register/', '/v1/auth/', '/health', '/uploads'];
  const isPublic = publicPrefixes.some(p => req.path.startsWith(p));
  const isMutation = !safeMethods.includes(req.method);

  if (!isMutation && !isPublic) {
    // Build session key from authenticated identity (shop_id + user_id or IP)
    const authUid = req.auth?.sub || req.headers['x-shop-id'] || req.ip || 'anon';
    const sessionKey = `${authUid}`;
    let rawToken = getCurrentToken(sessionKey);

    if (!rawToken) {
      rawToken = crypto.randomBytes(CSRF_TOKEN_BYTES).toString('base64url');
      setToken(sessionKey, rawToken);
    }

    const signedToken = signToken(rawToken);
    res.cookie(CSRF_COOKIE_NAME, signedToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    res.locals.csrfToken = rawToken;
  }

  next();
}

/**
 * Validate CSRF token from request header against the signed cookie.
 * Bypasses validation for:
 * - Safe HTTP methods (GET, HEAD, OPTIONS)
 * - Public endpoints (no session)
 * - Webhook/callback endpoints (use other auth mechanisms)
 */
function csrfValidate(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  const publicPrefixes = ['/v1/public/', '/v1/register/', '/v1/auth/', '/health', '/uploads'];
  if (publicPrefixes.some(p => req.path.startsWith(p))) return next();

  // Webhook endpoints bypass CSRF (use IPN signature / API key)
  if (req.path.includes('sslcommerz')) return next();

  const signedCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!signedCookie || !headerToken) {
    return res.status(403).json({
      code: 'CSRF_MISSING',
      message: 'CSRF token missing. Please refresh the page and try again.',
    });
  }

  if (!verifyToken(signedCookie)) {
    return res.status(403).json({
      code: 'CSRF_INVALID',
      message: 'CSRF token is invalid or expired. Please refresh the page and try again.',
    });
  }

  next();
}

module.exports = { csrfToken, csrfValidate };
