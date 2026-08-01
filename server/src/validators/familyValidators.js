import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const familyParams = z.object({ familyId: objectId });
const goalParams = z.object({ familyId: objectId, goalId: objectId });
const permissions = z
  .object({
    viewSharedGoals: z.boolean().optional(),
    contributeToSharedGoals: z.boolean().optional(),
    manageJuniorAccounts: z.boolean().optional(),
    approveJuniorTransactions: z.boolean().optional(),
    viewJuniorTransactions: z.boolean().optional(),
    manageFamilyMembers: z.boolean().optional(),
    createFamilyAnnouncements: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one permission');

export const createFamilySchema = z.object({
  body: z.object({ name: z.string().trim().min(3).max(80) }).strict(),
});
export const familyIdSchema = z.object({ params: familyParams });
export const invitationSchema = z.object({
  params: familyParams,
  body: z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
      relationship: z.string().trim().min(2).max(40),
    })
    .strict(),
});
export const invitationIdSchema = z.object({
  params: z.object({ invitationId: objectId }),
});
export const memberIdSchema = z.object({
  params: z.object({ familyId: objectId, memberId: objectId }),
});
export const memberPermissionsSchema = z.object({
  params: z.object({ familyId: objectId, memberId: objectId }),
  body: permissions,
});
export const memberRoleSchema = z.object({
  params: z.object({ familyId: objectId, memberId: objectId }),
  body: z.object({ role: z.enum(['family_admin', 'adult_member']) }).strict(),
});
export const createGoalSchema = z.object({
  params: familyParams,
  body: z
    .object({
      title: z.string().trim().min(3).max(100),
      description: z.string().trim().max(500).optional().default(''),
      targetAmountMinor: z.number().int().safe().positive(),
      deadline: z.coerce.date().min(new Date(), 'Deadline must be in the future').optional(),
    })
    .strict(),
});
export const goalIdSchema = z.object({ params: goalParams });
export const updateGoalSchema = z.object({
  params: goalParams,
  body: z
    .object({
      title: z.string().trim().min(3).max(100).optional(),
      description: z.string().trim().max(500).optional(),
      deadline: z.coerce.date().optional().nullable(),
      status: z.enum(['active', 'paused']).optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, 'Provide at least one update'),
});
export const contributeGoalSchema = z.object({
  params: goalParams,
  body: z
    .object({
      sourceAccountId: objectId,
      amountMinor: z.number().int().safe().positive(),
    })
    .strict(),
});
export const announcementSchema = z.object({
  params: familyParams,
  body: z
    .object({
      title: z.string().trim().min(3).max(100),
      message: z.string().trim().min(5).max(500),
    })
    .strict(),
});
