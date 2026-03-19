const express = require('express');
const { authRequired, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const notificationService = require('../services/notifications');

const router = express.Router();
router.use(authRequired, resolveTenant, requireTenantContext);

// GET /v1/notifications
router.get('/', asyncHandler(async (req, res) => {
  const isRead = req.query.is_read === 'true' ? true : req.query.is_read === 'false' ? false : undefined;
  const result = await notificationService.getNotifications(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 30,
    isRead,
  });
  res.json(result);
}));

// GET /v1/notifications/unread-count
router.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await notificationService.getUnread(req.tenantShopId);
  res.json({ unread: count });
}));

// POST /v1/notifications/mark-all-read
router.post('/mark-all-read', asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.tenantShopId);
  res.json({ success: true });
}));

// PATCH /v1/notifications/:notificationId/read
router.patch('/:notificationId/read', asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.params.notificationId, req.tenantShopId);
  if (!notification) throw new (require('../errors/domain-error'))('NOT_FOUND', 'Notification not found', 404);
  res.json(notification);
}));

// GET /v1/notifications/preferences
router.get('/preferences', asyncHandler(async (req, res) => {
  const prefs = await notificationService.getPreferences(req.tenantShopId, req.auth?.sub);
  res.json(prefs || {});
}));

// PATCH /v1/notifications/preferences
router.patch('/preferences', asyncHandler(async (req, res) => {
  const prefs = await notificationService.updatePreferences(req.tenantShopId, req.auth?.sub, req.body);
  res.json(prefs);
}));

module.exports = router;
