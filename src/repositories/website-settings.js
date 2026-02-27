const { websiteSettings, createId } = require('../store');

function getByShop(shopId) {
  return websiteSettings.find((entry) => entry.shop_id === shopId) || null;
}

function createDefault(shopId, updatedBy) {
  const now = new Date().toISOString();
  const settings = {
    id: createId('ws'),
    shop_id: shopId,
    theme_name: 'default',
    design_tokens: {},
    layout_config: {},
    navigation_config: {},
    homepage_config: {},
    custom_css: null,
    published_version: 1,
    draft_version: 1,
    updated_by: updatedBy || null,
    created_at: now,
    updated_at: now,
  };

  websiteSettings.push(settings);
  return settings;
}

function updateForShop(shopId, patch, updatedBy) {
  let settings = getByShop(shopId);
  if (!settings) {
    settings = createDefault(shopId, updatedBy);
  }

  const allowed = ['theme_name', 'design_tokens', 'layout_config', 'navigation_config', 'homepage_config', 'custom_css'];
  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      settings[key] = patch[key];
    }
  });

  settings.draft_version += 1;
  settings.updated_by = updatedBy || settings.updated_by;
  settings.updated_at = new Date().toISOString();

  return settings;
}

module.exports = { getByShop, createDefault, updateForShop };
