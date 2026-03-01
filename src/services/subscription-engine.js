/**
 * Subscription Engine — resolves a shop's active plan and its limits.
 * All plan-related lookups flow through here. Zero hardcoded plan data.
 *
 * Key design decisions:
 *  - Plans are always loaded from DB via subscription_plans table
 *  - Shop's active subscription is resolved from shop_subscriptions
 *  - Limits are enforced atomically against usage_tracking
 *  - -1 means unlimited for any numeric limit
 */

const db = require('../db');
const { DomainError } = require('../errors/domain-error');

// ── Plan cache (invalidated on plan CRUD) ─────────────────
let _planCache = null;
let _planCacheAt = 0;
const PLAN_CACHE_TTL = 60_000; // 1 minute

function invalidatePlanCache() {
  _planCache = null;
  _planCacheAt = 0;
}

async function getAllPlans() {
  if (_planCache && Date.now() - _planCacheAt < PLAN_CACHE_TTL) return _planCache;
  const res = await db.query('SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC');
  _planCache = res.rows;
  _planCacheAt = Date.now();
  return _planCache;
}

async function getPlanBySlug(slug) {
  const plans = await getAllPlans();
  return plans.find(p => p.slug === slug) || null;
}

async function getPlanById(id) {
  const plans = await getAllPlans();
  return plans.find(p => p.id === id) || null;
}

// ── Resolve a shop's active subscription ──────────────────

/**
 * Get the active subscription + plan for a shop.
 * Falls back to the 'free' plan if no active subscription exists.
 *
 * @param {string} shopId
 * @returns {{ subscription: object, plan: object }}
 */
async function resolveShopPlan(shopId) {
  if (!shopId) return { subscription: null, plan: await getPlanBySlug('free') };

  // Look up active subscription
  const subRes = await db.query(
    `SELECT ss.*, sp.slug AS plan_slug, sp.name AS plan_name,
            sp.product_limit, sp.order_limit, sp.staff_limit,
            sp.image_limit_per_product, sp.features, sp.limits_json,
            sp.trial_days
     FROM shop_subscriptions ss
     JOIN subscription_plans sp ON sp.id = ss.plan_id
     WHERE ss.shop_id = $1 AND ss.status IN ('active', 'trialing')
     LIMIT 1`,
    [shopId]
  );

  if (subRes.rows[0]) {
    const sub = subRes.rows[0];

    // Check if subscription has expired (current_period_end has passed)
    if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
      // Subscription expired — mark it and fall through to free plan
      await db.query(
        `UPDATE shop_subscriptions SET status = 'expired', updated_at = now() WHERE id = $1 AND status IN ('active', 'trialing')`,
        [sub.id]
      );
      await db.query(
        `INSERT INTO subscription_audit_log (shop_id, action, old_plan_slug, new_plan_slug, details)
         VALUES ($1, 'expire', $2, 'free', '{"reason":"period_end_passed"}')`,
        [shopId, sub.plan_slug]
      );
      // Fall through to free plan below
    } else {
      return {
        subscription: sub,
        plan: {
          id: sub.plan_id,
          slug: sub.plan_slug,
          name: sub.plan_name,
          product_limit: sub.product_limit,
          order_limit: sub.order_limit,
          staff_limit: sub.staff_limit,
          image_limit_per_product: sub.image_limit_per_product,
          features: sub.features || [],
          limits_json: sub.limits_json || {},
          trial_days: sub.trial_days,
        },
      };
    }
  }

  // Fallback: read from shops.subscription_plan TEXT field
  const shopRes = await db.query('SELECT subscription_plan FROM shops WHERE id = $1', [shopId]);
  const planSlug = shopRes.rows[0]?.subscription_plan || 'free';
  const plan = await getPlanBySlug(planSlug) || await getPlanBySlug('free');

  return { subscription: null, plan };
}

// ── Usage tracking (atomic, concurrent-safe) ──────────────

/**
 * Get the current usage count for a metric.
 * @param {string} shopId
 * @param {string} metric - 'products' (lifetime) or 'orders_monthly' (monthly)
 * @returns {number}
 */
async function getUsage(shopId, metric) {
  let periodClause = "AND period = 'lifetime'";
  if (metric === 'orders_monthly') {
    periodClause = "AND period = 'monthly' AND period_start = date_trunc('month', now())";
  }
  const res = await db.query(
    `SELECT count FROM usage_tracking WHERE shop_id = $1 AND metric = $2 ${periodClause}`,
    [shopId, metric]
  );
  return Number(res.rows[0]?.count || 0);
}

/**
 * Atomically increment a usage counter. Uses INSERT ... ON CONFLICT for safety.
 * @param {string} shopId
 * @param {string} metric
 * @param {number} delta - usually +1 or -1
 * @param {object} [client] - optional DB client for transactions
 */
