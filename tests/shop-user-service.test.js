const test = require('node:test');
const assert = require('node:assert/strict');
const shopService = require('../src/services/shops');
const usersService = require('../src/services/users');

test('super admin can create and update shop', () => {
  const shop = shopService.createShop({
    name: 'Demo Electronics',
    slug: `demo-electronics-${Date.now()}`,
    industry: 'electronics',
  });

  const updated = shopService.updateShop(shop.id, { status: 'paused' });
  assert.equal(updated.status, 'paused');
});

test('super admin can create shop_admin user bound to shop', () => {
  const created = usersService.createUser({
    actorRole: 'super_admin',
    email: `new-admin-${Date.now()}@shop.dev`,
    password: 'password123',
    role: 'shop_admin',
    shopId: 'shop_1',
  });

  assert.equal(created.role, 'shop_admin');
  assert.equal(created.shop_id, 'shop_1');
});
