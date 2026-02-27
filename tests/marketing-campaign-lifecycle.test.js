const test = require('node:test');
const assert = require('node:assert/strict');
const marketingService = require('../src/services/marketing-campaigns');

test('marketing campaign lifecycle supports status update and performance ingest', () => {
  const campaign = marketingService.createCampaign({
    shopId: 'shop_1',
    createdBy: 'user_shop_admin',
    campaign_name: `Lifecycle Campaign ${Date.now()}`,
    channel: 'instagram',
    objective: 'Increase engagement',
    content: { caption: 'New launch', cta: 'Shop now' },
    targeting: { segment: 'all' },
  });

  const scheduled = marketingService.updateCampaignStatus({
    shopId: 'shop_1',
    campaignId: campaign.id,
    status: 'scheduled',
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
  });
  assert.equal(scheduled.status, 'scheduled');

  const launched = marketingService.updateCampaignStatus({
    shopId: 'shop_1',
    campaignId: campaign.id,
    status: 'launched',
  });
  assert.equal(launched.status, 'launched');
  assert.equal(typeof launched.launched_at, 'string');

  const withPerf = marketingService.ingestPerformance({
    shopId: 'shop_1',
    campaignId: campaign.id,
    metrics: { impressions: 1000, clicks: 120, conversions: 11 },
  });
  assert.equal(withPerf.performance.clicks, 120);
});