async function incrementUsage(shopId, metric, delta = 1, client = null) {
  const q = client ? client.query.bind(client) : db.query.bind(db);

  if (metric === 'orders_monthly') {
    await q(
      `INSERT INTO usage_tracking (shop_id, metric, count, period, period_start, updated_at)
       VALUES ($1, $2, GREATEST(0, $3), 'monthly', date_trunc('month', now()), now())
       ON CONFLICT (shop_id, metric, period, period_start)
       DO UPDATE SET count = GREATEST(0, usage_tracking.count + $3), updated_at = now()`,
      [shopId, metric, delta]
    );
  } else {
    await q(
      `INSERT INTO usage_tracking (shop_id, metric, count, period, period_start, updated_at)
       VALUES ($1, $2, GREATEST(0, $3), 'lifetime', '1970-01-01'::timestamptz, now())
       ON CONFLICT (shop_id, metric, period, period_start)
       DO UPDATE SET count = GREATEST(0, usage_tracking.count + $3), updated_at = now()`,
      [shopId, metric, delta]
    );
  }
}

// ── Limit checking ────────────────────────────────────────

/**
 * Check if the shop is within a plan limit. Returns true if allowed.
 * -1 means unlimited.
 *
 * @param {string} shopId
 * @param {string} metric - 'products' | 'orders_monthly' | 'staff'
 * @returns {{ allowed: boolean, current: number, limit: number, plan: string }}
 */
async function checkLimit(shopId, metric) {
  const { plan } = await resolveShopPlan(shopId);

  let limit;
  switch (metric) {
    case 'products':   limit = plan.product_limit; break;
    case 'orders_monthly': limit = plan.order_limit; break;
    case 'staff':      limit = plan.staff_limit; break;
    case 'images_per_product': limit = plan.image_limit_per_product; break;
    default:
      // Check limits_json for extensible limits
      limit = plan.limits_json?.[metric] ?? -1;
  }

  // -1 = unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1, plan: plan.slug };
  }

  const current = await getUsage(shopId, metric);
  return {
    allowed: current < limit,
    current,
    limit,
    plan: plan.slug,
  };
}

/**
 * Atomically check limit AND increment usage in a single transaction.
 * Prevents race conditions where two concurrent requests both pass the check.
 * Returns { allowed, current, limit, plan } — if allowed, usage is already incremented.
 *
 * @param {string} shopId
 * @param {string} metric
 * @param {number} delta - usually 1
 * @returns {{ allowed: boolean, current: number, limit: number, plan: string }}
 */
async function checkAndIncrement(shopId, metric, delta = 1) {
  const { plan } = await resolveShopPlan(shopId);

  let limit;
  switch (metric) {
    case 'products':   limit = plan.product_limit; break;
    case 'orders_monthly': limit = plan.order_limit; break;
    case 'staff':      limit = plan.staff_limit; break;
    case 'images_per_product': limit = plan.image_limit_per_product; break;
    default:
      limit = plan.limits_json?.[metric] ?? -1;
  }

  // -1 = unlimited — just increment without checking
  if (limit === -1) {
    await incrementUsage(shopId, metric, delta);
    return { allowed: true, current: 0, limit: -1, plan: plan.slug };
  }

  // Atomic check-and-increment via advisory lock within a transaction
  const result = await db.withTransaction(async (client) => {
    // Advisory lock based on shop_id hash + metric hash to prevent concurrent access
    const lockKey = Math.abs(hashCode(`${shopId}:${metric}`)) % 2147483647;
    await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);

    // Read current usage within the lock
    let periodClause = "AND period = 'lifetime'";
    if (metric === 'orders_monthly') {
      periodClause = "AND period = 'monthly' AND period_start = date_trunc('month', now())";
    }
    const usageRes = await client.query(
      `SELECT count FROM usage_tracking WHERE shop_id = $1 AND metric = $2 ${periodClause}`,
      [shopId, metric]
    );
    const current = Number(usageRes.rows[0]?.count || 0);

    if (current >= limit) {
      return { allowed: false, current, limit, plan: plan.slug };
    }

    // Increment within same transaction
    await incrementUsage(shopId, metric, delta, client);
    return { allowed: true, current: current + delta, limit, plan: plan.slug };
  });

  return result;
}

/**
 * Simple string hash for advisory lock key generation.
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Check if a shop has access to a specific feature.
 * @param {string} shopId
 * @param {string} feature - e.g. 'custom_domain', 'api_access', 'marketing_tools'
 * @returns {{ allowed: boolean, plan: string, features: string[] }}
 */
async function checkFeature(shopId, feature) {
  const { plan } = await resolveShopPlan(shopId);
  const features = Array.isArray(plan.features) ? plan.features : [];
  return {
    allowed: features.includes(feature),
    plan: plan.slug,
    features,
  };
}

// ── Subscription lifecycle ────────────────────────────────

/**
 * Activate a subscription for a shop (used during registration and upgrades).
 * Cancels any existing active subscription first.
 */
