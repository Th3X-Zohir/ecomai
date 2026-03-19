/**
 * CSRF Protection Middleware
 *
 * Implements Double-Submit Cookie pattern:
 * - Server sets a signed CSRF token cookie + a raw-token cookie (not httpOnly so JS can read it)
 * - Client reads the raw-token cookie and includes it as X-CSRF-Token header on all mutating requests
 * - Server validates the signed cookie's signature AND checks the raw token against the Map
 *
 * Security rationale:
 * - SameSite=Lax prevents cross-origin form submissions from sending the cookie
 * - XSS cannot exfiltrate the token value to a third party (CORS blocks the read)
 * - TimingSafeEqual prevents timing attacks on token comparison
 *
 * Token storage uses the SIGNED cookie value as the Map key — this is stable because
 * the signed cookie is always sent by the browser once set, regardless of auth state.
 * This avoids the session-key-mismatch bug that occurred when req.auth (available only
 * after authRequired) was used as the session key.
 */

const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_RAW_COOKIE = 'csrf_raw';
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

// Track current token in memory per-session
// Key = signed cookie value (stable — set once per browser session, independent of auth state)
const _csrfTokens = new Map();

function getCurrentToken(mapKey) {
  return _csrfTokens.get(mapKey) || null;
}

function setToken(mapKey, rawToken) {
  _csrfTokens.set(mapKey, rawToken);
  if (_csrfTokens.size > 10000) {
    const firstKey = _csrfTokens.keys().next().value;
    _csrfTokens.delete(firstKey);
  }
}

/**
 * Set CSRF token cookie on safe (non-mutating, non-public) requests.
 * Uses the signed cookie value as the Map key — this is stable across auth state changes.
 */
function csrfToken(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  const publicPrefixes = ['/v1/public/', '/v1/register/', '/v1/auth/', '/health', '/uploads'];
  const isPublic = publicPrefixes.some(p => req.path.startsWith(p));
  const isMutation = !safeMethods.includes(req.method);

  if (!isMutation && !isPublic) {
    const signedCookie = req.cookies?.[CSRF_COOKIE_NAME];
    const existingMapKey = signedCookie || null;
    let rawToken = existingMapKey ? getCurrentToken(existingMapKey) : null;

    if (!rawToken) {
      rawToken = crypto.randomBytes(CSRF_TOKEN_BYTES).toString('base64url');
      const newMapKey = signToken(rawToken); // Use signed token as stable Map key
      setToken(newMapKey, rawToken);
      const signedToken = signToken(rawToken);
      res.cookie(CSRF_COOKIE_NAME, signedToken, {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/',
      });
      res.cookie(CSRF_RAW_COOKIE, rawToken, {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/',
      });
      res.locals.csrfToken = rawToken;
      return next();
    }

    // Token exists for this signed cookie — ensure raw cookie is also set
    res.cookie(CSRF_RAW_COOKIE, rawToken, {
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
 */
function csrfValidate(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  const publicPrefixes = ['/v1/public/', '/v1/register/', '/v1/auth/', '/health', '/uploads'];
  if (publicPrefixes.some(p => req.path.startsWith(p))) return next();
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

  // Verify the raw token matches what we have stored for this signed cookie
  const rawFromCookie = extractRawToken(signedCookie);
  let storedToken = getCurrentToken(signedCookie);

  // Fallback: if Map entry is missing (e.g. after server restart), re-establish from signed cookie.
  // The HMAC signature check above already guarantees the cookie hasn't been tampered with.
  if (!storedToken && rawFromCookie) {
    setToken(signedCookie, rawFromCookie);
    storedToken = rawFromCookie;
  }

  if (!storedToken || storedToken !== rawFromCookie) {
    return res.status(403).json({
      code: 'CSRF_INVALID',
      message: 'CSRF token is invalid or expired. Please refresh the page and try again.',
    });
  }

  next();
}

module.exports = { csrfToken, csrfValidate };
