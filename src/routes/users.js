const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const { checkPlanLimit } = require('../middleware/plan-enforcement');
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

router.post('/', checkPlanLimit('staff'), validateBody({
  email: { required: true, type: 'email' },
  password: { required: true, type: 'string', minLength: 6 },
  role: { required: true, type: 'string', oneOf: ['super_admin', 'shop_admin', 'shop_user', 'delivery_agent'] },
}), asyncHandler(async (req, res) => {
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

// ── Super-admin: all users across all shops ──

router.get('/all', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const result = await usersService.listAllUsers({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    search: req.query.search,
    role: req.query.role,
  });
  res.json(result);
}));

// ── Get single user by ID (super_admin only) ──
router.get('/:userId', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(req.params.userId);
  res.json(user);
}));

router.patch('/:userId', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  const updated = await usersService.updateUser(req.params.userId, req.body);
  res.json(updated);
}));

router.delete('/:userId', requireRoles(['super_admin']), asyncHandler(async (req, res) => {
  await usersService.deleteUser(req.params.userId);
  res.json({ deleted: true });
}));

module.exports = router;