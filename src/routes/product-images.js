const { Router } = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { checkImageLimit } = require('../middleware/plan-enforcement');
const imageService = require('../services/product-images');
const { upload, validateUploadedFiles } = require('../middleware/upload');

const router = Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

// GET /v1/products/:productId/images — list product images
router.get('/:productId/images', asyncHandler(async (req, res) => {
  const images = await imageService.listImages(req.params.productId, req.tenantShopId);
  res.json(images);
}));

// POST /v1/products/:productId/images — upload images (multipart form)
router.post('/:productId/images', checkImageLimit(), upload.array('images', 5), validateUploadedFiles, asyncHandler(async (req, res) => {
  const results = [];
  for (const file of (req.files || [])) {
    const url = `/uploads/products/${file.filename}`;
    const image = await imageService.addImage(req.params.productId, req.tenantShopId, {
      url,
      alt_text: req.body.alt_text || null,
      is_primary: results.length === 0 && req.body.is_primary === 'true',
    });
    results.push(image);
  }
  res.status(201).json(results);
}));

// PATCH /v1/products/:productId/images/:imageId/primary — set primary
router.patch('/:productId/images/:imageId/primary', asyncHandler(async (req, res) => {
  const image = await imageService.setPrimary(req.params.imageId, req.params.productId, req.tenantShopId);
  res.json(image);
}));

// DELETE /v1/products/:productId/images/:imageId — remove image
router.delete('/:productId/images/:imageId', asyncHandler(async (req, res) => {
  await imageService.removeImage(req.params.imageId, req.tenantShopId);
  res.json({ message: 'Image deleted' });
}));

module.exports = router;
