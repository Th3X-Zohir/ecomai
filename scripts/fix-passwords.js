const bcrypt = require('bcryptjs');
const db = require('./src/db');

async function main() {
  // Generate correct hash
  const hash = await bcrypt.hash('password123', 10);
  console.log('New hash:', hash);
  
  // Update all users
  await db.query('UPDATE users SET password_hash = $1', [hash]);
  console.log('Updated all users');
  
  // Verify
  const res = await db.query("SELECT email, password_hash FROM users WHERE email='admin@coffee.dev'");
  const stored = res.rows[0].password_hash;
  const match = await bcrypt.compare('password123', stored);
  console.log('Stored hash:', stored);
  console.log('Verify match:', match);
  
  await db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
