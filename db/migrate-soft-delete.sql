-- Soft delete: add deleted_at column to key tables
-- Products, orders, and customers get soft delete support

ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Partial indexes: only index non-deleted rows for efficient queries
CREATE INDEX IF NOT EXISTS idx_products_active ON products (shop_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders (shop_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers (shop_id) WHERE deleted_at IS NULL;
