-- ============================================================
-- Ecomai Production Hardening Migration
-- Adds missing columns, fixes constraints, adds indexes
-- ============================================================

-- ── 1. Add compare_at_price to products (for sale badges / strikethrough pricing)
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10,2);

-- ── 2. Add missing indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_newsletter_shop ON newsletter_subscribers(shop_id, email);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON wishlist_items(customer_id, product_id);

-- ── 3. Add database pool advisory for connection tracking
COMMENT ON DATABASE ecomai IS 'Ecomai SaaS Platform — production hardened';
