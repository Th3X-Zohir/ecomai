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
  return marketingCampaigns.find((entry) => entry.id === id && entry.shop_id === shopId);
}

module.exports = { createCampaign, listByShop, findByIdAndShop };
