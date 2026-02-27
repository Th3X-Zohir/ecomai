/**
 * Test setup helper — connects to PostgreSQL, runs schema, provides cleanup.
 * 
 * Usage:
 *   const { setup, teardown, shopId, adminUserId } = require('./helpers/setup');
 *   test.before(setup);
 *   test.after(teardown);
 */
const db = require('../../src/db');
const crypto = require('crypto');

const SHOP_ID = crypto.randomUUID();
const ADMIN_USER_ID = crypto.randomUUID();

let ready = false;

async function setup() {
  if (ready) return;
  // Ensure tables exist (schema should be applied via migrate.js before tests)
  // Create a test shop and admin user for test isolation
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('password123', 10);

  await db.query(`
    INSERT INTO shops (id, name, slug, industry, subscription_plan, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `, [SHOP_ID, 'Test Shop', 'test-shop-' + Date.now(), 'general', 'free', 'active']);

  await db.query(`
    INSERT INTO users (id, shop_id, email, password_hash, role, full_name)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id
  `, [ADMIN_USER_ID, SHOP_ID, `admin-${Date.now()}@test.dev`, hash, 'shop_admin', 'Test Admin']);

  ready = true;
}

async function teardown() {
  // Clean up test data
  try {
    await db.query('DELETE FROM inventory_movements WHERE shop_id = $1', [SHOP_ID]);
    await db.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE shop_id = $1)', [SHOP_ID]);
    await db.query('DELETE FROM refunds WHERE payment_id IN (SELECT id FROM payments WHERE shop_id = $1)', [SHOP_ID]);
    await db.query('DELETE FROM payments WHERE shop_id = $1', [SHOP_ID]);
    await db.query('DELETE FROM delivery_requests WHERE shop_id = $1', [SHOP_ID]);
    await db.query('DELETE FROM orders WHERE shop_id = $1', [SHOP_ID]);
    await db.query('DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE shop_id = $1)', [SHOP_ID]);
    await db.query('DELETE FROM products WHERE shop_id = $1', [SHOP_ID]);
    await db.query('DELETE FROM marketing_campaigns WHERE shop_id = $1', [SHOP_ID]);
    await db.query('DELETE FROM website_settings WHERE shop_id = $1', [SHOP_ID]);
    await db.query('DELETE FROM customers WHERE shop_id = $1', [SHOP_ID]);
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [ADMIN_USER_ID]);
    await db.query('DELETE FROM users WHERE shop_id = $1', [SHOP_ID]);
    await db.query('DELETE FROM shops WHERE id = $1', [SHOP_ID]);
  } catch (e) {
    console.error('Teardown error:', e.message);
  }
  await db.close();
}

module.exports = { setup, teardown, shopId: SHOP_ID, adminUserId: ADMIN_USER_ID };
