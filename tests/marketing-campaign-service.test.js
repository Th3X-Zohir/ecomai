const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId, adminUserId } = require('./helpers/setup');
const marketingService = require('../src/services/marketing-campaigns');

describe('marketing campaign service', () => {
  before(setup);
  after(teardown);

  it('creates AI draft campaign with generated content', async () => {
    const campaign = await marketingService.createAIDraftCampaign({
      shopId, shopName: 'Test Shop',
      name: `Weekend Boost ${Date.now()}`, type: 'email',
      objective: 'Increase repeat orders', productSummary: 'single-origin beans',
    });
    assert.equal(campaign.shop_id, shopId);
    assert.equal(campaign.type, 'email');
    assert.equal(campaign.status, 'draft');
    assert.equal(typeof campaign.content.headline, 'string');
  });
});