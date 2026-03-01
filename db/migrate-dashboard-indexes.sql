-- Dashboard performance indexes
-- These composite indexes dramatically speed up the admin dashboard queries

-- Orders by shop+status (dashboard status breakdown, order listing)
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON orders (shop_id, status);

-- Payments by shop+status+created (revenue timeline, payment stats)
CREATE INDEX IF NOT EXISTS idx_payments_shop_status_created ON payments (shop_id, status, created_at);

-- Order items by shop+product (top products query)
CREATE INDEX IF NOT EXISTS idx_order_items_shop_product ON order_items (shop_id, product_id);

-- Customers by shop (customer count)
CREATE INDEX IF NOT EXISTS idx_customers_shop ON customers (shop_id);

-- Products by shop+status (active product count, product listing)
CREATE INDEX IF NOT EXISTS idx_products_shop_status ON products (shop_id, status);

-- Newsletter subscribers by shop+status (newsletter admin)
CREATE INDEX IF NOT EXISTS idx_newsletter_shop_status ON newsletter_subscribers (shop_id, status);

-- Reviews by shop+approved (review admin listing)
CREATE INDEX IF NOT EXISTS idx_reviews_shop_approved ON product_reviews (shop_id, is_approved);

-- Inventory movements by shop+created (inventory listing with date range)
CREATE INDEX IF NOT EXISTS idx_inventory_shop_created ON inventory_movements (shop_id, created_at DESC);
