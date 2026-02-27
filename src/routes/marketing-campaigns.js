const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const campaignService = require('../services/marketing-campaigns');
const shopService = require('../services/shops');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', asyncHandler(async (req, res) => {
  const result = await campaignService.listCampaigns(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
    type: req.query.type,
    search: req.query.search,
  });
  res.json(result);
}));

router.get('/:campaignId', asyncHandler(async (req, res) => {
  const campaign = await campaignService.getCampaign(req.tenantShopId, req.params.campaignId);
  res.json(campaign);
}));

router.post('/', asyncHandler(async (req, res) => {
  const campaign = await campaignService.createCampaign({
    shopId: req.tenantShopId, ...req.body,
  });
  res.status(201).json(campaign);
}));

router.post('/generate-draft', asyncHandler(async (req, res) => {
  const shop = await shopService.getShop(req.tenantShopId);
  const campaign = await campaignService.createAIDraftCampaign({
    shopId: req.tenantShopId, shopName: shop.name, ...req.body,
  });
  res.status(201).json(campaign);
}));

router.patch('/:campaignId', asyncHandler(async (req, res) => {
  const campaign = await campaignService.updateCampaign(req.tenantShopId, req.params.campaignId, req.body);
  res.json(campaign);
}));

module.exports = router;