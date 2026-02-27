const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId, adminUserId } = require('./helpers/setup');
const wsService = require('../src/services/website-settings');

describe('website settings service', () => {
  before(setup);
  after(teardown);

  it('returns default settings for shop', async () => {
    const settings = await wsService.getWebsiteSettings(shopId);
    assert.equal(settings.shop_id, shopId);
    assert.equal(typeof settings.theme_name, 'string');
  });

  it('updates settings', async () => {
    const updated = await wsService.updateWebsiteSettings(shopId, {
      theme_name: 'modern_luxe',
      design_tokens: { primary: '#111111' },
    });
    assert.equal(updated.theme_name, 'modern_luxe');
  });
});