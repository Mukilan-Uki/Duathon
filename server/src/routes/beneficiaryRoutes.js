import { Router } from 'express';
import { create, list, remove } from '../controllers/beneficiaryController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { addBeneficiarySchema, beneficiaryIdSchema } from '../validators/beneficiaryValidators.js';

const router = Router();
router.use(authenticate, authorize('customer'));
router.post('/', validate(addBeneficiarySchema), asyncHandler(create));
router.get('/', asyncHandler(list));
router.delete('/:beneficiaryId', validate(beneficiaryIdSchema), asyncHandler(remove));

export default router;
