import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { recipient, transfer } from '../controllers/transactionController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireIdempotencyKey } from '../middleware/requireIdempotencyKey.js';
import { validate } from '../middleware/validate.js';
import {
  recipientValidationSchema,
  transferSchema,
} from '../validators/transactionValidators.js';

const router = Router();
const transferLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many transfer requests. Try again later', errors: [] },
});

router.use(authenticate, authorize('customer'));
router.post(
  '/validate-recipient',
  transferLimiter,
  validate(recipientValidationSchema),
  asyncHandler(recipient),
);
router.post(
  '/',
  transferLimiter,
  requireIdempotencyKey,
  validate(transferSchema),
  asyncHandler(transfer),
);

export default router;
