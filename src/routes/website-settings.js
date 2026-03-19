const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const websiteService = require('../services/website-settings');

const router = express.Router();

// Settings image upload storage
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'settings');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});
const settingsUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/me', asyncHandler(async (req, res) => {
  const settings = await websiteService.getWebsiteSettings(req.tenantShopId);
  res.json(settings);
}));

router.patch('/me', asyncHandler(async (req, res) => {
  const settings = await websiteService.updateWebsiteSettings(req.tenantShopId, req.body);
  res.json(settings);
}));

// Save as draft (does not publish)
router.post('/me/draft', asyncHandler(async (req, res) => {
  const settings = await websiteService.saveDraft(req.tenantShopId, req.body);
  res.json({ settings_status: 'draft', message: 'Draft saved. Publish when ready.' });
}));

// Publish current draft
router.post('/me/publish', asyncHandler(async (req, res) => {
  const result = await websiteService.publishSettings(req.tenantShopId);
  res.json({ settings_status: 'published', published_at: result.published_at, message: 'Settings published successfully!' });
}));

// Discard draft and revert to published
router.post('/me/discard', asyncHandler(async (req, res) => {
  const result = await websiteService.discardDraft(req.tenantShopId);
  res.json({ settings_status: 'published', message: 'Draft discarded. Published settings restored.' });
}));

// Upload settings image (logo, hero, favicon, og_image)
router.post('/upload', settingsUpload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image file provided' });
  const url = `/uploads/settings/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
}));

module.exports = router;