const express = require('express');
const { authRequired, requireRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/async-handler');
const settlementsService = require('../services/settlements');
const platformLedgerRepo = require('../repositories/settlements');

const router = express.Router();
router.use(authRequired, requireRoles('super_admin'));

router.get('/balances', asyncHandler(async (req, res) => {
  const balances = await settlementsService.getAllBalances();
  res.json({ items: balances });
}));

router.get('/summary', asyncHandler(async (req, res) => {
  const summary = await settlementsService.getPlatformFinancialSummary();
  res.json(summary);
}));

router.get('/ledger', asyncHandler(async (req, res) => {
  const ledger = await platformLedgerRepo.getPlatformLedger({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    shopId: req.query.shop_id || undefined,
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
  });
  res.json(ledger);
}));

router.get('/platform-ledger', asyncHandler(async (req, res) => {
  const ledger = await platformLedgerRepo.getPlatformLedger({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    fromDate: req.query.from_date,
    toDate: req.query.to_date,
  });
  res.json(ledger);
}));

router.get('/platform-ledger/summary', asyncHandler(async (req, res) => {
  const summary = await platformLedgerRepo.getPlatformSummary();
  res.json(summary);
}));

router.post('/process-releases', asyncHandler(async (req, res) => {
  // Manual trigger for auto-release processing
  const results = await settlementsService.processAutomaticReleases();
  res.json({ success: true, ...results });
}));

module.exports = router;
