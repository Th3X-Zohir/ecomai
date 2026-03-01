const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const { checkFeatureAccess } = require('../middleware/plan-enforcement');
const campaignService = require('../services/marketing-campaigns');
const shopService = require('../services/shops');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.auth.role === 'super_admin';
  const opts = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
    type: req.query.type,
    search: req.query.search,
  };
  if (isSuperAdmin && req.query.all === 'true') {
    const result = await campaignService.listCampaigns(null, opts);
    return res.json(result);
  }
  const result = await campaignService.listCampaigns(req.tenantShopId, opts);
  res.json(result);
}));

router.get('/:campaignId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const campaign = await campaignService.getCampaign(shopId, req.params.campaignId);
  res.json(campaign);
}));

router.post('/', checkFeatureAccess('marketing_tools'), validateBody({
  name: { required: true, type: 'string', minLength: 1 },
  type: { required: true, type: 'string', oneOf: ['email', 'sms', 'facebook', 'instagram', 'tiktok', 'google_ads'] },
}), asyncHandler(async (req, res) => {
  const campaign = await campaignService.createCampaign({
    shopId: req.tenantShopId, ...req.body,
  });
  res.status(201).json(campaign);
}));

router.post('/generate-draft', checkFeatureAccess('marketing_tools'), asyncHandler(async (req, res) => {
  const shop = await shopService.getShop(req.tenantShopId);
  const campaign = await campaignService.createAIDraftCampaign({
    shopId: req.tenantShopId, shopName: shop.name, ...req.body,
  });
  res.status(201).json(campaign);
}));

router.patch('/:campaignId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const campaign = await campaignService.updateCampaign(shopId, req.params.campaignId, req.body);
  res.json(campaign);
}));

router.delete('/:campaignId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  await campaignService.deleteCampaign(shopId, req.params.campaignId);
  res.json({ message: 'Campaign deleted' });
}));

module.exports = router;