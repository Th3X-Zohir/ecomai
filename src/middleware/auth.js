const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  try {
    req.auth = jwt.verify(token, jwtSecret);
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireRoles(roles) {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!roleArray.includes(req.auth.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve tenant context.
 * - super_admin: uses x-shop-id header if provided, otherwise null (= all shops).
 * - Other roles: scoped to the shop_id in their JWT.
 */
function resolveTenant(req, res, next) {
  if (req.auth.role === 'super_admin') {
    const shopHeader = req.headers['x-shop-id'] || null;
    if (shopHeader && !UUID_RE.test(shopHeader)) {
      return res.status(400).json({ message: 'x-shop-id must be a valid UUID' });
    }
    req.tenantShopId = shopHeader;
    req.isSuperAdmin = true;
    return next();
  }

  if (!req.auth.shop_id) {
    return res.status(400).json({ message: 'Missing shop scope in token' });
  }

  req.tenantShopId = req.auth.shop_id;
  req.isSuperAdmin = false;
  return next();
}

module.exports = { authRequired, requireRoles, resolveTenant };
