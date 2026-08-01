import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  approve,
  close,
  createAccountApplication,
  getAccount,
  getMyAccounts,
  getPendingAccounts,
  reactivate,
  reject,
  review,
  search,
  suspend,
  updateStatus,
} from '../controllers/accountController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  accountIdSchema,
  accountActionSchema,
  accountReasonSchema,
  accountSearchSchema,
  accountStatusSchema,
  createAccountSchema,
  reviewAccountSchema,
} from '../validators/accountValidators.js';

const router = Router();
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many account applications. Try again later',
    errors: [],
  },
});
router.use(authenticate);

router.post(
  '/apply',
  applicationLimiter,
  authorize('customer'),
  validate(createAccountSchema),
  asyncHandler(createAccountApplication),
);
router.get('/my-accounts', authorize('customer'), asyncHandler(getMyAccounts));
router.get('/pending', authorize('employee', 'admin'), asyncHandler(getPendingAccounts));
router.get(
  '/search',
  authorize('employee', 'admin'),
  validate(accountSearchSchema),
  asyncHandler(search),
);
router.patch(
  '/:accountId/approve',
  authorize('employee', 'admin'),
  validate(accountIdSchema),
  asyncHandler(approve),
);
router.patch(
  '/:accountId/reject',
  authorize('employee', 'admin'),
  validate(accountReasonSchema),
  asyncHandler(reject),
);
router.patch(
  '/:accountId/suspend',
  authorize('employee', 'admin'),
  validate(accountReasonSchema),
  asyncHandler(suspend),
);
router.patch(
  '/:accountId/reactivate',
  authorize('employee', 'admin'),
  validate(accountActionSchema),
  asyncHandler(reactivate),
);
router.patch(
  '/:accountId/close',
  authorize('employee', 'admin'),
  validate(accountReasonSchema),
  asyncHandler(close),
);

// Backward-compatible aliases for existing clients; new code uses the Phase 3 routes above.
router.post(
  '/',
  applicationLimiter,
  authorize('customer'),
  validate(createAccountSchema),
  asyncHandler(createAccountApplication),
);
router.get('/me', authorize('customer'), asyncHandler(getMyAccounts));
router.patch(
  '/:accountId/review',
  authorize('employee', 'admin'),
  validate(reviewAccountSchema),
  asyncHandler(review),
);
router.patch(
  '/:accountId/status',
  authorize('employee', 'admin'),
  validate(accountStatusSchema),
  asyncHandler(updateStatus),
);
router.get('/:accountId', validate(accountIdSchema), asyncHandler(getAccount));

export default router;
