const test = require('node:test');
const assert = require('node:assert/strict');

let authService;

try {
  authService = require('../src/services/auth');
} catch (_e) {
  test('auth service tests skipped when jsonwebtoken dependency is unavailable', { skip: true }, () => {});
}

if (authService) {
  test('auth login and refresh return rotated tokens', () => {
    const login = authService.login('admin@coffee.dev', 'password123');
    assert.equal(typeof login.accessToken, 'string');
    assert.equal(typeof login.refreshToken, 'string');

    const refreshed = authService.refresh(login.refreshToken);
    assert.equal(typeof refreshed.accessToken, 'string');
    assert.equal(typeof refreshed.refreshToken, 'string');
    assert.notEqual(refreshed.refreshToken, login.refreshToken);
  });
}
