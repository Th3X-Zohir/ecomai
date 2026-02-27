const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const userRepo = require('../repositories/users');
const { refreshTokens } = require('../store');
const { DomainError } = require('../errors/domain-error');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, shop_id: user.shopId }, jwtSecret, { expiresIn: '15m' });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, token_type: 'refresh' }, jwtSecret, { expiresIn: '7d' });
}

function login(email, password) {
  const user = userRepo.findByEmail(email);
  if (!user || user.password !== password) {
    throw new DomainError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  refreshTokens.push(refreshToken);
  return { accessToken, refreshToken, tokenType: 'Bearer' };
}

function refresh(refreshToken) {
  if (!refreshToken) {
    throw new DomainError('VALIDATION_ERROR', 'refreshToken is required', 400);
  }
  if (!refreshTokens.includes(refreshToken)) {
    throw new DomainError('INVALID_REFRESH', 'Refresh token not recognized', 401);
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, jwtSecret);
  } catch (_e) {
    throw new DomainError('INVALID_REFRESH', 'Refresh token invalid', 401);
  }

  if (payload.token_type !== 'refresh') {
    throw new DomainError('INVALID_REFRESH', 'Refresh token invalid', 401);
  }

  const user = userRepo.findById(payload.sub);
  if (!user) {
    throw new DomainError('INVALID_REFRESH', 'Refresh token user not found', 401);
  }

  const idx = refreshTokens.indexOf(refreshToken);
  if (idx >= 0) refreshTokens.splice(idx, 1);

  const accessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  refreshTokens.push(newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken, tokenType: 'Bearer' };
}

function logout(refreshToken) {
  const idx = refreshTokens.indexOf(refreshToken);
  if (idx >= 0) refreshTokens.splice(idx, 1);
  return { success: true };
}

module.exports = { login, refresh, logout };
