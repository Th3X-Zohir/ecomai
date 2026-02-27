const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const categoryService = require('../services/categories');
const catReqService = require('../services/category-requests');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

// ── Categories CRUD ──

router.get('/', asyncHandler(async (req, res) => {
  const cats = await categoryService.listCategories(req.tenantShopId, {
    status: req.query.status,
    parentId: req.query.parent_id === 'null' ? null : req.query.parent_id,
    search: req.query.search,
  });
  res.json(cats);
}));

router.get('/with-counts', asyncHandler(async (req, res) => {
  const cats = await categoryService.getCategoriesWithCounts(req.tenantShopId);
  res.json(cats);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const cat = await categoryService.getCategory(req.tenantShopId, req.params.id);
  res.json(cat);
}));

router.post('/', asyncHandler(async (req, res) => {
  const cat = await categoryService.createCategory({ shopId: req.tenantShopId, ...req.body });
  res.status(201).json(cat);
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const cat = await categoryService.updateCategory(req.tenantShopId, req.params.id, req.body);
  res.json(cat);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await categoryService.deleteCategory(req.tenantShopId, req.params.id);
  res.json(result);
}));

// ── Category Requests (admin view) ──

router.get('/requests/list', asyncHandler(async (req, res) => {
  const result = await catReqService.listRequests(req.tenantShopId, {
    status: req.query.status,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  });
  res.json(result);
}));

router.get('/requests/pending-count', asyncHandler(async (req, res) => {
  const count = await catReqService.countPending(req.tenantShopId);
  res.json({ count });
}));

router.post('/requests/:id/approve', asyncHandler(async (req, res) => {
  const result = await catReqService.approveRequest(req.tenantShopId, req.params.id, req.body);
  res.json(result);
}));

router.post('/requests/:id/reject', asyncHandler(async (req, res) => {
  const result = await catReqService.rejectRequest(req.tenantShopId, req.params.id, req.body);
  res.json(result);
}));

module.exports = router;
