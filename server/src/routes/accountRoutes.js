import { Router } from 'express';
import {
  createAccountApplication,
  getAccount,
  getMyAccounts,
  getPendingAccounts,
  review,
  updateStatus,
} from '../controllers/accountController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  accountIdSchema,
  accountStatusSchema,
  createAccountSchema,
  reviewAccountSchema,
} from '../validators/accountValidators.js';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  authorize('customer'),
  validate(createAccountSchema),
  asyncHandler(createAccountApplication),
);
router.get('/me', authorize('customer'), asyncHandler(getMyAccounts));
router.get('/pending', authorize('employee', 'admin'), asyncHandler(getPendingAccounts));
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
