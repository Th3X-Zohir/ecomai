const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { jwtSecret, jwtAccessExpires, jwtRefreshExpires } = require('../config');
const userRepo = require('../repositories/users');
const db = require('../db');
const { DomainError } = require('../errors/domain-error');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, shop_id: user.shop_id },
    jwtSecret,
    { expiresIn: jwtAccessExpires }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, token_type: 'refresh' },
    jwtSecret,
    { expiresIn: jwtRefreshExpires }
  );
}

async function login(email, password) {
  const user = await userRepo.findByEmail(email);
  if (!user) {
    throw new DomainError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new DomainError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Store refresh token in DB
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
    [user.id, refreshToken]
  );

  return { accessToken, refreshToken, tokenType: 'Bearer' };
}

async function refresh(refreshToken) {
  if (!refreshToken) {
    throw new DomainError('VALIDATION_ERROR', 'refreshToken is required', 400);
  }

  // Check token exists in DB
  const tokenRow = await db.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
  if (tokenRow.rows.length === 0) {
    throw new DomainError('INVALID_REFRESH', 'Refresh token not recognized', 401);
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, jwtSecret);
  } catch (_e) {
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    throw new DomainError('INVALID_REFRESH', 'Refresh token invalid', 401);
  }

  if (payload.token_type !== 'refresh') {
    throw new DomainError('INVALID_REFRESH', 'Refresh token invalid', 401);
  }

  const user = await userRepo.findById(payload.sub);
  if (!user) {
    throw new DomainError('INVALID_REFRESH', 'Refresh token user not found', 401);
  }

  // Rotate: delete old, create new
  await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

  const accessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
    [user.id, newRefreshToken]
  );

  return { accessToken, refreshToken: newRefreshToken, tokenType: 'Bearer' };
}

async function logout(refreshToken) {
  if (refreshToken) {
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  }
  return { success: true };
}

module.exports = { login, refresh, logout, signAccessToken, signRefreshToken };