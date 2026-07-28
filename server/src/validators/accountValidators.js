import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid account identifier');

export const createAccountSchema = z.object({
  body: z.object({
    accountType: z.enum(['savings', 'current']),
    applicationNote: z.string().trim().max(500).optional().default(''),
  }),
});

export const accountIdSchema = z.object({
  params: z.object({ accountId: objectId }),
});

export const reviewAccountSchema = z.object({
  params: z.object({ accountId: objectId }),
  body: z.object({
    decision: z.enum(['approve', 'reject']),
    reviewNote: z.string().trim().min(3).max(500),
  }),
});

export const accountStatusSchema = z.object({
  params: z.object({ accountId: objectId }),
  body: z.object({
    status: z.enum(['active', 'suspended', 'closed']),
    note: z.string().trim().min(3).max(500),
  }),
});
