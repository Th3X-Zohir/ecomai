#!/usr/bin/env bun
/**
 * Database migration script
 * Usage: bun run db/migrate.js [--seed]
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Load .env for local dev; Docker sets DATABASE_URL directly
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ecomai:ecomai_secret@127.0.0.1:5432/ecomai';

async function run() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const forceSeed = process.argv.includes('--seed');
  const skipSeed = process.argv.includes('--no-seed');

  try {
    console.log('Connecting to PostgreSQL...');
    await pool.query('SELECT 1');
    console.log('Connected.\n');

    // Run schema — split on semicolons and run each statement separately
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('Applying schema...');
    const statements = schema.split(/;\s*\n/).filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log('Schema applied successfully.\n');

    // Run migration files from db/migrations/ directory (sorted by filename)
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
      for (const file of migrationFiles) {
        console.log(`Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const stmts = sql.split(/;\s*\n/).filter(s => s.trim().length > 0);
        for (const stmt of stmts) {
          await pool.query(stmt);
        }
        console.log(`  ✓ ${file}`);
      }
      console.log('All migrations applied.\n');
    }

    // Run standalone migrate-*.sql files (subscription, usage tracking, settings, production hardening)
    const standaloneFiles = fs.readdirSync(__dirname)
      .filter(f => f.startsWith('migrate-') && f.endsWith('.sql'))
      .sort();
    for (const file of standaloneFiles) {
      console.log(`Applying standalone migration: ${file}...`);
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      const stmts = sql.split(/;\s*\n/).filter(s => s.trim().length > 0);
      for (const stmt of stmts) {
        await pool.query(stmt);
      }
      console.log(`  ✓ ${file}`);
    }
    console.log('All standalone migrations applied.\n');

    let shouldSeed = false;
    if (!skipSeed) {
      const { rows } = await pool.query(`SELECT EXISTS (SELECT 1 FROM shops)`);
      shouldSeed = !rows[0].exists;
    }

    // Allow manual forcing regardless of auto-detection
    if (forceSeed) {
      shouldSeed = true;
    }

    if (shouldSeed) {
      // Bootstrap demo shop + users with proper bcrypt hashes
      console.log('Bootstrapping demo shop & users...');
      const demoPassword = await bcrypt.hash('password123', 10);

      await pool.query(`
        INSERT INTO shops (id, name, slug, status, industry, subscription_plan)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Coffee', 'demo-coffee', 'active', 'food_beverage', 'free')
        ON CONFLICT (id) DO NOTHING
      `);

      await pool.query(`
        INSERT INTO subscription_plans (id, name, slug, price_monthly, price_yearly, product_limit, order_limit, features)
        VALUES
          ('00000000-0000-0000-0002-000000000001', 'Free',         'free',         0,     0,     50,   100,  '["basic_analytics"]'),
          ('00000000-0000-0000-0002-000000000002', 'Starter',      'starter',      990,   9900,  500,  1000, '["basic_analytics","custom_domain"]'),
          ('00000000-0000-0000-0002-000000000003', 'Professional', 'professional', 2990,  29900, 5000, 10000,'["basic_analytics","custom_domain","priority_support"]'),
          ('00000000-0000-0000-0002-000000000004', 'Enterprise',   'enterprise',   9990,  99900, -1,   -1,   '["basic_analytics","custom_domain","priority_support","dedicated_account_manager"]')
        ON CONFLICT (id) DO NOTHING
      `);

      const demoUsers = [
        ['00000000-0000-0000-0001-000000000001', null,                                    'super@ecomai.dev',  'super_admin',    'Super Admin'],
        ['00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',  'admin@coffee.dev',  'shop_admin',     'Coffee Admin'],
        ['00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001',  'staff@coffee.dev',  'shop_user',      'Coffee Staff'],
        ['00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001',  'driver@ecomai.dev', 'delivery_agent', 'Demo Driver'],
      ];

      for (const [id, shopId, email, role, name] of demoUsers) {
        await pool.query(`
          INSERT INTO users (id, shop_id, email, password_hash, role, full_name)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO UPDATE SET password_hash = $4
        `, [id, shopId, email, demoPassword, role, name]);
      }
      console.log('Demo shop & users ready (password: password123).\n');

      const seedPath = path.join(__dirname, 'seed.sql');
      const seed = fs.readFileSync(seedPath, 'utf8');
      console.log('Applying seed data...');
      const seedStatements = seed.split(/;\s*\n/).filter(s => s.trim().length > 0);
      for (const stmt of seedStatements) {
        await pool.query(stmt);
      }
      console.log('Seed data applied successfully.\n');
    }

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
