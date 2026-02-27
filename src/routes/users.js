const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const usersService = require('../services/users');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant);

router.get('/me', asyncHandler(async (req, res) => {
  const me = await usersService.getMe(req.auth.sub);
  res.json(me);
}));

router.get('/', requireTenantContext, asyncHandler(async (req, res) => {
  const result = await usersService.listUsers(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  });
  res.json(result);
}));

router.post('/', asyncHandler(async (req, res) => {
  const created = await usersService.createUser({
    actorRole: req.auth.role,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    shopId: req.body.shopId || req.tenantShopId,
    full_name: req.body.full_name,
    phone: req.body.phone,
  });
  res.status(201).json(created);
}));

module.exports = router;