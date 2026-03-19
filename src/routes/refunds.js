const express = require('express');
const { authRequired, requireRoles } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const refundService = require('../services/refunds');

const router = express.Router();
router.use(authRequired, requireTenantContext);

// ── GET /v1/refunds ──────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const result = await refundService.listRefundRequests(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
  });
  res.json(result);
}));

// ── GET /v1/refunds/stats ────────────────────────────────────
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await refundService.getRefundStats(req.tenantShopId);
  res.json(stats);
}));

// ── GET /v1/refunds/:requestId ────────────────────────────────
router.get('/:requestId', asyncHandler(async (req, res) => {
  const request = await refundService.getRefundRequest(req.tenantShopId, req.params.requestId);
  res.json(request);
}));

// ── POST /v1/refunds/:requestId/approve ─────────────────────
router.post('/:requestId/approve', asyncHandler(async (req, res) => {
  const result = await refundService.approveRefund(req.tenantShopId, req.params.requestId, {
    approvedBy: req.auth.sub,
    notes: req.body.notes,
  });
  res.json(result);
}));

// ── POST /v1/refunds/:requestId/reject ──────────────────────
router.post('/:requestId/reject', asyncHandler(async (req, res) => {
  const result = await refundService.rejectRefund(req.tenantShopId, req.params.requestId, {
    rejectedBy: req.auth.sub,
    reason: req.body.reason,
  });
  res.json(result);
}));

// ── POST /v1/refunds/:requestId/complete ─────────────────────
// Mark a processing refund as completed (super_admin only, for manual gateway confirmation)
router.post('/:requestId/complete',
  requireRoles(['super_admin']),
  asyncHandler(async (req, res) => {
    const result = await refundService.completeRefund(req.tenantShopId, req.params.requestId);
    res.json(result);
  })
);

module.exports = router;
