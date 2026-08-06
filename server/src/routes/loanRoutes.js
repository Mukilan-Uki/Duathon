import { Router } from 'express';
import {
  apply,
  makePayment,
  myApplications,
  myLoans,
  payments,
  review,
  staffApplications,
} from '../controllers/loanController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireIdempotencyKey } from '../middleware/requireIdempotencyKey.js';
import { validate } from '../middleware/validate.js';
import {
  loanApplicationSchema,
  loanIdSchema,
  loanPaymentSchema,
  reviewLoanSchema,
  staffLoanListSchema,
} from '../validators/loanValidators.js';

const router = Router();
router.use(authenticate);

router.post(
  '/applications',
  authorize('customer'),
  validate(loanApplicationSchema),
  asyncHandler(apply),
);
router.get('/applications/me', authorize('customer'), asyncHandler(myApplications));
router.get(
  '/applications',
  authorize('employee', 'admin'),
  validate(staffLoanListSchema),
  asyncHandler(staffApplications),
);
router.patch(
  '/applications/:applicationId/review',
  authorize('employee', 'admin'),
  requireIdempotencyKey,
  validate(reviewLoanSchema),
  asyncHandler(review),
);
router.get('/me', authorize('customer'), asyncHandler(myLoans));
router.get(
  '/:loanId/payments',
  authorize('customer'),
  validate(loanIdSchema),
  asyncHandler(payments),
);
router.post(
  '/:loanId/payments',
  authorize('customer'),
  requireIdempotencyKey,
  validate(loanPaymentSchema),
  asyncHandler(makePayment),
);

export default router;
