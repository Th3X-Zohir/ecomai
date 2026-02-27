function requireTenantContext(req, res, next) {
  if (!req.tenantShopId) {
    return res.status(400).json({ message: 'x-shop-id is required for super_admin requests' });
  }

  return next();
}

module.exports = { requireTenantContext };
