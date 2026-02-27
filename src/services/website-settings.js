const websiteRepo = require('../repositories/website-settings');

async function getWebsiteSettings(shopId) {
  const existing = await websiteRepo.getByShop(shopId);
  if (existing) return existing;
  return websiteRepo.createDefault(shopId);
}

async function updateWebsiteSettings(shopId, patch) {
  // Ensure defaults exist first
  const existing = await websiteRepo.getByShop(shopId);
  if (!existing) await websiteRepo.createDefault(shopId);
  return websiteRepo.updateForShop(shopId, patch);
}

module.exports = { getWebsiteSettings, updateWebsiteSettings };