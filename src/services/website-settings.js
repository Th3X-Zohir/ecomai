const websiteRepo = require('../repositories/website-settings');

// Dangerous fields that could enable stored XSS
const BLOCKED_FIELDS = ['custom_js', 'custom_javascript'];

async function getWebsiteSettings(shopId) {
  const existing = await websiteRepo.getByShop(shopId);
  if (!existing) {
    const created = await websiteRepo.createDefault(shopId);
    return { ...created, settings_status: 'published', draft_settings: null };
  }
  // If status is 'draft', merge published_settings into draft_settings for preview
  if (existing.settings_status === 'draft' && existing.draft_settings) {
    return {
      ...existing,
      // Show draft as active settings (merged from published + draft overrides)
      ...existing.draft_settings,
      settings_status: 'draft',
      // Provide published copy for comparison
      _published_snapshot: existing.published_settings || null,
    };
  }
  return {
    ...existing,
    settings_status: existing.settings_status || 'published',
    draft_settings: null,
  };
}

async function updateWebsiteSettings(shopId, patch) {
  // Strip dangerous fields to prevent stored XSS
  const sanitized = { ...patch };
  for (const field of BLOCKED_FIELDS) {
    delete sanitized[field];
  }
  // Ensure defaults exist first
  const existing = await websiteRepo.getByShop(shopId);
  if (!existing) await websiteRepo.createDefault(shopId);

  // Draft mode: save to draft_settings, keep published_settings unchanged
  if (existing?.settings_status === 'draft') {
    return websiteRepo.updateDraftSettings(shopId, sanitized);
  }

  // Normal mode: update published settings directly
  return websiteRepo.updateForShop(shopId, sanitized);
}

async function publishSettings(shopId) {
  const existing = await websiteRepo.getByShop(shopId);
  if (!existing) throw new Error('No settings found');

  const draft = existing.draft_settings;
  if (!draft) throw new Error('No draft to publish');

  // Move current published settings to published_settings (for rollback)
  const rollbackSnapshot = websiteRepo.getByShop(shopId);

  // Publish: apply draft to main settings fields, clear draft
  const publishedSettings = { ...existing, ...draft };
  delete publishedSettings.draft_settings;
  delete publishedSettings.settings_status;
  delete publishedSettings.published_at;
  delete publishedSettings._published_snapshot;

  const result = await websiteRepo.publishDraft(shopId, publishedSettings);
  return { ...result, settings_status: 'published', just_published: true };
}

async function saveDraft(shopId, patch) {
  const sanitized = { ...patch };
  for (const field of BLOCKED_FIELDS) {
    delete sanitized[field];
  }
  const existing = await websiteRepo.getByShop(shopId);
  if (!existing) await websiteRepo.createDefault(shopId);

  // Set status to draft, save draft_settings
  return websiteRepo.saveDraft(shopId, sanitized);
}

async function discardDraft(shopId) {
  const existing = await websiteRepo.getByShop(shopId);
  if (!existing) throw new Error('No settings found');
  // If there's a published_snapshot, restore from it
  if (existing.published_settings) {
    return websiteRepo.restorePublished(shopId);
  }
  // Otherwise just clear draft status
  return websiteRepo.clearDraft(shopId);
}

module.exports = {
  getWebsiteSettings,
  updateWebsiteSettings,
  publishSettings,
  saveDraft,
  discardDraft,
};