const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const customerService = require('../services/customers');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

router.get('/', asyncHandler(async (req, res) => {
  const result = await customerService.listCustomers(req.tenantShopId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    search: req.query.search,
  });
  res.json(result);
}));

router.get('/:customerId', asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerAdmin(req.tenantShopId, req.params.customerId);
  res.json(customer);
}));

router.post('/', asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer({
    shopId: req.tenantShopId, ...req.body,
  });
  res.status(201).json(customer);
}));

router.patch('/:customerId', asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomerAdmin(req.tenantShopId, req.params.customerId, req.body);
  res.json(customer);
}));

router.delete('/:customerId', asyncHandler(async (req, res) => {
  const result = await customerService.deleteCustomer(req.tenantShopId, req.params.customerId);
  res.json(result);
}));

module.exports = router;