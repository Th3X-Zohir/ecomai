#!/usr/bin/env bun
/**
 * Database migration script
 * Usage: bun run db/migrate.js [--seed]
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load .env for local dev; Docker sets DATABASE_URL directly
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ecomai:ecomai_secret@127.0.0.1:5432/ecomai';

async function run() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const shouldSeed = process.argv.includes('--seed');

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

    // Run seed if requested
    if (shouldSeed) {
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
