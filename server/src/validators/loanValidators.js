import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');

export const loanApplicationSchema = z.object({
  body: z.object({
    disbursementAccountId: objectId,
    loanType: z.enum(['personal', 'education', 'home', 'business']),
    requestedAmountMinor: z.number().int().safe().positive(),
    purpose: z.string().trim().min(10).max(500),
    repaymentMonths: z.number().int().min(3).max(360),
  }),
});

export const reviewLoanSchema = z.object({
  params: z.object({ applicationId: objectId }),
  body: z.object({
    decision: z.enum(['approve', 'reject']),
    reviewNote: z.string().trim().min(3).max(500),
  }),
});

export const staffLoanListSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  }),
});

export const loanPaymentSchema = z.object({
  params: z.object({ loanId: objectId }),
  body: z.object({
    sourceAccountId: objectId,
    amountMinor: z.number().int().safe().positive(),
  }),
});

export const loanIdSchema = z.object({
  params: z.object({ loanId: objectId }),
});
