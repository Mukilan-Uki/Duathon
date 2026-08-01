import { z } from 'zod';
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid device identifier');
const params = z.object({ deviceId: objectId });
export const trustSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    password: z.string().min(1),
    deviceName: z.string().trim().min(2).max(80).optional(),
  }),
});
export const renameSchema = z.object({
  params,
  query: z.object({}).optional(),
  body: z.object({ deviceName: z.string().trim().min(2).max(80) }),
});
export const revokeSchema = z.object({
  params,
  query: z.object({}).optional(),
  body: z.object({ password: z.string().min(1), reason: z.string().trim().max(200).optional() }),
});
export const deviceIdSchema = z.object({
  params,
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});
export const logoutAllSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({ password: z.string().min(1), preserveCurrent: z.boolean().default(true) }),
});
