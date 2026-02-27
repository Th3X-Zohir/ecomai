-- ============================================================
-- Ecomai — Seed Data
-- ============================================================

-- Subscription plans
INSERT INTO subscription_plans (id, name, slug, price_monthly, price_yearly, product_limit, order_limit, features) VALUES
  ('00000000-0000-0000-0010-000000000001', 'Free', 'free', 0, 0, 10, 50, '["Basic storefront", "5 templates", "Email support"]'),
  ('00000000-0000-0000-0010-000000000002', 'Starter', 'starter', 999, 9990, 100, 500, '["Everything in Free", "SSLCommerz payments", "Custom CSS", "Priority email support"]'),
  ('00000000-0000-0000-0010-000000000003', 'Growth', 'growth', 2499, 24990, 10000, 100000, '["Everything in Starter", "Marketing campaigns", "Analytics dashboard", "Phone support"]'),
  ('00000000-0000-0000-0010-000000000004', 'Enterprise', 'enterprise', 0, 0, 999999, 999999, '["Everything in Growth", "Custom domain", "Dedicated support", "SLA guarantee"]')
ON CONFLICT (slug) DO NOTHING;

-- Demo shops
INSERT INTO shops (id, name, slug, status, industry, subscription_plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Coffee', 'demo-coffee', 'active', 'food_beverage', 'starter'),
  ('00000000-0000-0000-0000-000000000002', 'Demo Fashion', 'demo-fashion', 'active', 'fashion', 'starter')
ON CONFLICT (slug) DO NOTHING;

-- Demo users (password = password123, bcrypt hash)
INSERT INTO users (id, shop_id, email, password_hash, full_name, role) VALUES
  ('00000000-0000-0000-0001-000000000001', NULL, 'super@ecomai.dev', '$2a$10$3yrJSMnL0/Y6CkVTcwgLiuleaUYiLClt5Gq87SlYM.8YKq/GdTav.', 'Super Admin', 'super_admin'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'admin@coffee.dev', '$2a$10$3yrJSMnL0/Y6CkVTcwgLiuleaUYiLClt5Gq87SlYM.8YKq/GdTav.', 'Coffee Admin', 'shop_admin'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'staff@coffee.dev', '$2a$10$3yrJSMnL0/Y6CkVTcwgLiuleaUYiLClt5Gq87SlYM.8YKq/GdTav.', 'Coffee Staff', 'shop_user'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'driver@ecomai.dev', '$2a$10$3yrJSMnL0/Y6CkVTcwgLiuleaUYiLClt5Gq87SlYM.8YKq/GdTav.', 'Demo Driver', 'delivery_agent')
ON CONFLICT (email) DO NOTHING;

-- Set shop owners
UPDATE shops SET owner_user_id = '00000000-0000-0000-0001-000000000002' WHERE id = '00000000-0000-0000-0000-000000000001';

-- Default website settings
INSERT INTO website_settings (shop_id, template) VALUES
  ('00000000-0000-0000-0000-000000000001', 'starter'),
  ('00000000-0000-0000-0000-000000000002', 'starter')
ON CONFLICT (shop_id) DO NOTHING;

-- Demo products for coffee shop
INSERT INTO products (id, shop_id, name, slug, base_price, description, category, status, stock_quantity) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'Ethiopian Yirgacheffe', 'ethiopian-yirgacheffe', 18.99, 'Bright, fruity single-origin coffee with notes of blueberry and jasmine.', 'Coffee', 'active', 100),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'Colombian Supremo', 'colombian-supremo', 15.99, 'Smooth, balanced medium roast with caramel and chocolate notes.', 'Coffee', 'active', 250),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000001', 'Ceramic Pour-Over Set', 'ceramic-pour-over-set', 42.00, 'Handmade pour-over dripper with matching mug. Perfect for home brewing.', 'Accessories', 'active', 50),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000001', 'Espresso Blend', 'espresso-blend', 16.50, 'Rich and bold espresso blend with dark chocolate and walnut finish.', 'Coffee', 'active', 180)
ON CONFLICT (shop_id, slug) DO NOTHING;
