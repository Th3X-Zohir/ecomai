const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config');
const { authRequired, resolveTenant } = require('../src/middleware/auth');

function fakeRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test('authRequired accepts valid bearer token', () => {
  const token = jwt.sign({ sub: 'u1', role: 'shop_admin', shop_id: 'shop_1' }, jwtSecret);

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = fakeRes();

  let called = false;
  authRequired(req, res, () => { called = true; });

  assert.equal(called, true);
  assert.equal(req.auth.shop_id, 'shop_1');
});

test('resolveTenant uses x-shop-id for super_admin', () => {
  const req = {
    auth: { role: 'super_admin', shop_id: null },
    headers: { 'x-shop-id': 'shop_2' },
  };
  const res = fakeRes();

  let called = false;
  resolveTenant(req, res, () => { called = true; });

  assert.equal(called, true);
  assert.equal(req.tenantShopId, 'shop_2');
});