async function activateSubscription(shopId, planSlug, billingCycle = 'monthly', actorId = null) {
  const plan = await getPlanBySlug(planSlug);
  if (!plan) throw new DomainError('PLAN_NOT_FOUND', `Plan "${planSlug}" not found`, 400);

  return db.withTransaction(async (client) => {
    // Deactivate current active subscription
    const oldSub = await client.query(
      `UPDATE shop_subscriptions SET status = 'cancelled', cancelled_at = now(), updated_at = now()
       WHERE shop_id = $1 AND status IN ('active', 'trialing') RETURNING *`,
      [shopId]
    );
    const oldPlanId = oldSub.rows[0]?.plan_id;
    let oldPlanSlug = null;
    if (oldPlanId) {
      const oldPlan = await getPlanById(oldPlanId);
      oldPlanSlug = oldPlan?.slug;
    }

    // Calculate period end
    const periodEnd = billingCycle === 'yearly'
      ? "now() + interval '1 year'"
      : "now() + interval '1 month'";

    // Create new subscription
    const sub = await client.query(
      `INSERT INTO shop_subscriptions (shop_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
       VALUES ($1, $2, 'active', $3, now(), ${periodEnd}) RETURNING *`,
      [shopId, plan.id, billingCycle]
    );

    // Update shops.subscription_plan text for backward compatibility
    await client.query(
      `UPDATE shops SET subscription_plan = $1, updated_at = now() WHERE id = $2`,
      [planSlug, shopId]
    );

    // Audit log
    await client.query(
      `INSERT INTO subscription_audit_log (shop_id, actor_id, action, old_plan_slug, new_plan_slug, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [shopId, actorId, oldPlanSlug ? 'upgrade' : 'activate', oldPlanSlug, planSlug,
       JSON.stringify({ billing_cycle: billingCycle })]
    );

    invalidatePlanCache();
    return sub.rows[0];
  });
}

/**
 * Cancel a shop's subscription. Optionally set to expire at period end.
 */
async function cancelSubscription(shopId, immediate = false, actorId = null) {
  return db.withTransaction(async (client) => {
    const subRes = await client.query(
      `SELECT ss.*, sp.slug AS plan_slug FROM shop_subscriptions ss
       JOIN subscription_plans sp ON sp.id = ss.plan_id
       WHERE ss.shop_id = $1 AND ss.status IN ('active', 'trialing')`,
      [shopId]
    );
    const sub = subRes.rows[0];
    if (!sub) throw new DomainError('NO_ACTIVE_SUBSCRIPTION', 'No active subscription for this shop', 400);

    if (immediate) {
      await client.query(
        `UPDATE shop_subscriptions SET status = 'cancelled', cancelled_at = now(), updated_at = now()
         WHERE id = $1`,
        [sub.id]
      );
      // Revert to free plan
      await client.query(`UPDATE shops SET subscription_plan = 'free', updated_at = now() WHERE id = $1`, [shopId]);
    } else {
      // Mark for cancellation at period end
      await client.query(
        `UPDATE shop_subscriptions SET cancelled_at = now(), updated_at = now() WHERE id = $1`,
        [sub.id]
      );
    }

    await client.query(
      `INSERT INTO subscription_audit_log (shop_id, actor_id, action, old_plan_slug, new_plan_slug, details)
       VALUES ($1, $2, 'cancel', $3, $4, $5)`,
      [shopId, actorId, sub.plan_slug, immediate ? 'free' : sub.plan_slug,
       JSON.stringify({ immediate, was_billing_cycle: sub.billing_cycle })]
    );

    return { cancelled: true, immediate };
  });
}

/**
 * Get all usage metrics for a shop in one call.
 */
async function getShopUsageSummary(shopId) {
  const [{ plan }, productUsage, orderUsage, staffUsage] = await Promise.all([
    resolveShopPlan(shopId),
    getUsage(shopId, 'products'),
    getUsage(shopId, 'orders_monthly'),
    getUsage(shopId, 'staff'),
  ]);

  // Cross-check: also count from live DB as fallback (usage_tracking may drift)
  const staffRes = await db.query(
    `SELECT COUNT(*)::int FROM users WHERE shop_id = $1 AND role IN ('shop_admin', 'shop_user') AND is_active = true`,
    [shopId]
  );
  const liveStaffCount = staffRes.rows[0]?.count || 0;
  // Use the larger of tracked vs live (self-healing)
  const staffCount = Math.max(staffUsage, liveStaffCount);

  return {
    plan: plan.slug,
    planName: plan.name,
    products: { current: productUsage, limit: plan.product_limit, unlimited: plan.product_limit === -1 },
    orders: { current: orderUsage, limit: plan.order_limit, unlimited: plan.order_limit === -1 },
    staff: { current: staffCount, limit: plan.staff_limit, unlimited: plan.staff_limit === -1 },
    features: plan.features || [],
  };
}

module.exports = {
  // Plan lookups
  getAllPlans,
  getPlanBySlug,
  getPlanById,
  invalidatePlanCache,

  // Shop plan resolution
  resolveShopPlan,

  // Usage tracking
  getUsage,
  incrementUsage,

  // Limit & feature checking
  checkLimit,
  checkFeature,
  checkAndIncrement,

  // Subscription lifecycle
  activateSubscription,
  cancelSubscription,

  // Combined usage
  getShopUsageSummary,
};
