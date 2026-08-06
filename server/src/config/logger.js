import pino from 'pino';
import { env } from './env.js';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.otp',
  '*.otpHash',
  '*.idempotencyKey',
];

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  base: { service: 'duothan-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
