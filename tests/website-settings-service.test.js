const test = require('node:test');
const assert = require('node:assert/strict');
const websiteSettingsService = require('../src/services/website-settings');

test('website settings are created by default and patchable per shop', () => {
  const first = websiteSettingsService.getWebsiteSettings('shop_1', 'user_shop_admin');
  assert.equal(first.shop_id, 'shop_1');
  assert.equal(first.theme_name, 'default');

  const updated = websiteSettingsService.updateWebsiteSettings('shop_1', {
    theme_name: 'modern_luxe',
    design_tokens: { primary: '#111111', accent: '#caa94d' },
  }, 'user_shop_admin');

  assert.equal(updated.theme_name, 'modern_luxe');
  assert.equal(updated.design_tokens.primary, '#111111');
  assert.equal(updated.draft_version >= 2, true);
});
