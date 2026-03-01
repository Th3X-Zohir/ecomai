-- ═══════════════════════════════════════════════════════════
-- Migration: Fix usage_tracking UNIQUE constraint for month boundaries
-- The old UNIQUE(shop_id, metric, period) allowed only ONE monthly row per
-- shop+metric.  New months would conflict instead of creating a new row.
-- Fix: UNIQUE(shop_id, metric, period, period_start) so each month gets its own row.
-- ═══════════════════════════════════════════════════════════

-- 1. Backfill NULL period_start for lifetime rows (required for new UNIQUE)
UPDATE usage_tracking
SET period_start = '1970-01-01'::timestamptz
WHERE period = 'lifetime' AND period_start IS NULL;

-- 2. Backfill NULL period_start for monthly rows that somehow lack it
UPDATE usage_tracking
SET period_start = date_trunc('month', updated_at)
WHERE period = 'monthly' AND period_start IS NULL;

-- 3. Make period_start NOT NULL with a safe default
ALTER TABLE usage_tracking
ALTER COLUMN period_start SET DEFAULT '1970-01-01'::timestamptz;

ALTER TABLE usage_tracking
ALTER COLUMN period_start SET NOT NULL;

-- 4. Drop old constraint and create new one
ALTER TABLE usage_tracking
DROP CONSTRAINT IF EXISTS usage_tracking_shop_id_metric_period_key;

ALTER TABLE usage_tracking
DROP CONSTRAINT IF EXISTS usage_tracking_shop_metric_period_start_key;

ALTER TABLE usage_tracking
ADD CONSTRAINT usage_tracking_shop_metric_period_start_key
UNIQUE (shop_id, metric, period, period_start);

-- 5. Add index for efficient monthly lookups
CREATE INDEX IF NOT EXISTS idx_usage_tracking_monthly
ON usage_tracking (shop_id, metric, period_start)
WHERE period = 'monthly';
