import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid account identifier');

export const createAccountSchema = z.object({
  body: z.object({
    accountType: z.enum(['savings', 'current']),
    branchCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,10}$/),
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

export const accountReasonSchema = z.object({
  params: z.object({ accountId: objectId }),
  body: z.object({ reason: z.string().trim().min(3).max(500) }),
});

export const accountActionSchema = z.object({
  params: z.object({ accountId: objectId }),
  body: z.object({ reason: z.string().trim().max(500).optional().default('') }),
});

export const accountSearchSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional().default(''),
    status: z.enum(['pending', 'active', 'suspended', 'closed']).optional(),
  }),
});

export const accountStatusSchema = z.object({
  params: z.object({ accountId: objectId }),
  body: z.object({
    status: z.enum(['active', 'suspended', 'closed']),
    note: z.string().trim().min(3).max(500),
  }),
});
