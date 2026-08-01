import { z } from 'zod';

const accountNumber = z.string().regex(/^\d{12}$/, 'Enter a valid 12-digit account number');
const beneficiaryId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid beneficiary identifier');
const relationship = z.enum(['family', 'friend', 'business', 'other']);

export const addBeneficiarySchema = z.object({
  body: z
    .object({
      accountNumber,
      nickname: z.string().trim().min(2).max(60),
      relationship,
    })
    .strict(),
});

export const verifyBeneficiarySchema = z.object({
  body: z.object({ accountNumber }).strict(),
});

export const beneficiaryIdSchema = z.object({
  params: z.object({ beneficiaryId }),
});

export const updateBeneficiarySchema = z.object({
  params: z.object({ beneficiaryId }),
  body: z
    .object({
      nickname: z.string().trim().min(2).max(60).optional(),
      relationship: relationship.optional(),
      isFavourite: z.boolean().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, 'Provide at least one update'),
});

export const beneficiaryListSchema = z.object({
  query: z.object({
    search: z.string().trim().max(60).optional().default(''),
    status: z.enum(['active', 'inactive', 'blocked']).optional(),
    favourite: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
    sort: z.enum(['nickname', 'recent', 'lastUsed']).default('nickname'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
