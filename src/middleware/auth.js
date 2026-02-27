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
  return (req, res, next) => {
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}

function resolveTenant(req, res, next) {
  if (req.auth.role === 'super_admin') {
    req.tenantShopId = req.headers['x-shop-id'] || null;
    return next();
  }

  if (!req.auth.shop_id) {
    return res.status(400).json({ message: 'Missing shop scope in token' });
  }

  req.tenantShopId = req.auth.shop_id;
  return next();
}

module.exports = { authRequired, requireRoles, resolveTenant };
