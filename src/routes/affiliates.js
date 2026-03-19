const express = require('express');
const { authRequired, requireRoles } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const affiliateService = require('../services/affiliates');

const router = express.Router();

// All routes require authentication
router.use(authRequired, requireTenantContext);

// ── GET /v1/affiliates/program ──────────────────────────────
router.get('/program', asyncHandler(async (req, res) => {
  const program = await affiliateService.getProgram(req.tenantShopId);
  res.json(program || {});
}));

// ── PATCH /v1/affiliates/program ────────────────────────────
router.patch('/program', validateBody({
  is_active: { type: 'boolean' },
  commission_type: { type: 'string', oneOf: ['percentage', 'fixed'] },
  commission_value: { type: 'number' },
  commission_order_limit: { type: 'number' },
  min_payout: { type: 'number' },
  payout_schedule: { type: 'string', oneOf: ['on_demand', 'weekly', 'monthly'] },
  cookie_days: { type: 'number' },
}), asyncHandler(async (req, res) => {
  const program = await affiliateService.updateProgram(req.tenantShopId, req.body);
  res.json(program);
}));

// ── GET /v1/affiliates ───────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const result = await affiliateService.listAffiliates(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
  });
  res.json(result);
}));

// ── GET /v1/affiliates/stats ────────────────────────────────
router.get('/stats', asyncHandler(async (req, res) => {
  const [stats, topAffiliates] = await Promise.all([
    affiliateService.getMerchantAffiliateStats(req.tenantShopId),
    affiliateService.getTopAffiliates(req.tenantShopId),
  ]);
  res.json({ ...stats, top_affiliates: topAffiliates });
}));

// ── GET /v1/affiliates/:affiliateId ─────────────────────────
router.get('/:affiliateId', asyncHandler(async (req, res) => {
  const affiliate = await affiliateService.getAffiliateForMerchant(
    req.tenantShopId, req.params.affiliateId
  );
  res.json(affiliate);
}));

// ── GET /v1/affiliates/:affiliateId/referrals ───────────────
router.get('/:affiliateId/referrals', asyncHandler(async (req, res) => {
  const result = await affiliateService.getAffiliateReferrals(
    req.tenantShopId, req.params.affiliateId,
    { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20, status: req.query.status }
  );
  res.json(result);
}));

// ── POST /v1/affiliates/:affiliateId/approve ────────────────
router.post('/:affiliateId/approve', asyncHandler(async (req, res) => {
  const referralId = req.body.referral_id;
  if (!referralId) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'referral_id is required' });
  }
  const result = await affiliateService.approveReferral(req.tenantShopId, referralId);
  res.json(result);
}));

// ── POST /v1/affiliates/:affiliateId/cancel ────────────────
router.post('/:affiliateId/cancel', asyncHandler(async (req, res) => {
  const referralId = req.body.referral_id;
  if (!referralId) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'referral_id is required' });
  }
  const result = await affiliateService.cancelReferral(req.tenantShopId, referralId);
  res.json(result);
}));

// ── POST /v1/affiliates/:affiliateId/payout ────────────────
router.post('/:affiliateId/payout', asyncHandler(async (req, res) => {
  const result = await affiliateService.payOutAffiliate({
    shopId: req.tenantShopId,
    affiliateId: req.params.affiliateId,
    requestedBy: req.auth.sub,
  });
  res.json(result);
}));

module.exports = router;
