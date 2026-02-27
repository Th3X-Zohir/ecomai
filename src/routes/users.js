const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const usersService = require('../services/users');
const { DomainError } = require('../errors/domain-error');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant);

router.get('/me', (req, res) => {
  try {
    const me = usersService.getMe(req.auth.sub);
    return res.json(me);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to fetch current user' });
  }
});

router.post('/', (req, res) => {
  try {
    const created = usersService.createUser({
      actorRole: req.auth.role,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      shopId: req.body.shopId || req.tenantShopId,
    });
    return res.status(201).json(created);
  } catch (err) {
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    return res.status(500).json({ message: 'Failed to create user' });
  }
});

module.exports = router;
