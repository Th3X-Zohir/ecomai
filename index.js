const app = require('./src/app');
const { port } = require('./src/config');
const db = require('./src/db');

const server = app.listen(port, () => {
  console.log(`Ecomai API listening on :${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  server.close();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  server.close();
  await db.close();
  process.exit(0);
});
