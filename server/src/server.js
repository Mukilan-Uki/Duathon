import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { startAllowanceScheduler, stopAllowanceScheduler } from './jobs/allowanceScheduler.js';

let server;
let shuttingDown = false;

async function start() {
  try {
    await connectDatabase();
    startAllowanceScheduler();
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
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`${signal} received; draining in-flight requests.`);
  stopAllowanceScheduler();

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out; forcing exit.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();
  clearTimeout(forceExit);
  process.exit(0);
}

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection.', error);
  shutdown('UNHANDLED_REJECTION');
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
start();
