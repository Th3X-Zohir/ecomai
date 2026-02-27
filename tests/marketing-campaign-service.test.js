const test = require('node:test');
const assert = require('node:assert/strict');
const marketingService = require('../src/services/marketing-campaigns');

test('createAIDraftCampaign creates draft campaign with generated content', () => {
  const campaign = marketingService.createAIDraftCampaign({
    shopId: 'shop_1',
    shopName: 'Demo Coffee',
    createdBy: 'user_shop_admin',
    campaign_name: `Weekend Boost ${Date.now()}`,
    channel: 'email',
    objective: 'Increase repeat orders',
    productSummary: 'single-origin beans',
    targeting: { segment: 'returning_customers' },
  });

  assert.equal(campaign.shop_id, 'shop_1');
  assert.equal(campaign.channel, 'email');
  assert.equal(campaign.status, 'draft');
  assert.equal(typeof campaign.content.headline, 'string');
  assert.equal(campaign.targeting.segment, 'returning_customers');
});
