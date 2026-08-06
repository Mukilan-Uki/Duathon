import 'dotenv/config';
import { z } from 'zod';

const result = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().optional().default(''),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
    JWT_ACCESS_SECRET: z.string().min(32).default('development-access-secret-change-me-now'),
    JWT_REFRESH_SECRET: z.string().min(32).default('development-refresh-secret-change-me-now'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    REFRESH_COOKIE_DAYS: z.coerce.number().int().positive().default(7),
    OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().max(60).default(15),
    VERIFICATION_RESEND_LIMIT: z.coerce.number().int().positive().default(3),
    VERIFICATION_RESEND_WINDOW_MINUTES: z.coerce.number().int().positive().default(60),
    PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().int().positive().max(60).default(15),
    FAMILY_INVITATION_EXPIRES_DAYS: z.coerce.number().int().positive().max(30).default(7),
    ADULT_MIN_AGE: z.coerce.number().int().min(18).max(25).default(18),
    DEVICE_TOKEN_SECRET: z.string().min(32).default('development-device-secret-change-me-now'),
    OTP_HASH_SECRET: z.string().min(32).default('development-otp-secret-change-me-now'),
    DEVICE_COOKIE_NAME: z.string().min(3).default('duothan_device'),
    DEVICE_TRUST_DAYS: z.coerce.number().int().positive().max(365).default(90),
    SMTP_HOST: z.string().optional().default(''),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SMTP_USER: z.string().optional().default(''),
    SMTP_PASSWORD: z.string().optional().default(''),
    EMAIL_FROM: z.string().default('Duothan Bank <no-reply@duothan.local>'),
    TRANSFER_MIN_MINOR: z.coerce.number().int().positive().default(100),
    TRANSFER_MAX_MINOR: z.coerce.number().int().positive().default(100000000),
    TRANSFER_DAILY_LIMIT_MINOR: z.coerce.number().int().positive().default(250000000),
    TRANSFER_MAX_PER_DAY: z.coerce.number().int().positive().default(25),
    SUSPICIOUS_TRANSFER_MINOR: z.coerce.number().int().positive().default(50000000),
    LOAN_MIN_MINOR: z.coerce.number().int().positive().default(100000),
    LOAN_MAX_MINOR: z.coerce.number().int().positive().default(500000000),
    LOAN_PERSONAL_RATE_BPS: z.coerce.number().int().min(0).max(10000).default(1200),
    LOAN_EDUCATION_RATE_BPS: z.coerce.number().int().min(0).max(10000).default(800),
    LOAN_HOME_RATE_BPS: z.coerce.number().int().min(0).max(10000).default(950),
    LOAN_BUSINESS_RATE_BPS: z.coerce.number().int().min(0).max(10000).default(1400),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    REDIS_URL: z.string().optional().default(''),
  })
  .safeParse(process.env);

if (!result.success) {
  throw new Error(
    `Invalid environment configuration: ${result.error.issues.map((issue) => issue.message).join(', ')}`,
  );
}

export const env = result.data;

if (env.TRANSFER_MIN_MINOR > env.TRANSFER_MAX_MINOR) {
  throw new Error('TRANSFER_MIN_MINOR cannot exceed TRANSFER_MAX_MINOR');
}

if (env.LOAN_MIN_MINOR > env.LOAN_MAX_MINOR) {
  throw new Error('LOAN_MIN_MINOR cannot exceed LOAN_MAX_MINOR');
}

if (
  env.NODE_ENV === 'production' &&
  (env.JWT_ACCESS_SECRET.includes('development-') ||
    env.JWT_REFRESH_SECRET.includes('development-'))
) {
  throw new Error('Production requires unique JWT_ACCESS_SECRET and JWT_REFRESH_SECRET values');
}

if (
  env.NODE_ENV === 'production' &&
  (env.DEVICE_TOKEN_SECRET.includes('development-') ||
    env.OTP_HASH_SECRET.includes('development-') ||
    new Set([
      env.JWT_ACCESS_SECRET,
      env.JWT_REFRESH_SECRET,
      env.DEVICE_TOKEN_SECRET,
      env.OTP_HASH_SECRET,
    ]).size !== 4)
) {
  throw new Error('Production requires four distinct authentication, device, and OTP secrets');
}

if (env.NODE_ENV === 'production' && !env.MONGODB_URI) {
  throw new Error('Production requires MONGODB_URI');
}

if (env.NODE_ENV === 'production' && !env.CLIENT_URL.startsWith('https://')) {
  throw new Error('Production CLIENT_URL must use HTTPS');
}

if (
  env.NODE_ENV === 'production' &&
  (!env.SMTP_HOST || !env.EMAIL_FROM || env.EMAIL_FROM.includes('duothan.local'))
) {
  throw new Error('Production requires SMTP_HOST and a verified EMAIL_FROM address');
}
