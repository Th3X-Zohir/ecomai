const userRepo = require('../repositories/users');
const shopRepo = require('../repositories/shops');
const { DomainError } = require('../errors/domain-error');

const ALLOWED_ROLES = ['super_admin', 'shop_admin', 'shop_user', 'delivery_agent'];

function getMe(userId) {
  const user = userRepo.findById(userId);
  if (!user) {
    throw new DomainError('USER_NOT_FOUND', 'User not found', 404);
  }
  return { id: user.id, email: user.email, role: user.role, shop_id: user.shopId };
}

function createUser({ actorRole, email, password, role, shopId }) {
  if (!email || !password || !role) {
    throw new DomainError('VALIDATION_ERROR', 'email, password and role are required', 400);
  }
  if (!ALLOWED_ROLES.includes(role)) {
    throw new DomainError('VALIDATION_ERROR', `role must be one of: ${ALLOWED_ROLES.join(', ')}`, 400);
  }

  if (actorRole !== 'super_admin' && role !== 'shop_user') {
    throw new DomainError('FORBIDDEN', 'Only super_admin can create this role', 403);
  }

  if (role !== 'super_admin' && !shopId) {
    throw new DomainError('VALIDATION_ERROR', 'shopId is required for non-super_admin roles', 400);
  }

  if (role !== 'super_admin') {
    const shop = shopRepo.findById(shopId);
    if (!shop) {
      throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }
  }

  if (userRepo.findByEmail(email)) {
    throw new DomainError('DUPLICATE_EMAIL', 'email already exists', 409);
  }

  const created = userRepo.createUser({ email, password, role, shopId: role === 'super_admin' ? null : shopId });
  return { id: created.id, email: created.email, role: created.role, shop_id: created.shopId };
}

module.exports = { getMe, createUser };
