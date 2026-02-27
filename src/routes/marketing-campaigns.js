const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const campaignService = require('../services/marketing-campaigns');
const { shops } = require('../store');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', (req, res) => {
  const items = campaignService.listCampaigns(req.tenantShopId);
  return res.json({ items, count: items.length });
});

router.get('/:campaignId', (req, res) => {
  try {
    const campaign = campaignService.getCampaign(req.tenantShopId, req.params.campaignId);
    return res.json(campaign);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to fetch campaign' });
  }
});

router.post('/', (req, res) => {
  try {
    const campaign = campaignService.createCampaign({
      shopId: req.tenantShopId,
      createdBy: req.auth.sub,
      ...req.body,
    });

    return res.status(201).json(campaign);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }

    return res.status(500).json({ message: 'Failed to create campaign' });
  }
});

router.post('/generate-draft', (req, res) => {
  try {
    const shop = shops.find((entry) => entry.id === req.tenantShopId);
    const campaign = campaignService.createAIDraftCampaign({
      shopId: req.tenantShopId,
      shopName: shop ? shop.name : 'Your Shop',
      createdBy: req.auth.sub,
      ...req.body,
    });

    return res.status(201).json(campaign);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }

    return res.status(500).json({ message: 'Failed to generate campaign draft' });
  }
});

router.patch('/:campaignId/status', (req, res) => {
  try {
    const campaign = campaignService.updateCampaignStatus({
      shopId: req.tenantShopId,
      campaignId: req.params.campaignId,
      status: req.body.status,
      scheduled_at: req.body.scheduled_at,
    });
    return res.json(campaign);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to update campaign status' });
  }
});

router.post('/:campaignId/performance', (req, res) => {
  try {
    const campaign = campaignService.ingestPerformance({
      shopId: req.tenantShopId,
      campaignId: req.params.campaignId,
      metrics: req.body,
    });
    return res.json(campaign);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to ingest campaign performance' });
  }
});

module.exports = router;
