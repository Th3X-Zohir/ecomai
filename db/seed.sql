-- ============================================================
-- Ecomai Comprehensive Seed Data
-- Creates a fully loaded "Demo Coffee" shop with realistic data
-- ============================================================

-- Use the existing demo-coffee shop: 00000000-0000-0000-0000-000000000001
-- Admin user: 00000000-0000-0000-0001-000000000002 (admin@coffee.dev)
-- Driver:     00000000-0000-0000-0001-000000000004

-- Clean existing demo data (idempotent re-seed)
DELETE FROM inventory_movements  WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM delivery_requests    WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM refunds              WHERE shop_id IN (SELECT id FROM payments WHERE shop_id = '00000000-0000-0000-0000-000000000001');
DELETE FROM payments             WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM order_items          WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM orders               WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM product_images       WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM product_variants     WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM products             WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM categories           WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM customers            WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM marketing_campaigns  WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM website_settings     WHERE shop_id = '00000000-0000-0000-0000-000000000001';

-- ── Categories ─────────────────────────────────────────────
INSERT INTO categories (id, shop_id, name, slug, description, sort_order, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Coffee Beans',     'coffee-beans',     'Premium single-origin and blended coffee beans',     1, 'active'),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Brewing Equipment', 'brewing-equipment', 'Pour-over, French press, espresso tools',             2, 'active'),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Accessories',      'accessories',      'Mugs, grinders, filters, and more',                   3, 'active'),
  ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Gift Sets',        'gift-sets',        'Curated gift boxes for coffee lovers',                 4, 'active'),
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Tea & Others',     'tea-others',       'Premium teas and alternative beverages',               5, 'active');

