-- ============================================================
-- Migration 005: Analytics Tables — Merchant Benchmarking Engine
-- ============================================================

-- ── Weekly shop metrics snapshot ───────────────────────────
-- Aggregated weekly KPIs per shop. Enables period-over-period
-- comparison AND peer group benchmarking.
CREATE TABLE IF NOT EXISTS shop_metrics_snapshot (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  week_start      DATE NOT NULL,  -- Monday of the snapshot week
  -- Order KPIs
  total_orders    INT NOT NULL DEFAULT 0,
  completed_orders INT NOT NULL DEFAULT 0,
  cancelled_orders INT NOT NULL DEFAULT 0,
  aov             NUMERIC(12,2) NOT NULL DEFAULT 0,  -- average order value
  total_revenue   NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Customer KPIs
  new_customers   INT NOT NULL DEFAULT 0,
  returning_rate  NUMERIC(5,4) NOT NULL DEFAULT 0,  -- 0.25 = 25% of customers ordered again
  total_customers INT NOT NULL DEFAULT 0,
  -- Fulfillment KPIs
  avg_fulfillment_days NUMERIC(4,1) NOT NULL DEFAULT 0,
  -- Product KPIs
  products_sold_count INT NOT NULL DEFAULT 0,
  unique_products_sold INT NOT NULL DEFAULT 0,
  -- Computed at snapshot time
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, week_start)
);

-- ── Customer lifetime metrics ───────────────────────────────
-- Updated on each order. Used for LTV, churn risk, RFM scoring.
CREATE TABLE IF NOT EXISTS customer_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  total_orders        INT NOT NULL DEFAULT 0,
  total_spent         NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_order_value     NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_order_at       TIMESTAMPTZ,
  first_order_at      TIMESTAMPTZ,
  days_since_last_order INT,  -- NULL if never ordered
  order_frequency_days INT,   -- avg days between orders (NULL if < 2 orders)
  ltv_score           NUMERIC(10,2) NOT NULL DEFAULT 0,  -- lifetime value
  churn_risk          TEXT NOT NULL DEFAULT 'active' CHECK (churn_risk IN ('active', 'at_risk', 'churned')),
  rfm_tier            INT,  -- 1-5 RFM score (1=best, 5=worst)
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, shop_id)
);

-- ── Affiliate Programs ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  commission_type     TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value    NUMERIC(10,2) NOT NULL DEFAULT 5,  -- % or fixed BDT
  commission_order_limit INT,  -- max commissions per affiliate (NULL = unlimited)
  min_payout          NUMERIC(10,2) NOT NULL DEFAULT 200,
  payout_schedule     TEXT NOT NULL DEFAULT 'on_demand' CHECK (payout_schedule IN ('on_demand', 'weekly', 'monthly')),
  cookie_days         INT NOT NULL DEFAULT 7,  -- referral link validity
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Affiliates (promoters) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,  -- NULL for anonymous promoters
  email           TEXT NOT NULL,
  referral_code   TEXT NOT NULL,
  display_name    TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  total_referrals INT NOT NULL DEFAULT 0,
  total_earned    NUMERIC(12,2) NOT NULL DEFAULT 0,
  unpaid_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, referral_code)
);

-- ── Tracked Referrals ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id        UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  referred_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id            UUID REFERENCES orders(id) ON DELETE SET NULL,
  commission_status   TEXT NOT NULL DEFAULT 'pending' CHECK (commission_status IN ('pending', 'approved', 'paid', 'cancelled')),
  commission_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  order_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at             TIMESTAMPTZ
);

-- ── Upsell Rules (shop-configured) ─────────────────────────
CREATE TABLE IF NOT EXISTS upsell_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  trigger_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  trigger_type    TEXT NOT NULL CHECK (trigger_type IN ('bought', 'viewed', 'cart_abandoned')),
  upsell_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  upsell_type     TEXT NOT NULL CHECK (upsell_type IN ('product', 'category', 'bundle')),
  discount_type   TEXT CHECK (discount_type IN ('percentage', 'fixed', NULL)),
  discount_value  NUMERIC(10,2),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  priority        INT NOT NULL DEFAULT 0,
  display_text    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Global product co-occurrence cache ─────────────────────
-- Aggregated cross-shop product co-occurrence for upsell suggestions.
-- Refreshed nightly. Anonymized — no shop-specific data.
CREATE TABLE IF NOT EXISTS product_cooccurrence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_a_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_b_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  coorder_count   INT NOT NULL DEFAULT 0,  -- how many times bought together
  confidence      NUMERIC(5,4) NOT NULL DEFAULT 0,  -- support/confidence score
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  refreshed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_a_id, product_b_id)
);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shop_metrics_shop_week ON shop_metrics_snapshot(shop_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_shop_metrics_week ON shop_metrics_snapshot(week_start);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_shop ON customer_metrics(shop_id);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_customer ON customer_metrics(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_churn ON customer_metrics(shop_id, churn_risk);
CREATE INDEX IF NOT EXISTS idx_affiliate_program_shop ON affiliate_programs(shop_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_shop ON affiliates(shop_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(shop_id, referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_shop ON affiliate_referrals(shop_id);
CREATE INDEX IF NOT EXISTS idx_upsell_rules_shop ON upsell_rules(shop_id);
CREATE INDEX IF NOT EXISTS idx_upsell_rules_trigger ON upsell_rules(trigger_product_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cooccurrence_product ON product_cooccurrence(product_a_id);
