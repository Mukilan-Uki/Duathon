import { Router } from 'express';
import {
  details,
  history,
  monitor,
  receipt,
  transfer,
} from '../controllers/transactionController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireIdempotencyKey } from '../middleware/requireIdempotencyKey.js';
import { validate } from '../middleware/validate.js';
import {
  transactionIdSchema,
  transactionListSchema,
  transferSchema,
} from '../validators/transactionValidators.js';

const router = Router();
router.use(authenticate);

router.post(
  '/transfer',
  authorize('customer'),
  requireIdempotencyKey,
  validate(transferSchema),
  asyncHandler(transfer),
);
router.get(
  '/my-transactions',
  authorize('customer'),
  validate(transactionListSchema),
  asyncHandler(history),
);
router.get('/history', authorize('customer'), validate(transactionListSchema), asyncHandler(history));
router.get(
  '/monitor',
  authorize('employee', 'admin'),
  validate(transactionListSchema),
  asyncHandler(monitor),
);
router.get('/:transactionId/receipt', validate(transactionIdSchema), asyncHandler(receipt));
router.get('/:transactionId', validate(transactionIdSchema), asyncHandler(details));

export default router;
