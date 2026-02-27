const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const shopService = require('../services/shops');
const websiteService = require('../services/website-settings');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant);

router.get('/me', requireTenantContext, (req, res) => {
  try {
    const shop = shopService.getShop(req.tenantShopId);
    return res.json(shop);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to fetch shop' });
  }
});

router.get('/', requireRoles(['super_admin']), (req, res) => {
  const items = shopService.listShops();
  return res.json({ items, count: items.length });
});

router.post('/', requireRoles(['super_admin']), (req, res) => {
  try {
    const shop = shopService.createShop(req.body);
    return res.status(201).json(shop);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to create shop' });
  }
});

router.get('/:shopId', (req, res) => {
  try {
    if (req.auth.role !== 'super_admin' && req.tenantShopId !== req.params.shopId) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Forbidden' });
    }
    const shop = shopService.getShop(req.params.shopId);
    return res.json(shop);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to fetch shop' });
  }
});

router.patch('/:shopId', (req, res) => {
  try {
    if (req.auth.role !== 'super_admin' && req.tenantShopId !== req.params.shopId) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Forbidden' });
    }
    const shop = shopService.updateShop(req.params.shopId, req.body);
    return res.json(shop);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to update shop' });
  }
});

router.get('/:shopId/settings', (req, res) => {
  try {
    if (req.auth.role !== 'super_admin' && req.tenantShopId !== req.params.shopId) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Forbidden' });
    }
    const settings = websiteService.getWebsiteSettings(req.params.shopId, req.auth.sub);
    return res.json(settings);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to fetch shop settings' });
  }
});

module.exports = router;
