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
    const updated = await customerRepo.updateCustomer(existing.id, { password_hash, is_registered: true, full_name, phone });
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
  const allowed = { full_name: patch.full_name, phone: patch.phone, addresses: patch.addresses };
  return sanitize(await customerRepo.updateCustomer(customerId, allowed));
}

async function createCustomer({ shopId, email, full_name, phone }) {
  if (!email) throw new DomainError('VALIDATION_ERROR', 'email is required', 400);
  const existing = await customerRepo.findByEmail(shopId, email);
  if (existing) throw new DomainError('CUSTOMER_EXISTS', 'customer with this email already exists for this shop', 409);
  return customerRepo.createCustomer({ shop_id: shopId, email, full_name, phone });
}

async function listCustomers(shopId, opts) {
  return customerRepo.listByShop(shopId, opts);
}

function sanitize(c) {
  if (!c) return c;
  const { password_hash, ...rest } = c;
  return rest;
}

module.exports = { registerCustomer, loginCustomer, getCustomerProfile, updateCustomerProfile, createCustomer, listCustomers };