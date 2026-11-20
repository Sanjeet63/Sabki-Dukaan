import { createApp } from './app.js';
import { env } from './config/env.js';
import { db } from './db/knex.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`SabkiDukaan API running on http://localhost:${env.PORT}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
