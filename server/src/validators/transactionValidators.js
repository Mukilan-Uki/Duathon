import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid transaction identifier');
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .optional();

export const transferSchema = z.object({
  body: z
    .object({
      senderAccountId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid sender account'),
      receiverAccountNumber: z.string().regex(/^\d{12}$/, 'Enter a valid 12-digit account number'),
      amount: z.number().int().safe().positive().optional(),
      amountMinor: z.number().int().safe().positive().optional(),
      description: z.string().trim().max(200).optional().default(''),
      idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/).optional(),
    })
    .refine((value) => value.amount != null || value.amountMinor != null, {
      message: 'An integer minor-unit amount is required',
      path: ['amount'],
    })
    .transform((value) => ({ ...value, amount: value.amount ?? value.amountMinor })),
});

export const recipientValidationSchema = z.object({
  body: z.object({
    accountNumber: z.string().regex(/^\d{12}$/, 'Enter a valid 12-digit account number'),
  }),
});

export const transactionListSchema = z.object({
  query: z
    .object({
      search: z.string().trim().max(100).optional().default(''),
      direction: z.enum(['sent', 'received', 'credit', 'debit']).optional(),
      type: z
        .enum([
          'transfer',
          'deposit',
          'withdrawal',
          'loan_disbursement',
          'loan_repayment',
          'reversal',
        ])
        .optional(),
      status: z
        .enum(['pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled'])
        .optional(),
      dateFrom: date,
      dateTo: date,
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      sort: z.enum(['newest', 'oldest']).default('newest'),
    })
    .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
      message: 'Start date must not be after end date',
      path: ['dateFrom'],
    }),
});

export const transactionIdSchema = z.object({
  params: z.object({ transactionId: objectId }),
});
