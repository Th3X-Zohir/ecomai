const campaignRepo = require('../repositories/marketing-campaigns');
const { DomainError } = require('../errors/domain-error');

const ALLOWED_TYPES = ['email', 'sms', 'facebook', 'instagram', 'tiktok', 'google_ads'];

function generateDraftContent({ shopName, type, objective, productSummary }) {
  const headline = `${shopName}: ${objective || 'Grow your sales'} with ${productSummary || 'our curated products'}`;
  const body = `Discover what makes ${shopName} special. Limited-time offers available now.`;
  const cta = type === 'email' ? 'Shop now' : 'Learn more';
  return { headline, body, cta };
}

async function createCampaign({ shopId, name, type, subject, content, audience_filter, scheduled_at }) {
  if (!name || !type) {
    throw new DomainError('VALIDATION_ERROR', 'name and type are required', 400);
  }
  if (!ALLOWED_TYPES.includes(type)) {
    throw new DomainError('VALIDATION_ERROR', `type must be one of: ${ALLOWED_TYPES.join(', ')}`, 400);
  }
  return campaignRepo.createCampaign({
    shop_id: shopId, name, type, subject, content, audience_filter, scheduled_at,
  });
}

async function createAIDraftCampaign({ shopId, shopName, name, type, objective, productSummary, audience_filter }) {
  const content = generateDraftContent({ shopName, type, objective, productSummary });
  return createCampaign({ shopId, name, type, content, audience_filter });
}

async function listCampaigns(shopId, opts) {
  return campaignRepo.listByShop(shopId, opts);
}

async function getCampaign(shopId, campaignId) {
  const campaign = await campaignRepo.findByIdAndShop(campaignId, shopId);
  if (!campaign) throw new DomainError('CAMPAIGN_NOT_FOUND', 'Campaign not found', 404);
  return campaign;
}

async function updateCampaign(shopId, campaignId, patch) {
  await getCampaign(shopId, campaignId);
  return campaignRepo.updateCampaign(campaignId, patch);
}

module.exports = { createCampaign, createAIDraftCampaign, listCampaigns, getCampaign, updateCampaign };