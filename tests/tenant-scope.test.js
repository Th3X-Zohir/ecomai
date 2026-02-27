const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config');
const { authRequired } = require('../src/middleware/auth');

test('authRequired accepts valid bearer token', () => {
  const token = jwt.sign({ sub: 'u1', role: 'shop_admin', shop_id: 'shop_1' }, jwtSecret);

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };

  let called = false;
  authRequired(req, res, () => { called = true; });

  assert.equal(called, true);
  assert.equal(req.auth.shop_id, 'shop_1');
});
