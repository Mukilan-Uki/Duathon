import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');
const pagination = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const notificationListSchema = z.object({
  query: z.object({
    ...pagination,
    unreadOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
  }),
});

export const notificationIdSchema = z.object({
  params: z.object({ notificationId: objectId }),
});

export const preferencesSchema = z.object({
  body: z
    .object({
      transaction: z.boolean().optional(),
      loan: z.boolean().optional(),
      security: z.boolean().optional(),
      account: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'Provide at least one preference'),
});

export const broadcastNotificationSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(3).max(120),
      message: z.string().trim().min(5).max(500),
      audience: z.enum(['all', 'customer', 'employee', 'admin']),
    })
    .strict(),
});

export const auditListSchema = z.object({
  query: z.object({
    ...pagination,
    action: z.string().trim().max(100).optional(),
    targetType: z.string().trim().max(100).optional(),
    userId: objectId.optional(),
    search: z.string().trim().max(100).optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
  }),
});

export const suspiciousListSchema = z.object({
  query: z.object({
    status: z.enum(['open', 'investigating', 'resolved', 'dismissed']).optional(),
  }),
});

export const flagTransactionSchema = z.object({
  params: z.object({ transactionId: objectId }),
  body: z.object({ reason: z.string().trim().min(10).max(500) }),
});

export const investigationSchema = z.object({
  params: z.object({ activityId: objectId }),
  body: z
    .object({
      status: z.enum(['open', 'investigating', 'resolved', 'dismissed']).optional(),
      note: z.string().trim().min(3).max(1000).optional(),
    })
    .refine((value) => value.status || value.note, 'Provide a status or investigation note'),
});

const settingKeys = z.enum([
  'transfer_min_minor',
  'transfer_max_minor',
  'transfer_daily_limit_minor',
  'transfer_max_per_day',
  'suspicious_transfer_minor',
  'account_auto_approval',
  'loan_min_minor',
  'loan_max_minor',
  'loan_personal_rate_bps',
  'loan_education_rate_bps',
  'loan_home_rate_bps',
  'loan_business_rate_bps',
  'login_max_attempts',
  'otp_expiry_minutes',
  'session_timeout_minutes',
  'password_min_length',
  'maintenance_mode',
  'notification_poll_seconds',
]);

export const settingSchema = z.object({
  body: z
    .object({
      key: settingKeys,
      category: z.enum([
        'transactions',
        'accounts',
        'loans',
        'security',
        'notifications',
        'application',
      ]),
      value: z.union([z.number().int().nonnegative(), z.boolean()]),
      description: z.string().trim().min(5).max(300),
    })
    .superRefine((value, context) => {
      const expected = ['account_auto_approval', 'maintenance_mode'].includes(value.key)
        ? 'boolean'
        : 'number';
      if (typeof value.value !== expected) {
        context.addIssue({ code: 'custom', path: ['value'], message: `Value must be ${expected}` });
      }
      const requiredCategory = {
        transfer_min_minor: 'transactions',
        transfer_max_minor: 'transactions',
        transfer_daily_limit_minor: 'transactions',
        transfer_max_per_day: 'transactions',
        suspicious_transfer_minor: 'transactions',
        account_auto_approval: 'accounts',
        loan_min_minor: 'loans',
        loan_max_minor: 'loans',
        loan_personal_rate_bps: 'loans',
        loan_education_rate_bps: 'loans',
        loan_home_rate_bps: 'loans',
        loan_business_rate_bps: 'loans',
        login_max_attempts: 'security',
        otp_expiry_minutes: 'security',
        session_timeout_minutes: 'security',
        password_min_length: 'security',
        maintenance_mode: 'application',
        notification_poll_seconds: 'notifications',
      }[value.key];
      if (value.category !== requiredCategory) {
        context.addIssue({
          code: 'custom',
          path: ['category'],
          message: `Category must be ${requiredCategory}`,
        });
      }
      if (value.key === 'login_max_attempts' && (value.value < 3 || value.value > 20)) {
        context.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Login attempt limit must be between 3 and 20',
        });
      }
      if (value.key === 'password_min_length' && (value.value < 12 || value.value > 128)) {
        context.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Password minimum length must be between 12 and 128',
        });
      }
    }),
});
