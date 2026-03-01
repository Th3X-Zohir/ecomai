const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/users');
const shopRepo = require('../repositories/shops');
const engine = require('./subscription-engine');
const { DomainError } = require('../errors/domain-error');

const ALLOWED_ROLES = ['super_admin', 'shop_admin', 'shop_user', 'delivery_agent'];
const SALT_ROUNDS = 10;

function sanitizeUser(u) {
  if (!u) return u;
  const { password_hash, ...safe } = u;
  return safe;
}

async function getMe(userId) {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new DomainError('USER_NOT_FOUND', 'User not found', 404);
  }
  return { id: user.id, email: user.email, role: user.role, shop_id: user.shop_id, full_name: user.full_name };
}

async function getUserById(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw new DomainError('USER_NOT_FOUND', 'User not found', 404);
  return sanitizeUser(user);
}

async function createUser({ actorRole, email, password, role, shopId, full_name, phone }) {
  if (!email || !password || !role) {
    throw new DomainError('VALIDATION_ERROR', 'email, password and role are required', 400);
  }
  if (!ALLOWED_ROLES.includes(role)) {
    throw new DomainError('VALIDATION_ERROR', `role must be one of: ${ALLOWED_ROLES.join(', ')}`, 400);
  }
  if (actorRole !== 'super_admin' && !['shop_user', 'delivery_agent'].includes(role)) {
    throw new DomainError('FORBIDDEN', 'Only super_admin can create this role', 403);
  }
  if (role !== 'super_admin' && !shopId) {
    throw new DomainError('VALIDATION_ERROR', 'shopId is required for non-super_admin roles', 400);
  }
  if (role !== 'super_admin') {
    const shop = await shopRepo.findById(shopId);
    if (!shop) {
      throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }
  }
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    throw new DomainError('DUPLICATE_EMAIL', 'email already exists', 409);
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const created = await userRepo.createUser({
    email,
    password_hash,
    role,
    shop_id: role === 'super_admin' ? null : shopId,
    full_name: full_name || null,
    phone: phone || null,
  });

  // Track staff usage for plan enforcement
  if (shopId && ['shop_admin', 'shop_user'].includes(role)) {
    try { await engine.incrementUsage(shopId, 'staff', 1); } catch (_e) { /* non-blocking */ }
  }

  return { id: created.id, email: created.email, role: created.role, shop_id: created.shop_id, full_name: created.full_name };
}

async function listUsers(shopId, opts) {
  const result = await userRepo.listByShop(shopId, opts);
  return { ...result, items: result.items.map(sanitizeUser) };
}

async function listAllUsers(opts) {
  const result = await userRepo.listAll(opts);
  return { ...result, items: result.items.map(sanitizeUser) };
}

async function updateUser(userId, patch) {
  const user = await userRepo.findById(userId);
  if (!user) throw new DomainError('USER_NOT_FOUND', 'User not found', 404);

  // Whitelist allowed fields — prevent role/shop_id/is_active escalation
  const UPDATABLE_FIELDS = ['full_name', 'phone', 'email', 'password', 'is_active'];
  const safePatch = {};
  for (const key of UPDATABLE_FIELDS) {
    if (patch[key] !== undefined) safePatch[key] = patch[key];
  }

  if (safePatch.password) {
    safePatch.password_hash = await bcrypt.hash(safePatch.password, SALT_ROUNDS);
    delete safePatch.password;
  }
  const updated = await userRepo.updateUser(userId, safePatch);
  return sanitizeUser(updated);
}

async function deleteUser(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw new DomainError('USER_NOT_FOUND', 'User not found', 404);
  if (user.role === 'super_admin') throw new DomainError('FORBIDDEN', 'Cannot delete super admin', 403);
  await userRepo.deleteUser(userId);

  // Decrement staff usage counter
  if (user.shop_id && ['shop_admin', 'shop_user'].includes(user.role)) {
    try { await engine.incrementUsage(user.shop_id, 'staff', -1); } catch (_e) { /* non-blocking */ }
  }

  return { deleted: true };
}

module.exports = { getMe, getUserById, createUser, listUsers, listAllUsers, updateUser, deleteUser };