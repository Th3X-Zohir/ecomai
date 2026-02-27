const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const variantService = require('../services/product-variants');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/products/:productId/variants', (req, res) => {
  try {
    const items = variantService.listVariants(req.tenantShopId, req.params.productId);
    return res.json({ items, count: items.length });
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to list variants' });
  }
});

router.post('/products/:productId/variants', (req, res) => {
  try {
    const variant = variantService.createVariant({
      shopId: req.tenantShopId,
      productId: req.params.productId,
      ...req.body,
    });
    return res.status(201).json(variant);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to create variant' });
  }
});

router.get('/product-variants/:variantId', (req, res) => {
  try {
    const variant = variantService.getVariant(req.tenantShopId, req.params.variantId);
    return res.json(variant);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to fetch variant' });
  }
});

router.patch('/product-variants/:variantId', (req, res) => {
  try {
    const variant = variantService.updateVariant({
      shopId: req.tenantShopId,
      variantId: req.params.variantId,
      patch: req.body,
    });
    return res.json(variant);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to update variant' });
  }
});

router.delete('/product-variants/:variantId', (req, res) => {
  try {
    const result = variantService.deleteVariant(req.tenantShopId, req.params.variantId);
    return res.json(result);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to delete variant' });
  }
});

module.exports = router;
