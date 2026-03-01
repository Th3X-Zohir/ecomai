const { describe, it, beforeAll, afterAll } = require('bun:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId } = require('./helpers/setup');
const customerService = require('../src/services/customers');

describe('customer service', () => {
  beforeAll(setup);
  afterAll(teardown);

  let customerId;
  const email = `customer-${Date.now()}@example.com`;

  it('registers a new customer', async () => {
    const result = await customerService.registerCustomer({
      shopId, email, password: 'test1234', full_name: 'Test Buyer', phone: '01711000000',
    });
    assert.ok(result.customer);
    assert.ok(result.token);
    assert.equal(result.customer.email, email);
    assert.equal(result.customer.full_name, 'Test Buyer');
    customerId = result.customer.id;
  });

  it('rejects duplicate email registration', async () => {
    await assert.rejects(
      () => customerService.registerCustomer({ shopId, email, password: 'test1234' }),
      (err) => { assert.ok(err.message); return true; }
    );
  });

  it('logs in with correct credentials', async () => {
    const result = await customerService.loginCustomer({ shopId, email, password: 'test1234' });
    assert.ok(result.token);
    assert.equal(result.customer.email, email);
  });

  it('rejects login with wrong password', async () => {
    await assert.rejects(
      () => customerService.loginCustomer({ shopId, email, password: 'wrongpass' }),
      (err) => { assert.ok(err.message); return true; }
    );
  });

  it('gets customer profile', async () => {
    const profile = await customerService.getCustomerProfile(customerId);
    assert.equal(profile.email, email);
    assert.equal(profile.full_name, 'Test Buyer');
  });

  it('updates customer profile', async () => {
    const updated = await customerService.updateCustomerProfile(customerId, {
      full_name: 'Updated Buyer', phone: '01799000000',
    });
    assert.equal(updated.full_name, 'Updated Buyer');
  });

  it('changes password successfully', async () => {
    const result = await customerService.changePassword(customerId, {
      currentPassword: 'test1234', newPassword: 'newpass123',
    });
    assert.ok(result);
    // Verify new password works
    const login = await customerService.loginCustomer({ shopId, email, password: 'newpass123' });
    assert.ok(login.token);
  });

  it('rejects password change with wrong current password', async () => {
    await assert.rejects(
      () => customerService.changePassword(customerId, { currentPassword: 'wrongold', newPassword: 'x' }),
      (err) => { assert.ok(err.message); return true; }
    );
  });

  it('findOrCreateByEmail creates new customer', async () => {
    const email2 = `auto-${Date.now()}@example.com`;
    const result = await customerService.findOrCreateByEmail({
      shopId, email: email2, full_name: 'Auto Created',
    });
    assert.ok(result.customer);
    assert.equal(result.customer.email, email2);
  });

  it('findOrCreateByEmail returns existing customer', async () => {
    const result = await customerService.findOrCreateByEmail({ shopId, email });
    assert.ok(result.customer);
    assert.equal(result.customer.email, email);
  });
});
