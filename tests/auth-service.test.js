const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId, adminUserId } = require('./helpers/setup');
const authService = require('../src/services/auth');
const db = require('../src/db');
const bcrypt = require('bcryptjs');

describe('auth service', () => {
  let testEmail;
  before(async () => {
    await setup();
    testEmail = `auth-test-${Date.now()}@test.dev`;
    const hash = await bcrypt.hash('password123', 10);
    await db.query(
      `INSERT INTO users (id, shop_id, email, password_hash, role, full_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`user_auth_${Date.now()}`, shopId, testEmail, hash, 'shop_admin', 'Auth Test']
    );
  });
  after(teardown);

  it('login returns access and refresh tokens', async () => {
    const result = await authService.login(testEmail, 'password123');
    assert.equal(typeof result.accessToken, 'string');
    assert.equal(typeof result.refreshToken, 'string');
  });

  it('login rejects wrong password', async () => {
    await assert.rejects(() => authService.login(testEmail, 'wrongpass'), { message: /invalid/i });
  });

  it('refresh returns rotated tokens', async () => {
    const login = await authService.login(testEmail, 'password123');
    const refreshed = await authService.refresh(login.refreshToken);
    assert.equal(typeof refreshed.accessToken, 'string');
    assert.equal(typeof refreshed.refreshToken, 'string');
    assert.notEqual(refreshed.refreshToken, login.refreshToken);
  });
});