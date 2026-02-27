const campaignRepo = require('../repositories/marketing-campaigns');
const { DomainError } = require('../errors/domain-error');

const ALLOWED_CHANNELS = ['email', 'facebook', 'instagram', 'tiktok', 'google_ads', 'sms'];
const ALLOWED_STATUSES = ['draft', 'scheduled', 'launched', 'paused', 'completed'];

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

function getCampaign(shopId, campaignId) {
  const campaign = campaignRepo.findByIdAndShop(campaignId, shopId);
  if (!campaign) {
    throw new DomainError('CAMPAIGN_NOT_FOUND', 'campaign not found', 404);
  }
  return campaign;
}

function updateCampaignStatus({ shopId, campaignId, status, scheduled_at }) {
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new DomainError('VALIDATION_ERROR', `status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  const campaign = getCampaign(shopId, campaignId);
  const patch = { status };

  if (status === 'scheduled') {
    if (!scheduled_at) {
      throw new DomainError('VALIDATION_ERROR', 'scheduled_at is required when status is scheduled', 400);
    }
    patch.scheduled_at = scheduled_at;
  }

  if (status === 'launched') {
    patch.launched_at = new Date().toISOString();
  }

  return campaignRepo.updateCampaign(campaign, patch);
}

function ingestPerformance({ shopId, campaignId, metrics }) {
  const campaign = getCampaign(shopId, campaignId);
  if (!metrics || typeof metrics !== 'object') {
    throw new DomainError('VALIDATION_ERROR', 'metrics object is required', 400);
  }

  return campaignRepo.updatePerformance(campaign, metrics);
}

module.exports = {
  createCampaign,
  createAIDraftCampaign,
  listCampaigns,
  getCampaign,
  updateCampaignStatus,
  ingestPerformance,
};
