import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  create,
  details,
  list,
  remove,
  restore,
  update,
  verifyAccount,
} from '../controllers/beneficiaryController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createRateLimitStore } from '../config/rateLimitStore.js';
import {
  addBeneficiarySchema,
  beneficiaryIdSchema,
  beneficiaryListSchema,
  updateBeneficiarySchema,
  verifyBeneficiarySchema,
} from '../validators/beneficiaryValidators.js';

const router = Router();
const accountLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many beneficiary account requests', errors: [] },
  store: createRateLimitStore('beneficiary-lookup'),
});

router.use(authenticate, authorize('customer'));
router.post(
  '/verify-account',
  accountLookupLimiter,
  validate(verifyBeneficiarySchema),
  asyncHandler(verifyAccount),
);
router.post('/', accountLookupLimiter, validate(addBeneficiarySchema), asyncHandler(create));
router.get('/', validate(beneficiaryListSchema), asyncHandler(list));
router.get('/:beneficiaryId', validate(beneficiaryIdSchema), asyncHandler(details));
router.patch('/:beneficiaryId', validate(updateBeneficiarySchema), asyncHandler(update));
router.delete('/:beneficiaryId', validate(beneficiaryIdSchema), asyncHandler(remove));
router.patch('/:beneficiaryId/restore', validate(beneficiaryIdSchema), asyncHandler(restore));

export default router;
