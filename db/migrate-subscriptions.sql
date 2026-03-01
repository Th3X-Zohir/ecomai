-- ============================================================
-- Ecomai Dynamic Subscription Engine — Migration
-- Upgrades subscription system from hardcoded to fully dynamic
-- ============================================================

-- ── 1. Enhance subscription_plans with richer metadata ───
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_popular BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS trial_days INT NOT NULL DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS staff_limit INT NOT NULL DEFAULT 1;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS image_limit_per_product INT NOT NULL DEFAULT 10;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- limits JSON: extensible key-value limits (future-proof)
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS limits_json JSONB NOT NULL DEFAULT '{}';

-- ── 2. Add shop_subscriptions table for lifecycle tracking ──
CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_id       UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','trialing','past_due','cancelled','expired','suspended')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end   TIMESTAMPTZ,
  trial_ends_at        TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active subscription per shop at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_subscriptions_active
  ON shop_subscriptions (shop_id) WHERE status IN ('active', 'trialing');

-- ── 3. Usage tracking table (atomic counters) ──────────────
CREATE TABLE IF NOT EXISTS usage_tracking (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  metric     TEXT NOT NULL,
  count      BIGINT NOT NULL DEFAULT 0,
  period     TEXT NOT NULL DEFAULT 'lifetime',
  period_start TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, metric, period)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_shop ON usage_tracking (shop_id, metric);

-- ── 4. Subscription audit log ──────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  old_plan_slug TEXT,
  new_plan_slug TEXT,
  details       JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_shop ON subscription_audit_log (shop_id, created_at DESC);

-- ── 5. Add FK from shops.subscription_plan to subscription_plans.slug ──
-- First normalize existing data
UPDATE shops SET subscription_plan = 'free' WHERE subscription_plan IS NULL OR subscription_plan = '';
UPDATE shops SET subscription_plan = 'growth' WHERE subscription_plan = 'professional';
UPDATE shops SET subscription_plan = 'growth' WHERE subscription_plan = 'pro';

-- ── 6. Normalize plan seeds to match across the system ─────
-- Fix the 'professional' plan to 'growth' if it exists
UPDATE subscription_plans SET slug = 'growth', name = 'Growth' WHERE slug = 'professional';

-- Upsert correct plan data
INSERT INTO subscription_plans (id, name, slug, price_monthly, price_yearly, product_limit, order_limit, staff_limit, image_limit_per_product, features, sort_order, is_popular, trial_days, tagline, description, is_active)
VALUES
  ('00000000-0000-0000-0002-000000000001', 'Free', 'free', 0, 0, 25, 50, 1, 5,
   '["basic_analytics","email_support"]', 0, FALSE, 0,
   'Perfect to start', 'Get started with your online business — zero commitment.', TRUE),
  ('00000000-0000-0000-0002-000000000002', 'Starter', 'starter', 999, 9990, 250, 500, 3, 10,
   '["basic_analytics","custom_domain","email_support","priority_support"]', 1, FALSE, 14,
   'For growing businesses', 'Everything you need to grow your online store.', TRUE),
  ('00000000-0000-0000-0002-000000000003', 'Growth', 'growth', 2499, 24990, -1, -1, 10, 20,
   '["basic_analytics","custom_domain","priority_support","api_access","advanced_analytics","marketing_tools"]', 2, TRUE, 14,
   'Most popular', 'Unlimited power for rapidly scaling businesses.', TRUE),
  ('00000000-0000-0000-0002-000000000004', 'Enterprise', 'enterprise', 9990, 99900, -1, -1, -1, -1,
   '["basic_analytics","custom_domain","priority_support","api_access","advanced_analytics","marketing_tools","dedicated_account_manager","sla","white_label"]', 3, FALSE, 30,
   'For large operations', 'Custom solutions and dedicated support for enterprises.', TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  product_limit = EXCLUDED.product_limit,
  order_limit = EXCLUDED.order_limit,
  staff_limit = EXCLUDED.staff_limit,
  image_limit_per_product = EXCLUDED.image_limit_per_product,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  is_popular = EXCLUDED.is_popular,
  trial_days = EXCLUDED.trial_days,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ── 7. Bootstrap shop_subscriptions for all existing shops ──
INSERT INTO shop_subscriptions (shop_id, plan_id, status, billing_cycle, current_period_start)
SELECT s.id, sp.id, 'active', 'monthly', s.created_at
FROM shops s
JOIN subscription_plans sp ON sp.slug = s.subscription_plan
WHERE NOT EXISTS (
  SELECT 1 FROM shop_subscriptions ss WHERE ss.shop_id = s.id AND ss.status IN ('active', 'trialing')
);

-- ── 8. Bootstrap usage tracking for existing shops ──────────
INSERT INTO usage_tracking (shop_id, metric, count, period)
SELECT s.id, 'products', (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id), 'lifetime'
FROM shops s
WHERE NOT EXISTS (SELECT 1 FROM usage_tracking ut WHERE ut.shop_id = s.id AND ut.metric = 'products');

INSERT INTO usage_tracking (shop_id, metric, count, period, period_start)
SELECT s.id, 'orders_monthly',
  (SELECT COUNT(*) FROM orders o WHERE o.shop_id = s.id AND o.created_at >= date_trunc('month', now())),
  'monthly', date_trunc('month', now())
FROM shops s
WHERE NOT EXISTS (SELECT 1 FROM usage_tracking ut WHERE ut.shop_id = s.id AND ut.metric = 'orders_monthly' AND ut.period_start = date_trunc('month', now()));

-- Done
