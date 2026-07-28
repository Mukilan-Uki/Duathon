import { z } from 'zod';

export const addBeneficiarySchema = z.object({
  body: z.object({
    accountNumber: z.string().regex(/^\d{12}$/, 'Enter a valid 12-digit account number'),
    nickname: z.string().trim().min(2).max(60),
  }),
});

export const beneficiaryIdSchema = z.object({
  params: z.object({
    beneficiaryId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid beneficiary identifier'),
  }),
});
