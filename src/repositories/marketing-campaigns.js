const { marketingCampaigns, createId } = require('../store');

function createCampaign({ shop_id, campaign_name, channel, objective, content, targeting, created_by }) {
  const now = new Date().toISOString();
  const campaign = {
    id: createId('mkt'),
    shop_id,
    campaign_name,
    channel,
    objective: objective || null,
    content,
    targeting: targeting || {},
    status: 'draft',
    performance: {},
    scheduled_at: null,
    launched_at: null,
    created_by: created_by || null,
    created_at: now,
    updated_at: now,
  };

  marketingCampaigns.push(campaign);
  return campaign;
}

function listByShop(shopId) {
  return marketingCampaigns.filter((entry) => entry.shop_id === shopId);
}

function findByIdAndShop(id, shopId) {
  return marketingCampaigns.find((entry) => entry.id === id && entry.shop_id === shopId) || null;
}

function updateCampaign(campaign, patch) {
  const allowed = ['campaign_name', 'objective', 'content', 'targeting', 'status', 'scheduled_at', 'launched_at'];
  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      campaign[key] = patch[key];
    }
  });
  campaign.updated_at = new Date().toISOString();
  return campaign;
}

function updatePerformance(campaign, metrics) {
  campaign.performance = {
    ...campaign.performance,
    ...metrics,
    updated_at: new Date().toISOString(),
  };
  campaign.updated_at = new Date().toISOString();
  return campaign;
}

module.exports = { createCampaign, listByShop, findByIdAndShop, updateCampaign, updatePerformance };
