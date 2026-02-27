const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId, adminUserId } = require('./helpers/setup');
const marketingService = require('../src/services/marketing-campaigns');

describe('marketing campaign lifecycle', () => {
  before(setup);
  after(teardown);

  let campaignId;

  it('creates a campaign', async () => {
    const campaign = await marketingService.createCampaign({
      shopId,
      name: `Lifecycle ${Date.now()}`, type: 'instagram',
      content: { headline: 'New launch', body: 'Check it out', cta: 'Shop now' },
    });
    assert.ok(campaign.id);
    campaignId = campaign.id;
  });

  it('gets and updates a campaign', async () => {
    const fetched = await marketingService.getCampaign(shopId, campaignId);
    assert.equal(fetched.id, campaignId);

    const updated = await marketingService.updateCampaign(shopId, campaignId, { status: 'active' });
    assert.equal(updated.status, 'active');
  });
});