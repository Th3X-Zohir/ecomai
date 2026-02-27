const campaignRepo = require('../repositories/marketing-campaigns');
const { DomainError } = require('../errors/domain-error');

const ALLOWED_CHANNELS = ['email', 'facebook', 'instagram', 'tiktok', 'google_ads', 'sms'];

function generateDraftContent({ shopName, channel, objective, productSummary }) {
  const headline = `${shopName}: ${objective || 'Grow your sales'} with ${productSummary || 'our curated products'}`;
  const body = `Discover what makes ${shopName} special. Limited-time offers available now.`;
  const cta = channel === 'email' ? 'Shop now' : 'Learn more';

  return { headline, body, cta };
}

function createCampaign({ shopId, createdBy, campaign_name, channel, objective, content, targeting }) {
  if (!campaign_name || !channel) {
    throw new DomainError('VALIDATION_ERROR', 'campaign_name and channel are required', 400);
  }

  if (!ALLOWED_CHANNELS.includes(channel)) {
    throw new DomainError('VALIDATION_ERROR', `channel must be one of: ${ALLOWED_CHANNELS.join(', ')}`, 400);
  }

  if (!content || typeof content !== 'object') {
    throw new DomainError('VALIDATION_ERROR', 'content object is required', 400);
  }

  return campaignRepo.createCampaign({
    shop_id: shopId,
    campaign_name,
    channel,
    objective,
    content,
    targeting,
    created_by: createdBy,
  });
}

function createAIDraftCampaign({ shopId, shopName, createdBy, campaign_name, channel, objective, productSummary, targeting }) {
  const content = generateDraftContent({ shopName, channel, objective, productSummary });
  return createCampaign({
    shopId,
    createdBy,
    campaign_name,
    channel,
    objective,
    content,
    targeting,
  });
}

function listCampaigns(shopId) {
  return campaignRepo.listByShop(shopId);
}

module.exports = { createCampaign, createAIDraftCampaign, listCampaigns };
