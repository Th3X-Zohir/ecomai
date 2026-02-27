const customerRepo = require('../repositories/customers');
const { DomainError } = require('../errors/domain-error');

function createCustomer({ shopId, email, full_name, phone }) {
  if (!email) {
    throw new DomainError('VALIDATION_ERROR', 'email is required', 400);
  }

  const existing = customerRepo.findByEmail(shopId, email);
  if (existing) {
    throw new DomainError('CUSTOMER_EXISTS', 'customer with this email already exists for this shop', 409);
  }

  return customerRepo.createCustomer({ shopId, email, full_name, phone });
}

function listCustomers(shopId) {
  return customerRepo.listByShop(shopId);
}

module.exports = { createCustomer, listCustomers };
