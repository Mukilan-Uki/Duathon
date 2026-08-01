import { Router } from 'express';
import * as controller from '../controllers/juniorBankingController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireIdempotencyKey } from '../middleware/requireIdempotencyKey.js';
import { validate } from '../middleware/validate.js';
import * as schemas from '../validators/juniorBankingValidators.js';
const router = Router();
router.use(authenticate, authorize('customer'));
router.post(
  '/profiles',
  validate(schemas.createProfileSchema),
  asyncHandler(controller.createProfile),
);
router.post(
  '/profiles/:juniorId/account',
  validate(schemas.accountSchema),
  asyncHandler(controller.createAccount),
);
router.get(
  '/:juniorId/controls',
  validate(schemas.juniorIdSchema),
  asyncHandler(controller.getControls),
);
router.patch(
  '/:juniorId/controls',
  validate(schemas.controlsSchema),
  asyncHandler(controller.updateControls),
);
router.post(
  '/:juniorId/allowances',
  validate(schemas.allowanceSchema),
  asyncHandler(controller.createAllowance),
);
router.get(
  '/:juniorId/allowances',
  validate(schemas.juniorIdSchema),
  asyncHandler(controller.allowances),
);
router.patch(
  '/allowances/:allowanceId/pause',
  validate(schemas.allowanceIdSchema),
  asyncHandler(controller.pauseAllowance),
);
router.patch(
  '/allowances/:allowanceId/resume',
  validate(schemas.allowanceIdSchema),
  asyncHandler(controller.resumeAllowance),
);
router.delete(
  '/allowances/:allowanceId',
  validate(schemas.allowanceIdSchema),
  asyncHandler(controller.cancelAllowance),
);
router.post(
  '/transactions/request',
  requireIdempotencyKey,
  validate(schemas.requestSchema),
  asyncHandler(controller.requestTransaction),
);
router.get('/transactions/my-requests', asyncHandler(controller.myRequests));
router.get('/approvals/pending', asyncHandler(controller.pending));
router.patch(
  '/approvals/:requestId/approve',
  validate(schemas.reviewSchema),
  asyncHandler(controller.approve),
);
router.patch(
  '/approvals/:requestId/reject',
  validate(schemas.reviewSchema),
  asyncHandler(controller.reject),
);
router.patch(
  '/transactions/:requestId/cancel',
  validate(schemas.requestIdSchema),
  asyncHandler(controller.cancelRequest),
);
export default router;
