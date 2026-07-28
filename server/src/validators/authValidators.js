import { z } from 'zod';

const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const password = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');
const code = z.string().regex(/^\d{6}$/, 'Security code must contain six digits');

export const registerSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(2).max(60),
      lastName: z.string().trim().min(2).max(60),
      email,
      password,
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

export const loginSchema = z.object({
  body: z.object({ email, password: z.string().min(1).max(128) }),
});

export const emailSchema = z.object({ body: z.object({ email }) });

export const verifyEmailSchema = z.object({
  body: z.object({ email, code }),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({ email, code, password, confirmPassword: z.string() })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1).max(128),
      newPassword: password,
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});
