import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

let server;

async function start() {
  try {
    await connectDatabase();
    server = app.listen(env.PORT, () =>
      console.info(`API listening on http://localhost:${env.PORT}`),
    );
    server.requestTimeout = 30_000;
    server.headersTimeout = 35_000;
    server.keepAliveTimeout = 5_000;
  } catch (error) {
    console.error('Server startup failed.', error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.info(`${signal} received; shutting down.`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();
  process.exit(0);
}

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection.', error);
  shutdown('UNHANDLED_REJECTION');
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
start();
