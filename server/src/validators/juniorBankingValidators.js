import { z } from 'zod';
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const minor = z.number().int().safe().nonnegative();
const params = (key) =>
  z.object({
    body: z.object({}).optional(),
    query: z.object({}).optional(),
    params: z.object({ [key]: objectId }),
  });
const controls = z.object({
  permissions: z
    .object({
      canTransfer: z.boolean().optional(),
      canCreateSavingsGoals: z.boolean().optional(),
      canRequestBeneficiaries: z.boolean().optional(),
      canApplyForLoans: z.boolean().optional(),
    })
    .optional(),
  spendingLimits: z
    .object({
      perTransactionLimitMinor: minor.optional(),
      dailyLimitMinor: minor.optional(),
      weeklyLimitMinor: minor.optional(),
      monthlyLimitMinor: minor.optional(),
    })
    .optional(),
  approvalSettings: z
    .object({
      requireApprovalAboveMinor: minor.optional(),
      requireApprovalForNewBeneficiary: z.boolean().optional(),
      requireApprovalForExternalTransfer: z.boolean().optional(),
      blockCashWithdrawal: z.boolean().optional(),
      allowedTransactionTypes: z
        .array(z.enum(['transfer', 'allowance', 'goal_contribution']))
        .optional(),
    })
    .optional(),
});
export const createProfileSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    familyId: objectId,
    juniorUserId: objectId,
    relationshipToGuardian: z.string().trim().min(2).max(40),
    spendingLimits: controls.shape.spendingLimits.optional(),
    approvalSettings: controls.shape.approvalSettings.optional(),
  }),
});
export const juniorIdSchema = params('juniorId');
export const accountSchema = z.object({
  params: z.object({ juniorId: objectId }),
  query: z.object({}).optional(),
  body: z.object({
    branchCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{3,10}$/),
  }),
});
export const controlsSchema = z.object({
  params: z.object({ juniorId: objectId }),
  query: z.object({}).optional(),
  body: controls.refine(
    (value) => Object.keys(value).length > 0,
    'At least one control is required',
  ),
});
export const allowanceSchema = z.object({
  params: z.object({ juniorId: objectId }),
  query: z.object({}).optional(),
  body: z.object({
    sourceAccountId: objectId,
    amountMinor: minor.positive(),
    frequency: z.enum(['one_time', 'weekly', 'monthly']),
    nextRunAt: z.coerce
      .date()
      .refine((date) => date > new Date(), 'Next run must be in the future'),
    description: z.string().trim().max(200).optional(),
  }),
});
export const allowanceIdSchema = params('allowanceId');
export const requestSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z
    .object({
      juniorAccountId: objectId,
      receiverAccountId: objectId.optional(),
      beneficiaryId: objectId.optional(),
      amountMinor: minor.positive(),
      description: z.string().trim().max(200).optional(),
    })
    .refine(
      (value) => value.receiverAccountId || value.beneficiaryId,
      'Receiver or beneficiary is required',
    ),
});
export const requestIdSchema = params('requestId');
export const reviewSchema = z.object({
  params: z.object({ requestId: objectId }),
  query: z.object({}).optional(),
  body: z.object({ reason: z.string().trim().max(300).optional() }),
});
