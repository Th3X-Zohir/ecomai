const crypto = require('crypto');
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
    { sub: user.id, token_type: 'refresh', jti: crypto.randomUUID() },
    jwtSecret,
    { expiresIn: jwtRefreshExpires }
  );
}

async function login(email, password) {
  const user = await userRepo.findByEmail(email);
  if (!user) {
    throw new DomainError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  if (!user.is_active) {
    throw new DomainError('ACCOUNT_DISABLED', 'Account is disabled. Contact your administrator.', 403);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new DomainError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  // Clean up expired / excess tokens for this user
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1 AND (expires_at < NOW() OR id NOT IN (SELECT id FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5))', [user.id]);

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

  // Revoke refresh tokens if password was changed after this token was issued
  if (user.password_changed_at) {
    const tokenIssuedAt = new Date(payload.iat * 1000); // iat is Unix seconds
    const pwdChangedAt = new Date(user.password_changed_at);
    if (pwdChangedAt > tokenIssuedAt) {
      // Token was issued before password change — revoke all user tokens
      await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
      throw new DomainError('SESSION_REVOKED', 'Session has been revoked due to credential change', 401);
    }
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