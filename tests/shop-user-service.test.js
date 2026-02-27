const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId } = require('./helpers/setup');
const shopService = require('../src/services/shops');
const usersService = require('../src/services/users');

describe('shop and user service', () => {
  before(setup);
  after(teardown);

  let newShopId;

  it('creates a shop', async () => {
    const shop = await shopService.createShop({
      name: 'Test Electronics', slug: `test-elec-${Date.now()}`, industry: 'electronics',
    });
    assert.ok(shop.id);
    newShopId = shop.id;
  });

  it('updates a shop', async () => {
    const updated = await shopService.updateShop(newShopId, { status: 'paused' });
    assert.equal(updated.status, 'paused');
  });

  it('creates a user', async () => {
    const created = await usersService.createUser({
      actorRole: 'super_admin',
      email: `new-admin-${Date.now()}@shop.dev`,
      password: 'password123',
      role: 'shop_admin',
      shopId,
    });
    assert.equal(created.role, 'shop_admin');
    assert.equal(created.shop_id, shopId);
  });
});