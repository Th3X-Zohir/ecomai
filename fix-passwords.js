const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('New hash:', hash);

  const emails = ['super@ecomai.dev', 'admin@coffee.dev', 'staff@coffee.dev', 'driver@ecomai.dev'];
  const res = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE email = ANY($2) RETURNING email',
    [hash, emails]
  );
  console.log('Updated:', res.rows.map(r => r.email));

  // Verify each one
  for (const email of emails) {
    const row = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
    if (row.rows.length > 0) {
      const ok = await bcrypt.compare('password123', row.rows[0].password_hash);
      console.log(email, '->', ok ? 'OK' : 'FAIL');
    }
  }

  await pool.end();
}
fix();