-- ── Products ───────────────────────────────────────────────
INSERT INTO products (id, shop_id, name, slug, base_price, description, category_id, status, image_url, stock_quantity) VALUES
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Ethiopian Yirgacheffe',     'ethiopian-yirgacheffe',     1890, 'Bright, fruity single-origin beans from the birthplace of coffee. Notes of blueberry, jasmine, and citrus.',              'a0000000-0000-0000-0000-000000000001', 'active', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop', 120),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Colombian Supremo',         'colombian-supremo',         1590, 'Rich, full-bodied Colombian beans with caramel sweetness. Perfect for espresso and drip coffee.',                        'a0000000-0000-0000-0000-000000000001', 'active', 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=400&h=400&fit=crop', 200),
  ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Sumatra Mandheling',        'sumatra-mandheling',        1790, 'Earthy, full-bodied Indonesian coffee with low acidity. Dark chocolate and herbal notes.',                               'a0000000-0000-0000-0000-000000000001', 'active', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefda?w=400&h=400&fit=crop', 85),
  ('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Kenya AA',                  'kenya-aa',                  2190, 'Bold, wine-like Kenyan coffee with bright acidity. Black currant, tomato, and brown sugar notes.',                       'a0000000-0000-0000-0000-000000000001', 'active', 'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=400&h=400&fit=crop', 65),
  ('b0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'House Espresso Blend',      'house-espresso-blend',      1450, 'Our signature blend — smooth, balanced, and perfect for any brewing method. Chocolate and nut forward.',                 'a0000000-0000-0000-0000-000000000001', 'active', 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=400&h=400&fit=crop', 300),
  ('b0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Guatemala Antigua',         'guatemala-antigua',         1690, 'Volcanic-grown beans with smoky, spicy complexity. Full body with cocoa and cinnamon notes.',                            'a0000000-0000-0000-0000-000000000001', 'active', 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=400&h=400&fit=crop', 95),
  ('b0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Ceramic Pour-Over Dripper', 'ceramic-pour-over-dripper', 3200, 'Handmade ceramic dripper with spiral ridges for optimal extraction. Fits standard #2 filters.',                          'a0000000-0000-0000-0000-000000000002', 'active', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop', 45),
  ('b0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'French Press 800ml',       'french-press-800ml',       2800, 'Double-wall stainless steel French press. Keeps coffee hot for hours. Dishwasher safe.',                                  'a0000000-0000-0000-0000-000000000002', 'active', 'https://images.unsplash.com/photo-1572119865084-43c285814d63?w=400&h=400&fit=crop', 60),
  ('b0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Gooseneck Kettle',         'gooseneck-kettle',         4500, 'Temperature-controlled electric gooseneck kettle. Precise pour control for pour-over brewing.',                           'a0000000-0000-0000-0000-000000000002', 'active', 'https://images.unsplash.com/photo-1570087935869-e10fe879a3bc?w=400&h=400&fit=crop', 30),
  ('b0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'AeroPress Go',             'aeropress-go',             3500, 'Compact, travel-friendly AeroPress. Brews smooth espresso-style coffee anywhere.',                                       'a0000000-0000-0000-0000-000000000002', 'active', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop', 40),
  ('b0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Ceramic Travel Mug',       'ceramic-travel-mug',       1200, 'Double-wall ceramic travel mug with silicone lid. 12oz capacity.',                                                        'a0000000-0000-0000-0000-000000000003', 'active', 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=400&h=400&fit=crop', 150),
  ('b0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Manual Burr Grinder',      'manual-burr-grinder',      2500, 'Stainless steel manual grinder with adjustable coarseness for any brew method.',                                          'a0000000-0000-0000-0000-000000000003', 'active', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&h=400&fit=crop', 55),
  ('b0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Digital Coffee Scale',     'digital-coffee-scale',     1800, 'Precision scale with timer. 0.1g accuracy for perfect ratios.',                                                           'a0000000-0000-0000-0000-000000000003', 'active', 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=400&h=400&fit=crop', 70),
  ('b0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Paper Filters (100 pack)', 'paper-filters-100',         450, 'Natural unbleached paper filters for pour-over drippers.',                                                                'a0000000-0000-0000-0000-000000000003', 'active', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=400&fit=crop', 500),
  ('b0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Coffee Lover Starter Kit', 'starter-kit',              5900, 'Everything to start: Pour-over dripper, grinder, 250g beans, and filters.',                                               'a0000000-0000-0000-0000-000000000004', 'active', 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400&h=400&fit=crop', 25),
  ('b0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'Premium Tasting Box',      'premium-tasting-box',      3900, '4 x 100g single-origin beans with tasting notes card.',                                                                   'a0000000-0000-0000-0000-000000000004', 'active', 'https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=400&h=400&fit=crop', 35),
  ('b0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'Japanese Matcha Ceremonial','japanese-matcha',          2200, 'Stone-ground ceremonial grade matcha from Uji, Kyoto. Smooth, umami-rich.',                                               'a0000000-0000-0000-0000-000000000005', 'active', 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=400&fit=crop', 80),
  ('b0000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'Earl Grey Reserve',        'earl-grey-reserve',         950, 'Premium loose-leaf Earl Grey with real bergamot oil. 100g tin.',                                                           'a0000000-0000-0000-0000-000000000005', 'active', 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400&h=400&fit=crop', 120);

-- ── Product Variants ───────────────────────────────────────
INSERT INTO product_variants (id, shop_id, product_id, sku, title, attributes, price, inventory_qty) VALUES
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ETH-250', '250g Bag',   '{"size":"250g","grind":"Whole Bean"}', 1890, 60),
  ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ETH-500', '500g Bag',   '{"size":"500g","grind":"Whole Bean"}', 3500, 40),
  ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ETH-1K',  '1kg Bag',    '{"size":"1kg","grind":"Whole Bean"}',  6200, 20),
  ('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'COL-250', '250g Bag',   '{"size":"250g","grind":"Whole Bean"}', 1590, 100),
  ('c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'COL-500', '500g Bag',   '{"size":"500g","grind":"Whole Bean"}', 2900, 70),
  ('c0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'COL-1K',  '1kg Bag',    '{"size":"1kg","grind":"Whole Bean"}',  5200, 30),
  ('c0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'HEB-250', '250g Bag',   '{"size":"250g","grind":"Whole Bean"}', 1450, 150),
  ('c0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'HEB-500', '500g Bag',   '{"size":"500g","grind":"Whole Bean"}', 2650, 100),
  ('c0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'HEB-1K',  '1kg Bag',    '{"size":"1kg","grind":"Whole Bean"}',  4800, 50),
  ('c0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 'MUG-WHT', 'White',      '{"color":"White"}',                   1200, 50),
  ('c0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 'MUG-BLK', 'Matte Black','{"color":"Matte Black"}',             1200, 50),
  ('c0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 'MUG-SAG', 'Sage Green', '{"color":"Sage Green"}',              1300, 50);

-- ── Customers ──────────────────────────────────────────────
INSERT INTO customers (id, shop_id, email, full_name, phone, is_registered, addresses, password_hash) VALUES
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'amina.rahman@gmail.com',    'Amina Rahman',    '+8801711234567', TRUE,  '[{"label":"Home","street":"12/A Dhanmondi R/A, Road 7","city":"Dhaka","zip":"1205","phone":"+8801711234567"}]', '$2a$10$dummyhashforseeddata000000000000placeholder12345678'),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'karim.ahmed@yahoo.com',     'Karim Ahmed',     '+8801812345678', TRUE,  '[{"label":"Home","street":"45 Gulshan Avenue, Block C","city":"Dhaka","zip":"1212","phone":"+8801812345678"}]', '$2a$10$dummyhashforseeddata000000000000placeholder12345678'),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'sarah.chen@hotmail.com',    'Sarah Chen',      '+8801913456789', TRUE,  '[{"label":"Office","street":"78 Banani Road 11","city":"Dhaka","zip":"1213","phone":"+8801913456789"}]', '$2a$10$dummyhashforseeddata000000000000placeholder12345678'),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'rafi.hossain@gmail.com',    'Rafi Hossain',    '+8801614567890', TRUE,  '[{"label":"Home","street":"23 Uttara Sector 6","city":"Dhaka","zip":"1230","phone":"+8801614567890"}]', '$2a$10$dummyhashforseeddata000000000000placeholder12345678'),
  ('d0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'nadia.islam@gmail.com',     'Nadia Islam',     '+8801515678901', TRUE,  '[{"label":"Home","street":"56 Mirpur DOHS","city":"Dhaka","zip":"1216","phone":"+8801515678901"}]', '$2a$10$dummyhashforseeddata000000000000placeholder12345678'),
  ('d0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'tanvir.alam@outlook.com',   'Tanvir Alam',     '+8801716789012', TRUE,  '[{"label":"Home","street":"89 Mohammadpur","city":"Dhaka","zip":"1207","phone":"+8801716789012"}]', '$2a$10$dummyhashforseeddata000000000000placeholder12345678'),
  ('d0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'fatima.begum@gmail.com',    'Fatima Begum',    '+8801817890123', TRUE,  '[{"label":"Home","street":"34 Wari Old Town","city":"Dhaka","zip":"1203","phone":"+8801817890123"}]', '$2a$10$dummyhashforseeddata000000000000placeholder12345678'),
  ('d0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'imran.khan@gmail.com',      'Imran Khan',      '+8801918901234', FALSE, '[]', NULL),
  ('d0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'priya.das@yahoo.com',       'Priya Das',       '+8801619012345', TRUE,  '[{"label":"Home","street":"67 Chittagong CDA Area","city":"Chittagong","zip":"4000","phone":"+8801619012345"}]', '$2a$10$dummyhashforseeddata000000000000placeholder12345678'),
  ('d0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'arif.mohammad@gmail.com',   'Arif Mohammad',   '+8801520123456', TRUE,  '[{"label":"Home","street":"12 Sylhet Amberkhana","city":"Sylhet","zip":"3100","phone":"+8801520123456"}]', '$2a$10$dummyhashforseeddata000000000000placeholder12345678'),
  ('d0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'mitu.chowdhury@gmail.com',  'Mitu Chowdhury',  '+8801721234568', FALSE, '[]', NULL),
  ('d0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'zahid.hasan@gmail.com',     'Zahid Hasan',     '+8801822345679', TRUE,  '[{"label":"Home","street":"90 Rajshahi City Center","city":"Rajshahi","zip":"6000","phone":"+8801822345679"}]', '$2a$10$dummyhashforseeddata000000000000placeholder12345678');

-- ── Orders (20 orders) ────────────────────────────────────

-- 1: Delivered
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, notes, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'amina.rahman@gmail.com', 'delivered', 'paid', 3090, 0, 60, 0, 3150, '{"street":"12/A Dhanmondi R/A, Road 7","city":"Dhaka","zip":"1205","phone":"+8801711234567"}', 'Please leave at the door', now() - interval '25 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, variant_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Ethiopian Yirgacheffe (250g)', 1, 1890, 1890),
  ('f0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000010', 'Ceramic Travel Mug (White)', 1, 1200, 1200);

-- 2: Delivered
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'karim.ahmed@yahoo.com', 'delivered', 'paid', 7700, 0, 100, 0, 7800, '{"street":"45 Gulshan Avenue","city":"Dhaka","zip":"1212","phone":"+8801812345678"}', now() - interval '22 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000007', 'Ceramic Pour-Over Dripper', 1, 3200, 3200),
  ('f0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', 'Gooseneck Kettle', 1, 4500, 4500);

-- 3: Delivered
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'sarah.chen@hotmail.com', 'delivered', 'paid', 5900, 0, 80, 0, 5980, '{"street":"78 Banani Road 11","city":"Dhaka","zip":"1213","phone":"+8801913456789"}', now() - interval '20 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000015', 'Coffee Lover Starter Kit', 1, 5900, 5900);

-- 4: Shipped
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'rafi.hossain@gmail.com', 'shipped', 'paid', 5270, 0, 60, 0, 5330, '{"street":"23 Uttara Sector 6","city":"Dhaka","zip":"1230","phone":"+8801614567890"}', now() - interval '5 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, variant_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Ethiopian Yirgacheffe (250g)', 1, 1890, 1890),
  ('f0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 'Colombian Supremo (250g)', 1, 1590, 1590),
  ('f0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', NULL, 'Sumatra Mandheling', 1, 1790, 1790);

-- 5: Processing
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 'nadia.islam@gmail.com', 'processing', 'paid', 4700, 0, 60, 0, 4760, '{"street":"56 Mirpur DOHS","city":"Dhaka","zip":"1216","phone":"+8801515678901"}', now() - interval '2 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000017', 'Japanese Matcha Ceremonial', 1, 2200, 2200),
  ('f0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000012', 'Manual Burr Grinder', 1, 2500, 2500);

-- 6: Confirmed
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006', 'tanvir.alam@outlook.com', 'confirmed', 'paid', 6700, 0, 80, 0, 6780, '{"street":"89 Mohammadpur","city":"Dhaka","zip":"1207","phone":"+8801716789012"}', now() - interval '1 day');
INSERT INTO order_items (id, shop_id, order_id, product_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000016', 'Premium Tasting Box', 1, 3900, 3900),
  ('f0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000008', 'French Press 800ml', 1, 2800, 2800);

-- 7: Pending
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000007', 'fatima.begum@gmail.com', 'pending', 'unpaid', 6200, 0, 60, 0, 6260, '{"street":"34 Wari Old Town","city":"Dhaka","zip":"1203","phone":"+8801817890123"}', now() - interval '6 hours');
INSERT INTO order_items (id, shop_id, order_id, product_id, variant_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Ethiopian Yirgacheffe (1kg)', 1, 6200, 6200);

-- 8: Cancelled
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000008', 'imran.khan@gmail.com', 'cancelled', 'failed', 1450, 0, 60, 0, 1510, '{"street":"Unknown","city":"Dhaka","zip":"1200"}', now() - interval '18 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, variant_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000007', 'House Espresso Blend (250g)', 1, 1450, 1450);

-- 9: Delivered
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000009', 'priya.das@yahoo.com', 'delivered', 'paid', 4000, 0, 150, 0, 4150, '{"street":"67 CDA Area","city":"Chittagong","zip":"4000","phone":"+8801619012345"}', now() - interval '15 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000017', 'Japanese Matcha Ceremonial', 1, 2200, 2200),
  ('f0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000013', 'Digital Coffee Scale', 1, 1800, 1800);

-- 10: Delivered
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000010', 'arif.mohammad@gmail.com', 'delivered', 'paid', 8700, 0, 200, 0, 8900, '{"street":"12 Amberkhana","city":"Sylhet","zip":"3100","phone":"+8801520123456"}', now() - interval '12 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000015', 'Coffee Lover Starter Kit', 1, 5900, 5900),
  ('f0000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000008', 'French Press 800ml', 1, 2800, 2800);

-- 11: Delivered — Amina repeat
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'amina.rahman@gmail.com', 'delivered', 'paid', 5200, 0, 60, 0, 5260, '{"street":"12/A Dhanmondi R/A","city":"Dhaka","zip":"1205"}', now() - interval '10 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, variant_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000006', 'Colombian Supremo (1kg)', 1, 5200, 5200);

-- 12: Delivered
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000012', 'zahid.hasan@gmail.com', 'delivered', 'paid', 3200, 0, 200, 0, 3400, '{"street":"90 City Center","city":"Rajshahi","zip":"6000"}', now() - interval '8 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000007', 'Ceramic Pour-Over Dripper', 1, 3200, 3200);

-- 13: Shipped
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'karim.ahmed@yahoo.com', 'shipped', 'paid', 3900, 0, 60, 0, 3960, '{"street":"45 Gulshan Avenue","city":"Dhaka","zip":"1212"}', now() - interval '3 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000016', 'Premium Tasting Box', 1, 3900, 3900);

-- 14: Processing
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 'nadia.islam@gmail.com', 'processing', 'paid', 10280, 0, 80, 500, 9860, '{"street":"56 Mirpur DOHS","city":"Dhaka","zip":"1216"}', now() - interval '1 day');
INSERT INTO order_items (id, shop_id, order_id, product_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000004', 'Kenya AA', 2, 2190, 4380),
  ('f0000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000015', 'Coffee Lover Starter Kit', 1, 5900, 5900);

-- 15: Pending_payment
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000011', 'mitu.chowdhury@gmail.com', 'pending_payment', 'pending', 2650, 0, 60, 0, 2710, '{"street":"99 Banani DOHS","city":"Dhaka","zip":"1206"}', now() - interval '3 hours');
INSERT INTO order_items (id, shop_id, order_id, product_id, variant_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000008', 'House Espresso Blend (500g)', 1, 2650, 2650);

-- 16: Delivered
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'sarah.chen@hotmail.com', 'delivered', 'paid', 1300, 0, 60, 0, 1360, '{"street":"78 Banani Road 11","city":"Dhaka","zip":"1213"}', now() - interval '7 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, variant_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000012', 'Ceramic Travel Mug (Sage Green)', 1, 1300, 1300);

-- 17: Refunded
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006', 'tanvir.alam@outlook.com', 'refunded', 'refunded', 3500, 0, 60, 0, 3560, '{"street":"89 Mohammadpur","city":"Dhaka","zip":"1207"}', now() - interval '14 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000010', 'AeroPress Go', 1, 3500, 3500);

-- 18: Confirmed
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000007', 'fatima.begum@gmail.com', 'confirmed', 'paid', 2900, 0, 60, 0, 2960, '{"street":"34 Wari Old Town","city":"Dhaka","zip":"1203"}', now() - interval '4 hours');
INSERT INTO order_items (id, shop_id, order_id, product_id, variant_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000005', 'Colombian Supremo (500g)', 1, 2900, 2900);

-- 19: Shipped
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'rafi.hossain@gmail.com', 'shipped', 'paid', 950, 0, 60, 0, 1010, '{"street":"23 Uttara Sector 6","city":"Dhaka","zip":"1230"}', now() - interval '4 days');
INSERT INTO order_items (id, shop_id, order_id, product_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000018', 'Earl Grey Reserve', 1, 950, 950);

-- 20: Pending
INSERT INTO orders (id, shop_id, customer_id, customer_email, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, shipping_address, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000009', 'priya.das@yahoo.com', 'pending', 'unpaid', 7450, 0, 150, 0, 7600, '{"street":"67 CDA Area","city":"Chittagong","zip":"4000"}', now() - interval '1 hour');
INSERT INTO order_items (id, shop_id, order_id, product_id, variant_id, item_name, quantity, unit_price, line_total) VALUES
  ('f0000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Ethiopian Yirgacheffe (500g)', 2, 3500, 7000),
  ('f0000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000014', NULL, 'Paper Filters (100 pack)', 1, 450, 450);

-- ── Payments ───────────────────────────────────────────────
INSERT INTO payments (id, shop_id, order_id, amount, currency, method, status, gateway_tran_id, created_at) VALUES
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 3150,  'BDT', 'sslcommerz', 'completed', 'TXN2026020101', now() - interval '25 days'),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 7800,  'BDT', 'sslcommerz', 'completed', 'TXN2026020201', now() - interval '22 days'),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 5980,  'BDT', 'sslcommerz', 'completed', 'TXN2026020301', now() - interval '20 days'),
  ('70000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 5330,  'BDT', 'sslcommerz', 'completed', 'TXN2026022301', now() - interval '5 days'),
  ('70000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 4760,  'BDT', 'sslcommerz', 'completed', 'TXN2026022601', now() - interval '2 days'),
  ('70000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 6780,  'BDT', 'sslcommerz', 'completed', 'TXN2026022701', now() - interval '1 day'),
  ('70000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 1510,  'BDT', 'sslcommerz', 'failed',    'TXN2026021001', now() - interval '18 days'),
  ('70000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000009', 4150,  'BDT', 'sslcommerz', 'completed', 'TXN2026021301', now() - interval '15 days'),
  ('70000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000010', 8900,  'BDT', 'sslcommerz', 'completed', 'TXN2026021601', now() - interval '12 days'),
  ('70000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000011', 5260,  'BDT', 'sslcommerz', 'completed', 'TXN2026021801', now() - interval '10 days'),
  ('70000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000012', 3400,  'BDT', 'sslcommerz', 'completed', 'TXN2026022001', now() - interval '8 days'),
  ('70000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000013', 3960,  'BDT', 'sslcommerz', 'completed', 'TXN2026022501', now() - interval '3 days'),
  ('70000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000014', 9860,  'BDT', 'sslcommerz', 'completed', 'TXN2026022701B', now() - interval '1 day'),
  ('70000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000015', 2710,  'BDT', 'sslcommerz', 'pending',   NULL,              now() - interval '3 hours'),
  ('70000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000016', 1360,  'BDT', 'sslcommerz', 'completed', 'TXN2026022101', now() - interval '7 days'),
  ('70000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000017', 3560,  'BDT', 'sslcommerz', 'refunded',  'TXN2026021401', now() - interval '14 days'),
  ('70000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000018', 2960,  'BDT', 'sslcommerz', 'completed', 'TXN2026022802', now() - interval '4 hours'),
  ('70000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000019', 1010,  'BDT', 'sslcommerz', 'completed', 'TXN2026022401', now() - interval '4 days');

-- ── Refund ─────────────────────────────────────────────────
INSERT INTO refunds (id, shop_id, payment_id, amount, reason, status, created_at) VALUES
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000016', 3560, 'Customer received damaged product', 'completed', now() - interval '13 days');

-- ── Delivery Requests ──────────────────────────────────────
INSERT INTO delivery_requests (id, shop_id, order_id, assigned_driver_user_id, provider, status, pickup_address, dropoff_address, estimated_delivery, created_at) VALUES
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000004', 'internal', 'delivered',  '{"street":"Demo Coffee HQ, Gulshan","city":"Dhaka"}', '{"street":"12/A Dhanmondi R/A","city":"Dhaka","zip":"1205"}', now() - interval '24 days', now() - interval '25 days'),
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0001-000000000004', 'internal', 'delivered',  '{"street":"Demo Coffee HQ, Gulshan","city":"Dhaka"}', '{"street":"45 Gulshan Avenue","city":"Dhaka","zip":"1212"}', now() - interval '21 days', now() - interval '22 days'),
  ('90000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0001-000000000004', 'internal', 'delivered',  '{"street":"Demo Coffee HQ, Gulshan","city":"Dhaka"}', '{"street":"78 Banani Road 11","city":"Dhaka","zip":"1213"}', now() - interval '19 days', now() - interval '20 days'),
  ('90000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0001-000000000004', 'internal', 'in_transit', '{"street":"Demo Coffee HQ, Gulshan","city":"Dhaka"}', '{"street":"23 Uttara Sector 6","city":"Dhaka","zip":"1230"}', now() + interval '1 day',  now() - interval '5 days'),
  ('90000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', NULL,                                   'internal', 'pending',    '{"street":"Demo Coffee HQ, Gulshan","city":"Dhaka"}', '{"street":"56 Mirpur DOHS","city":"Dhaka","zip":"1216"}',    now() + interval '3 days', now() - interval '2 days'),
  ('90000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0001-000000000004', 'internal', 'assigned',   '{"street":"Demo Coffee HQ, Gulshan","city":"Dhaka"}', '{"street":"89 Mohammadpur","city":"Dhaka","zip":"1207"}',    now() + interval '2 days', now() - interval '1 day'),
  ('90000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0001-000000000004', 'internal', 'delivered',  '{"street":"Demo Coffee HQ, Gulshan","city":"Dhaka"}', '{"street":"67 CDA Area","city":"Chittagong","zip":"4000"}',  now() - interval '13 days', now() - interval '15 days'),
  ('90000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0001-000000000004', 'internal', 'in_transit', '{"street":"Demo Coffee HQ, Gulshan","city":"Dhaka"}', '{"street":"45 Gulshan Avenue","city":"Dhaka","zip":"1212"}', now() + interval '1 day',  now() - interval '3 days');

-- ── Inventory Movements ────────────────────────────────────
INSERT INTO inventory_movements (shop_id, product_id, variant_id, type, quantity, reason, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'initial',    200, 'Initial stock',       now() - interval '30 days'),
  ('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 'initial',    300, 'Initial stock',       now() - interval '30 days'),
  ('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000007', 'initial',    400, 'Initial stock',       now() - interval '30 days'),
  ('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', NULL,                                   'initial',    80,  'Initial stock',       now() - interval '30 days'),
  ('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000015', NULL,                                   'initial',    50,  'Initial stock',       now() - interval '30 days'),
  ('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'sale',       -5,  'Sales deduction',     now() - interval '20 days'),
  ('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 'sale',       -3,  'Sales deduction',     now() - interval '15 days'),
  ('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', NULL,                                   'sale',       -3,  'Sales deduction',     now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000015', NULL,                                   'sale',       -4,  'Sales deduction',     now() - interval '12 days'),
  ('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'restock',    50,  'Supplier restock',    now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', NULL,                                   'return',     1,   'Refund return #17',   now() - interval '13 days');

-- ── Marketing Campaigns ────────────────────────────────────
INSERT INTO marketing_campaigns (id, shop_id, name, type, subject, content, audience_filter, status, performance, created_by, scheduled_at, sent_at, created_at) VALUES
  ('aa000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Welcome New Customers', 'email', 'Welcome to Demo Coffee!', '{"body":"<h1>Welcome!</h1><p>Enjoy 10% off your first order with code WELCOME10.</p>","cta":"Shop Now","cta_url":"/store/demo-coffee"}', '{"type":"new_customers"}', 'active', '{"sent":45,"opened":32,"clicked":18}', '00000000-0000-0000-0001-000000000002', now() - interval '28 days', now() - interval '28 days', now() - interval '29 days'),
  ('aa000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'February Flash Sale', 'email', '20% OFF All Beans This Weekend!', '{"body":"<h1>Flash Sale!</h1><p>Get 20% off all coffee beans this weekend. Code: FLASH20</p>","cta":"Shop Beans","cta_url":"/store/demo-coffee/products"}', '{"type":"all"}', 'completed', '{"sent":120,"opened":78,"clicked":42,"revenue":25600}', '00000000-0000-0000-0001-000000000002', now() - interval '14 days', now() - interval '14 days', now() - interval '15 days'),
  ('aa000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'New Arrival: Kenya AA', 'sms', NULL, '{"body":"New arrival! Try our Kenya AA — bold, wine-like. Shop: demo-coffee.ecomai.dev"}', '{"type":"returning_customers"}', 'completed', '{"sent":67,"clicked":23}', '00000000-0000-0000-0001-000000000002', now() - interval '7 days', now() - interval '7 days', now() - interval '8 days'),
  ('aa000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'March Matcha Madness', 'email', 'Free Shipping on All Tea Orders!', '{"body":"<h1>March is Matcha Month!</h1><p>Free shipping on all tea and matcha orders.</p>","cta":"Shop Tea","cta_url":"/store/demo-coffee/products"}', '{"type":"all"}', 'draft', '{}', '00000000-0000-0000-0001-000000000002', now() + interval '2 days', NULL, now() - interval '1 day');

-- ── Website Settings (rich config) ─────────────────────────
INSERT INTO website_settings (shop_id, template, theme, header, footer, homepage, custom_css, seo_defaults, social_links, business_info, store_policies, announcement, trust_badges, currency_config, store_config, analytics, popup_config, countdown) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'modern_luxe',
  '{"primaryColor":"#7C3AED","secondaryColor":"#F59E0B","accentColor":"#10B981","fontHeading":"Playfair Display","fontBody":"Inter","borderRadius":"12","mode":"light"}',
  '{"nav_links":[{"label":"Home","url":"/"},{"label":"Shop","url":"/products"},{"label":"About","url":"/policy/about"},{"label":"Contact","url":"/policy/contact"}],"sticky":true,"transparent_hero":false}',
  '{"columns":[{"title":"Quick Links","links":[{"label":"Shop All","url":"/products"},{"label":"Gift Sets","url":"/products?category=gift-sets"},{"label":"About Us","url":"/policy/about"}]},{"title":"Help","links":[{"label":"Shipping Info","url":"/policy/shipping"},{"label":"Returns","url":"/policy/refund"},{"label":"Contact","url":"/policy/contact"}]}],"show_payment_icons":true,"payment_methods":["visa","mastercard","amex","bkash"],"copyright":"2026 Demo Coffee. Crafted with love in Dhaka."}',
  '{"hero_title":"Freshly Roasted, Delivered to Your Door","hero_subtitle":"Premium single-origin coffee beans, brewing equipment, and accessories. From farm to cup.","hero_cta":"Shop Now","hero_cta_url":"/products","hero_image":"https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1200&h=600&fit=crop","hero_overlay_color":"#000000","hero_overlay_opacity":0.4,"featured_title":"Best Sellers","featured_subtitle":"Our most loved products","featured_product_ids":["b0000000-0000-0000-0000-000000000001","b0000000-0000-0000-0000-000000000005","b0000000-0000-0000-0000-000000000015","b0000000-0000-0000-0000-000000000007"]}',
  '.store-hero h1 { text-shadow: 0 2px 4px rgba(0,0,0,0.3); }',
  '{"title":"Demo Coffee - Premium Coffee Beans & Equipment","description":"Shop premium single-origin coffee beans, brewing equipment, and accessories. Free shipping over 3000 BDT.","keywords":"coffee,beans,brewing,pour-over,espresso,dhaka"}',
  '{"facebook":"https://facebook.com/democoffee","instagram":"https://instagram.com/democoffee","twitter":"https://twitter.com/democoffee"}',
  '{"name":"Demo Coffee","email":"hello@democoffee.com","phone":"+880 1711-COFFEE","address":"42 Gulshan Avenue, Dhaka 1212, Bangladesh"}',
  '{"shipping":"We deliver across Bangladesh. Dhaka: 1-2 business days. Outside Dhaka: 3-5 business days. Free shipping on orders over 3,000 BDT.","refund":"Returns within 7 days for unopened products.","privacy":"Your data is only used for order processing. We never sell your information.","terms":"All prices in BDT. We reserve the right to modify prices.","about":"Demo Coffee was founded in 2024. We source directly from farmers globally, roasting fresh weekly in Dhaka.","contact":"Email hello@democoffee.com or call +880 1711-COFFEE. Roastery: 42 Gulshan Avenue, Dhaka. Sat-Thu 9am-8pm."}',
  '{"enabled":true,"text":"Free shipping on orders over 3,000 BDT! Use code FREESHIP","bg_color":"#7C3AED","text_color":"#FFFFFF","link_url":"/products","link_text":"Shop Now"}',
  '[{"text":"Free Shipping over 3,000 BDT","icon":"truck"},{"text":"100% Arabica Beans","icon":"coffee"},{"text":"Freshly Roasted Weekly","icon":"fire"},{"text":"Easy Returns","icon":"refresh"}]',
  '{"symbol":"৳","code":"BDT","position":"before","decimals":0}',
  '{"products_per_page":12,"show_out_of_stock":false,"enable_reviews":true,"checkout_guest_enabled":true,"min_order_amount":500,"maintenance_mode":false}',
  '{}',
  '{"enabled":false}',
  '{"enabled":false}'
);

-- ── Update shop ────────────────────────────────────────────
UPDATE shops SET
  name = 'Demo Coffee',
  industry = 'Food & Beverage',
  subscription_plan = 'growth',
  logo_url = 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100&h=100&fit=crop'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Summary: 5 categories, 18 products, 12 variants, 12 customers
-- 20 orders, 18 payments, 1 refund, 8 deliveries, 11 inventory moves, 4 campaigns
