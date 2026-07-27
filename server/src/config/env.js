import 'dotenv/config';
import { z } from 'zod';

const result = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().optional().default(''),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
  })
  .safeParse(process.env);

if (!result.success) {
  throw new Error(
    `Invalid environment configuration: ${result.error.issues.map((issue) => issue.message).join(', ')}`,
  );
}

export const env = result.data;
