import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/\d/, 'Include a number')
  .regex(/[^A-Za-z0-9]/, 'Include a special character');

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Enter at least 2 characters'),
    lastName: z.string().trim().min(2, 'Enter at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid international phone number'),
    dateOfBirth: z
      .string()
      .min(1, 'Date of birth is required')
      .refine((value) => !Number.isNaN(Date.parse(value)) && new Date(value) < new Date(), {
        message: 'Enter a valid date of birth',
      }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const resetSchema = z
  .object({
    token: z.string().min(32, 'Enter a valid password reset token'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
