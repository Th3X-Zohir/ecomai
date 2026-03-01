const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtAccessExpires } = require('../config');
const customerRepo = require('../repositories/customers');
const { DomainError } = require('../errors/domain-error');

const SALT_ROUNDS = 10;

function signCustomerToken(customer) {
  return jwt.sign(
    { sub: customer.id, type: 'customer', shop_id: customer.shop_id },
    jwtSecret,
    { expiresIn: jwtAccessExpires }
  );
}

async function registerCustomer({ shopId, email, password, full_name, phone }) {
  if (!email || !password) {
    throw new DomainError('VALIDATION_ERROR', 'email and password are required', 400);
  }
  const existing = await customerRepo.findByEmail(shopId, email);
  if (existing && existing.is_registered) {
    throw new DomainError('CUSTOMER_EXISTS', 'An account with this email already exists', 409);
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  if (existing) {
    // Upgrade guest to registered
    const updated = await customerRepo.updateCustomer(existing.id, shopId, { password_hash, is_registered: true, full_name, phone });
    const token = signCustomerToken(updated);
    return { customer: sanitize(updated), token };
  }

  const customer = await customerRepo.createCustomer({
    shop_id: shopId, email, password_hash, full_name, phone, is_registered: true,
  });
  const token = signCustomerToken(customer);
  return { customer: sanitize(customer), token };
}

async function loginCustomer({ shopId, email, password }) {
  if (!email || !password) {
    throw new DomainError('VALIDATION_ERROR', 'email and password are required', 400);
  }
  const customer = await customerRepo.findByEmail(shopId, email);
  if (!customer || !customer.is_registered || !customer.password_hash) {
    throw new DomainError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }
  const valid = await bcrypt.compare(password, customer.password_hash);
  if (!valid) {
    throw new DomainError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }
  const token = signCustomerToken(customer);
  return { customer: sanitize(customer), token };
}

async function getCustomerProfile(customerId) {
  const customer = await customerRepo.findById(customerId);
  if (!customer) throw new DomainError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
  return sanitize(customer);
}

async function updateCustomerProfile(customerId, patch) {
  const allowed = {};
  if (patch.full_name !== undefined) allowed.full_name = patch.full_name;
  if (patch.phone !== undefined) allowed.phone = patch.phone;
  if (patch.addresses !== undefined) allowed.addresses = patch.addresses;
  if (Object.keys(allowed).length === 0) {
    return sanitize(await customerRepo.findById(customerId));
  }
  return sanitize(await customerRepo.updateCustomer(customerId, null, allowed));
}

async function createCustomer({ shopId, email, full_name, phone }) {
  if (!email) throw new DomainError('VALIDATION_ERROR', 'email is required', 400);
  const existing = await customerRepo.findByEmail(shopId, email);
  if (existing) throw new DomainError('CUSTOMER_EXISTS', 'customer with this email already exists for this shop', 409);
  return customerRepo.createCustomer({ shop_id: shopId, email, full_name, phone });
}

/**
 * Find existing customer by email or create a guest record.
 * Used during checkout so every order is linked to a customer.
 * Returns { customer, token, isNew }.
 */
async function findOrCreateByEmail({ shopId, email, full_name, phone, password }) {
  if (!email) throw new DomainError('VALIDATION_ERROR', 'email is required', 400);
  const existing = await customerRepo.findByEmail(shopId, email);
  if (existing) {
    // Update name/phone if they were blank
    const patch = {};
    if (!existing.full_name && full_name) patch.full_name = full_name;
    if (!existing.phone && phone) patch.phone = phone;
    // Set password if provided and customer doesn't have one yet
    if (password && !existing.password_hash) {
      patch.password_hash = await bcrypt.hash(password, 10);
      patch.is_registered = true;
    }
    const updated = Object.keys(patch).length > 0
      ? await customerRepo.updateCustomer(existing.id, shopId, patch)
      : existing;
    const token = signCustomerToken(updated);
    return { customer: sanitize(updated), token, isNew: false };
  }
  const hashPw = password ? await bcrypt.hash(password, 10) : undefined;
  const customer = await customerRepo.createCustomer({
    shop_id: shopId, email, full_name: full_name || null, phone: phone || null,
    is_registered: !!password,
    ...(hashPw ? { password_hash: hashPw } : {}),
  });
  const token = signCustomerToken(customer);
  return { customer: sanitize(customer), token, isNew: true };
}

/**
 * Change password for an authenticated customer.
 */
async function changePassword(customerId, { currentPassword, newPassword }) {
  if (!newPassword || newPassword.length < 6) {
    throw new DomainError('VALIDATION_ERROR', 'New password must be at least 6 characters', 400);
  }
  const customer = await customerRepo.findById(customerId);
  if (!customer) throw new DomainError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);

  // If customer already has a password, verify current one
  if (customer.password_hash) {
    if (!currentPassword) {
      throw new DomainError('VALIDATION_ERROR', 'Current password is required', 400);
    }
    const valid = await bcrypt.compare(currentPassword, customer.password_hash);
    if (!valid) {
      throw new DomainError('INVALID_CREDENTIALS', 'Current password is incorrect', 401);
    }
  }

  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await customerRepo.updateCustomer(customerId, null, { password_hash, is_registered: true });
  return { message: 'Password updated successfully' };
}

async function listCustomers(shopId, opts) {
  return customerRepo.listByShop(shopId, opts);
}

async function getCustomerAdmin(shopId, customerId) {
  const customer = await customerRepo.findByIdAndShop(customerId, shopId);
  if (!customer) throw new DomainError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
  return sanitize(customer);
}

async function updateCustomerAdmin(shopId, customerId, { full_name, phone, email }) {
  const customer = await customerRepo.findByIdAndShop(customerId, shopId);
  if (!customer) throw new DomainError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
  if (email && email !== customer.email) {
    const dup = await customerRepo.findByEmail(shopId, email);
    if (dup && dup.id !== customerId) throw new DomainError('CUSTOMER_EXISTS', 'Email already used by another customer', 409);
  }
  const patch = {};
  if (full_name !== undefined) patch.full_name = full_name;
  if (phone !== undefined) patch.phone = phone;
  if (email && email !== customer.email) patch.email = email;
  return sanitize(await customerRepo.updateCustomer(customerId, shopId, patch));
}

async function deleteCustomer(shopId, customerId) {
  const customer = await customerRepo.findByIdAndShop(customerId, shopId);
  if (!customer) throw new DomainError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
  await customerRepo.deleteCustomer(customerId, shopId);
  return { deleted: true };
}

function sanitize(c) {
  if (!c) return c;
  const { password_hash, ...rest } = c;
  return rest;
}

module.exports = {
  registerCustomer, loginCustomer, getCustomerProfile, updateCustomerProfile,
  createCustomer, listCustomers, findOrCreateByEmail, changePassword, signCustomerToken,
  getCustomerAdmin, updateCustomerAdmin, deleteCustomer,
};