import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

let redisClient = null;

if (env.REDIS_URL) {
  redisClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: false });
  redisClient.on('error', (error) => logger.error({ err: error }, 'Redis connection error'));
}

export function createRateLimitStore(prefix) {
  if (!redisClient) return undefined;
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args) => redisClient.call(...args),
  });
}
