const websiteRepo = require('../repositories/website-settings');

function getWebsiteSettings(shopId, userId) {
  const existing = websiteRepo.getByShop(shopId);
  if (existing) {
    return existing;
  }

  return websiteRepo.createDefault(shopId, userId);
}

function updateWebsiteSettings(shopId, patch, userId) {
  return websiteRepo.updateForShop(shopId, patch, userId);
}

module.exports = { getWebsiteSettings, updateWebsiteSettings };
