const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config');
const { authRequired } = require('../src/middleware/auth');

describe('tenant scope middleware', () => {
  it('authRequired accepts valid bearer token', () => {
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

  it('authRequired rejects missing token', () => {
    const req = { headers: {} };
    let statusCode;
    const res = {
      status(code) { statusCode = code; return this; },
      json() { return this; },
    };
    authRequired(req, res, () => {});
    assert.equal(statusCode, 401);
  });
});