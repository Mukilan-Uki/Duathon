import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  adminCheck,
  forgotPassword,
  login,
  loginHistory,
  logout,
  me,
  refresh,
  register,
  resend,
  reset,
  updatePassword,
  verify,
} from '../controllers/authController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { requireTrustedOrigin } from '../middleware/requireTrustedOrigin.js';
import { createRateLimitStore } from '../config/rateLimitStore.js';
import {
  changePasswordSchema,
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/authValidators.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again later', errors: [] },
  store: createRateLimitStore('login'),
});
const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later', errors: [] },
  store: createRateLimitStore('recovery'),
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many registrations. Try again later', errors: [] },
  store: createRateLimitStore('registration'),
});
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later', errors: [] },
  store: createRateLimitStore('session'),
});

router.post('/register', registrationLimiter, validate(registerSchema), asyncHandler(register));
router.post('/verify-email', recoveryLimiter, validate(verifyEmailSchema), asyncHandler(verify));
router.post('/resend-verification', recoveryLimiter, validate(emailSchema), asyncHandler(resend));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));
router.post('/refresh', sessionLimiter, requireTrustedOrigin, asyncHandler(refresh));
router.post('/logout', sessionLimiter, requireTrustedOrigin, asyncHandler(logout));
router.post(
  '/forgot-password',
  recoveryLimiter,
  validate(emailSchema),
  asyncHandler(forgotPassword),
);
router.post('/reset-password', recoveryLimiter, validate(resetPasswordSchema), asyncHandler(reset));
router.get('/me', authenticate, asyncHandler(me));
router.get('/login-history', authenticate, asyncHandler(loginHistory));
router.patch(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(updatePassword),
);
router.get('/admin-check', authenticate, authorize('admin'), adminCheck);

export default router;
