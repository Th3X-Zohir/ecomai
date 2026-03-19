-- 004-add-password-changed-at-and-indexes.sql
-- Adds password_changed_at to users for refresh token revocation
-- Adds composite index on usage_tracking for atomic concurrent access
-- Adds index on refresh_tokens.expires_at for cleanup performance

-- Users: add password_changed_at for refresh token invalidation on password change
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Index on usage_tracking (shop_id, metric, period, period_start) — used in atomic check-and-increment
CREATE INDEX IF NOT EXISTS idx_usage_tracking_shop_metric_period
  ON usage_tracking (shop_id, metric, period, period_start);

-- Index on refresh_tokens.expires_at — used in hourly cleanup query
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON refresh_tokens (expires_at);

-- Index on orders.shop_id + orders.status — used in dashboard/reporting queries
CREATE INDEX IF NOT EXISTS idx_orders_shop_status
  ON orders (shop_id, status);

-- Index on products.shop_id + products.status — used in storefront product listing
CREATE INDEX IF NOT EXISTS idx_products_shop_status
  ON products (shop_id, status) WHERE deleted_at IS NULL;

-- Index on customers.shop_id — used in customer listing and lookup
CREATE INDEX IF NOT EXISTS idx_customers_shop_id
  ON customers (shop_id);
