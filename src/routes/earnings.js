const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const earningsService = require('../services/earnings');

const router = express.Router();

router.use(authRequired, resolveTenant, requireTenantContext);

/* ═══════════════════════════════════════════
   SHOP ADMIN / SHOP USER — My Earnings
   ═══════════════════════════════════════════ */

// Get earnings summary + balance
router.get('/my/summary', requireRoles(['shop_admin', 'shop_user', 'super_admin']), asyncHandler(async (req, res) => {
  const summary = await earningsService.getShopEarnings(req.tenantShopId);
  const balance = await earningsService.getShopBalance(req.tenantShopId);
  const settings = await earningsService.getCommissionSettings(req.tenantShopId);
  res.json({ ...summary, available_balance: balance, commission_rate: settings.commission_rate, min_withdrawal: Number(settings.min_withdrawal) });
}));

// List earnings transactions
router.get('/my/transactions', requireRoles(['shop_admin', 'shop_user', 'super_admin']), asyncHandler(async (req, res) => {
  const result = await earningsService.listShopEarnings(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    type: req.query.type,
  });
  res.json(result);
}));

// List my withdrawals
router.get('/my/withdrawals', requireRoles(['shop_admin', 'shop_user', 'super_admin']), asyncHandler(async (req, res) => {
  const result = await earningsService.listShopWithdrawals(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    status: req.query.status,
  });
  res.json(result);
}));

// Request a withdrawal
router.post('/my/withdrawals', requireRoles(['shop_admin']), validateBody({
  amount: { required: true, type: 'number', min: 1 },
  payment_method: { required: true, type: 'string', oneOf: ['bank_transfer', 'bkash', 'nagad', 'rocket'] },
}), asyncHandler(async (req, res) => {
  const withdrawal = await earningsService.requestWithdrawal({
    shopId: req.tenantShopId,
    requestedBy: req.auth.sub,
    amount: req.body.amount,
    paymentMethod: req.body.payment_method,
    accountDetails: req.body.account_details,
  });
  res.status(201).json(withdrawal);
}));

/* ═══════════════════════════════════════════
   SUPER ADMIN — Platform Oversight
   ═══════════════════════════════════════════ */

// Platform-wide summary
router.get('/platform/summary', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const summary = await earningsService.getPlatformSummary();
  res.json(summary);
}));

// All shop balances
router.get('/platform/balances', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const result = await earningsService.getShopBalances({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  });
  res.json(result);
}));

// All earnings transactions (filterable by shop)
router.get('/platform/transactions', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const result = await earningsService.listAllEarnings({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    type: req.query.type,
    shopId: req.query.shop_id,
  });
  res.json(result);
}));

// All withdrawal requests
router.get('/platform/withdrawals', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const result = await earningsService.listAllWithdrawals({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
    shopId: req.query.shop_id,
  });
  res.json(result);
}));

// Approve withdrawal
router.post('/platform/withdrawals/:id/approve', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const w = await earningsService.approveWithdrawal(req.params.id, {
    reviewedBy: req.auth.sub,
    notes: req.body.notes,
  });
  res.json(w);
}));

// Reject withdrawal
router.post('/platform/withdrawals/:id/reject', requireRoles(['super_admin']), validateBody({
  notes: { required: true, type: 'string' },
}), asyncHandler(async (req, res) => {
  const w = await earningsService.rejectWithdrawal(req.params.id, {
    reviewedBy: req.auth.sub,
    notes: req.body.notes,
  });
  res.json(w);
}));

// Mark withdrawal processing
router.post('/platform/withdrawals/:id/process', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const w = await earningsService.markProcessing(req.params.id, {
    referenceId: req.body.reference_id,
    notes: req.body.notes,
  });
  res.json(w);
}));

// Complete withdrawal (deducts from balance)
router.post('/platform/withdrawals/:id/complete', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const w = await earningsService.completeWithdrawal(req.params.id, {
    referenceId: req.body.reference_id,
    notes: req.body.notes,
  });
  res.json(w);
}));

// Manual adjustment (add/deduct from shop balance)
router.post('/platform/adjustments', requireRoles(['super_admin']), validateBody({
  shop_id: { required: true, type: 'string' },
  amount: { required: true, type: 'number' },
  description: { required: true, type: 'string' },
}), asyncHandler(async (req, res) => {
  const earning = await earningsService.recordAdjustment({
    shopId: req.body.shop_id,
    amount: req.body.amount,
    description: req.body.description,
    createdBy: req.auth.sub,
  });
  res.status(201).json(earning);
}));

// Commission settings — get global
router.get('/platform/commission', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const settings = await earningsService.getCommissionSettings(req.query.shop_id || null);
  res.json(settings);
}));

// Commission settings — update global or per-shop
router.put('/platform/commission', requireRoles(['super_admin']), validateBody({
  commission_rate: { required: true, type: 'number', min: 0, max: 1 },
}), asyncHandler(async (req, res) => {
  const settings = await earningsService.updateCommissionSettings(req.body.shop_id || null, {
    commission_rate: req.body.commission_rate,
    min_withdrawal: req.body.min_withdrawal,
    payout_cycle: req.body.payout_cycle,
    created_by: req.auth.sub,
  });
  res.json(settings);
}));

module.exports = router;
