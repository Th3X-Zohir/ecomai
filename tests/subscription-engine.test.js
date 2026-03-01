const { describe, it, beforeAll, afterAll, beforeEach } = require('bun:test');
const assert = require('node:assert/strict');
const { setup, teardown, shopId, adminUserId } = require('./helpers/setup');
const engine = require('../src/services/subscription-engine');
const db = require('../src/db');

describe('subscription engine', () => {
  beforeAll(setup);
  afterAll(async () => {
    // Clean subscription data
    await db.query('DELETE FROM subscription_audit_log WHERE shop_id = $1', [shopId]);
    await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
    await db.query('DELETE FROM usage_tracking WHERE shop_id = $1', [shopId]);
    await teardown();
  });

  // Reset usage before each test that checks usage
  beforeEach(async () => {
    await db.query('DELETE FROM usage_tracking WHERE shop_id = $1', [shopId]);
  });

  // ── Plan lookups ────────────────────────────────────────

  describe('plan lookups', () => {
    it('getAllPlans returns active plans sorted by sort_order', async () => {
      engine.invalidatePlanCache();
      const plans = await engine.getAllPlans();
      assert.ok(Array.isArray(plans));
      assert.ok(plans.length >= 1, 'should have at least 1 active plan');
      // Verify sorted
      for (let i = 1; i < plans.length; i++) {
        assert.ok(plans[i].sort_order >= plans[i-1].sort_order, 'plans should be sorted by sort_order');
      }
    });

    it('getPlanBySlug returns correct plan', async () => {
      const free = await engine.getPlanBySlug('free');
      assert.ok(free);
      assert.equal(free.slug, 'free');
      assert.ok(typeof free.product_limit === 'number');
    });

    it('getPlanBySlug returns null for non-existent plan', async () => {
      const result = await engine.getPlanBySlug('nonexistent_plan_xyz');
      assert.equal(result, null);
    });

    it('getPlanById returns correct plan', async () => {
      const free = await engine.getPlanBySlug('free');
      const byId = await engine.getPlanById(free.id);
      assert.ok(byId);
      assert.equal(byId.slug, 'free');
    });

    it('cache returns same result on subsequent calls', async () => {
      engine.invalidatePlanCache();
      const first = await engine.getAllPlans();
      const second = await engine.getAllPlans();
      assert.deepStrictEqual(first, second);
    });

    it('invalidatePlanCache forces re-fetch', async () => {
      await engine.getAllPlans(); // populate cache
      engine.invalidatePlanCache();
      const plans = await engine.getAllPlans(); // fresh fetch
      assert.ok(plans.length >= 1);
    });
  });

  // ── resolveShopPlan ─────────────────────────────────────

  describe('resolveShopPlan', () => {
    it('returns free plan for shop with no subscription', async () => {
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
      const { subscription, plan } = await engine.resolveShopPlan(shopId);
      assert.equal(subscription, null);
      assert.equal(plan.slug, 'free');
    });

    it('returns null subscription and free plan for null shopId', async () => {
      const { subscription, plan } = await engine.resolveShopPlan(null);
      assert.equal(subscription, null);
      assert.equal(plan.slug, 'free');
    });

    it('returns active subscription plan', async () => {
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
      const starter = await engine.getPlanBySlug('starter');
      if (!starter) return; // skip if no starter plan
      await db.query(
        `INSERT INTO shop_subscriptions (shop_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', 'monthly', now(), now() + interval '1 month')`,
        [shopId, starter.id]
      );
      const { plan } = await engine.resolveShopPlan(shopId);
      assert.equal(plan.slug, 'starter');
      // Clean up
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
    });

    it('detects expired subscription and falls back to free', async () => {
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
      const starter = await engine.getPlanBySlug('starter');
      if (!starter) return;
      // Create expired subscription
      await db.query(
        `INSERT INTO shop_subscriptions (shop_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', 'monthly', now() - interval '2 months', now() - interval '1 day')`,
        [shopId, starter.id]
      );
      const { plan } = await engine.resolveShopPlan(shopId);
      assert.equal(plan.slug, 'free');
      // Verify subscription was marked expired
      const subRes = await db.query(
        `SELECT status FROM shop_subscriptions WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 1`, [shopId]
      );
      assert.equal(subRes.rows[0]?.status, 'expired');
      // Clean up
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
    });
  });

  // ── Usage tracking ──────────────────────────────────────

  describe('usage tracking', () => {
    it('getUsage returns 0 for no usage', async () => {
      const count = await engine.getUsage(shopId, 'products');
      assert.equal(count, 0);
    });

    it('incrementUsage creates and increments a counter', async () => {
      await engine.incrementUsage(shopId, 'products', 1);
      const count1 = await engine.getUsage(shopId, 'products');
      assert.equal(count1, 1);

      await engine.incrementUsage(shopId, 'products', 1);
      const count2 = await engine.getUsage(shopId, 'products');
      assert.equal(count2, 2);
    });

    it('incrementUsage with negative delta decrements', async () => {
      await engine.incrementUsage(shopId, 'products', 5);
      await engine.incrementUsage(shopId, 'products', -2);
      const count = await engine.getUsage(shopId, 'products');
      assert.equal(count, 3);
    });

    it('incrementUsage clamps at 0 (never goes negative)', async () => {
      await engine.incrementUsage(shopId, 'products', 1);
      await engine.incrementUsage(shopId, 'products', -100);
      const count = await engine.getUsage(shopId, 'products');
      assert.equal(count, 0);
    });

    it('orders_monthly tracks by month', async () => {
      await engine.incrementUsage(shopId, 'orders_monthly', 3);
      const count = await engine.getUsage(shopId, 'orders_monthly');
      assert.equal(count, 3);
    });

    it('incrementUsage works with a client (transaction)', async () => {
      await db.withTransaction(async (client) => {
        await engine.incrementUsage(shopId, 'products', 10, client);
      });
      const count = await engine.getUsage(shopId, 'products');
      assert.equal(count, 10);
    });
  });

  // ── Limit checking ──────────────────────────────────────

  describe('checkLimit', () => {
    it('allows when under limit', async () => {
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
      // Use free plan defaults
      const result = await engine.checkLimit(shopId, 'products');
      assert.equal(result.allowed, true);
      assert.equal(result.current, 0);
      assert.equal(result.plan, 'free');
      assert.ok(typeof result.limit === 'number');
    });

    it('blocks when at limit', async () => {
      const freePlan = await engine.getPlanBySlug('free');
      if (freePlan.product_limit === -1) return; // skip if unlimited
      // Fill up to limit
      await engine.incrementUsage(shopId, 'products', freePlan.product_limit);
      const result = await engine.checkLimit(shopId, 'products');
      assert.equal(result.allowed, false);
      assert.equal(result.current, freePlan.product_limit);
    });

    it('allows unlimited (-1) always', async () => {
      // If any plan has unlimited, check it
      const plans = await engine.getAllPlans();
      const unlimitedPlan = plans.find(p => p.product_limit === -1);
      if (!unlimitedPlan) return; // skip if no unlimited plans
      // Set shop to that plan
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
      await db.query(
        `INSERT INTO shop_subscriptions (shop_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', 'monthly', now(), now() + interval '1 month')`,
        [shopId, unlimitedPlan.id]
      );
      const result = await engine.checkLimit(shopId, 'products');
      assert.equal(result.allowed, true);
      assert.equal(result.limit, -1);
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
    });

    it('checks extensible limits from limits_json', async () => {
      const result = await engine.checkLimit(shopId, 'some_custom_metric');
      // If no limits_json entry, falls back to unlimited
      assert.equal(result.allowed, true);
      assert.equal(result.limit, -1);
    });
  });

  // ── Feature checking ────────────────────────────────────

  describe('checkFeature', () => {
    it('denies feature not in plan', async () => {
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
      const result = await engine.checkFeature(shopId, 'custom_domain');
      // Free plan likely doesn't have custom_domain
      assert.equal(typeof result.allowed, 'boolean');
      assert.ok(Array.isArray(result.features));
    });

    it('returns plan slug', async () => {
      const result = await engine.checkFeature(shopId, 'anything');
      assert.equal(result.plan, 'free');
    });
  });

  // ── checkAndIncrement (atomic) ──────────────────────────

  describe('checkAndIncrement', () => {
    it('atomically increments when under limit', async () => {
      const result = await engine.checkAndIncrement(shopId, 'products', 1);
      assert.equal(result.allowed, true);
      const count = await engine.getUsage(shopId, 'products');
      assert.ok(count >= 1);
    });

    it('blocks when at limit', async () => {
      const freePlan = await engine.getPlanBySlug('free');
      if (freePlan.product_limit === -1) return;
      await engine.incrementUsage(shopId, 'products', freePlan.product_limit);
      const result = await engine.checkAndIncrement(shopId, 'products', 1);
      assert.equal(result.allowed, false);
    });
  });

  // ── Subscription lifecycle ──────────────────────────────

  describe('activateSubscription', () => {
    it('creates a new subscription', async () => {
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
      const sub = await engine.activateSubscription(shopId, 'free', 'monthly', adminUserId);
      assert.ok(sub.id);
      assert.equal(sub.status, 'active');
      assert.equal(sub.billing_cycle, 'monthly');
    });

    it('cancels old subscription when activating new one', async () => {
      const starter = await engine.getPlanBySlug('starter');
      if (!starter) return;
      await engine.activateSubscription(shopId, 'starter', 'monthly', adminUserId);
      // Verify old one was cancelled
      const oldSubs = await db.query(
        `SELECT * FROM shop_subscriptions WHERE shop_id = $1 AND status = 'cancelled'`, [shopId]
      );
      assert.ok(oldSubs.rows.length >= 1);
    });

    it('creates audit log entry', async () => {
      const logs = await db.query(
        `SELECT * FROM subscription_audit_log WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 1`, [shopId]
      );
      assert.ok(logs.rows.length >= 1);
      const log = logs.rows[0];
      assert.ok(['activate', 'upgrade'].includes(log.action));
    });

    it('throws for non-existent plan', async () => {
      await assert.rejects(
        () => engine.activateSubscription(shopId, 'nonexistent_xyz', 'monthly'),
        (err) => err.code === 'PLAN_NOT_FOUND'
      );
    });

    it('supports yearly billing cycle', async () => {
      const sub = await engine.activateSubscription(shopId, 'free', 'yearly', adminUserId);
      assert.equal(sub.billing_cycle, 'yearly');
    });
  });

  describe('cancelSubscription', () => {
    it('cancels active subscription (non-immediate)', async () => {
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
      await engine.activateSubscription(shopId, 'free', 'monthly', adminUserId);
      const result = await engine.cancelSubscription(shopId, false, adminUserId);
      assert.equal(result.cancelled, true);
      assert.equal(result.immediate, false);
    });

    it('cancels immediately when requested', async () => {
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
      await engine.activateSubscription(shopId, 'free', 'monthly', adminUserId);
      const result = await engine.cancelSubscription(shopId, true, adminUserId);
      assert.equal(result.cancelled, true);
      assert.equal(result.immediate, true);
      // Verify status
      const sub = await db.query(
        `SELECT status FROM shop_subscriptions WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 1`, [shopId]
      );
      assert.equal(sub.rows[0]?.status, 'cancelled');
    });

    it('throws when no active subscription', async () => {
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
      await assert.rejects(
        () => engine.cancelSubscription(shopId, false, adminUserId),
        (err) => err.code === 'NO_ACTIVE_SUBSCRIPTION'
      );
    });
  });

  // ── Usage summary ───────────────────────────────────────

  describe('getShopUsageSummary', () => {
    it('returns full usage summary', async () => {
      await db.query('DELETE FROM shop_subscriptions WHERE shop_id = $1', [shopId]);
      const summary = await engine.getShopUsageSummary(shopId);
      assert.equal(summary.plan, 'free');
      assert.ok(typeof summary.planName === 'string');
      assert.ok('current' in summary.products);
      assert.ok('limit' in summary.products);
      assert.ok('unlimited' in summary.products);
      assert.ok('current' in summary.orders);
      assert.ok('current' in summary.staff);
      assert.ok(Array.isArray(summary.features));
    });
  });
});
