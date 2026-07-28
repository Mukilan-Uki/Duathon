import 'dotenv/config';
import { z } from 'zod';

const result = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().optional().default(''),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
    JWT_ACCESS_SECRET: z.string().min(32).default('development-access-secret-change-me-now'),
    JWT_REFRESH_SECRET: z.string().min(32).default('development-refresh-secret-change-me-now'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    REFRESH_COOKIE_DAYS: z.coerce.number().int().positive().default(7),
    OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().max(60).default(15),
    SMTP_HOST: z.string().optional().default(''),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SMTP_USER: z.string().optional().default(''),
    SMTP_PASSWORD: z.string().optional().default(''),
    EMAIL_FROM: z.string().default('Duothan Bank <no-reply@duothan.local>'),
  })
  .safeParse(process.env);

if (!result.success) {
  throw new Error(
    `Invalid environment configuration: ${result.error.issues.map((issue) => issue.message).join(', ')}`,
  );
}

export const env = result.data;

if (
  env.NODE_ENV === 'production' &&
  (env.JWT_ACCESS_SECRET.includes('development-') ||
    env.JWT_REFRESH_SECRET.includes('development-'))
) {
  throw new Error('Production requires unique JWT_ACCESS_SECRET and JWT_REFRESH_SECRET values');
}
