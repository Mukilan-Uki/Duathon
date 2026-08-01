import { Router } from 'express';
import * as controller from '../controllers/juniorBankingController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireIdempotencyKey } from '../middleware/requireIdempotencyKey.js';
import { validate } from '../middleware/validate.js';
import * as schemas from '../validators/juniorBankingValidators.js';
const router = Router();
const customer = authorize('customer');
router.use(authenticate);
router.get('/dashboard', customer, asyncHandler(controller.dashboard));
router.get('/guardian/profiles', customer, asyncHandler(controller.guardianProfiles));
router.post(
  '/profiles',
  customer,
  validate(schemas.createProfileSchema),
  asyncHandler(controller.createProfile),
);
router.post(
  '/profiles/:juniorId/account',
  customer,
  validate(schemas.accountSchema),
  asyncHandler(controller.createAccount),
);
router.post(
  '/allowances/:allowanceId/execute',
  customer,
  requireIdempotencyKey,
  validate(schemas.allowanceIdSchema),
  asyncHandler(controller.executeAllowance),
);
router.patch(
  '/allowances/:allowanceId/pause',
  customer,
  validate(schemas.allowanceIdSchema),
  asyncHandler(controller.pauseAllowance),
);
router.patch(
  '/allowances/:allowanceId/resume',
  customer,
  validate(schemas.allowanceIdSchema),
  asyncHandler(controller.resumeAllowance),
);
router.delete(
  '/allowances/:allowanceId',
  customer,
  validate(schemas.allowanceIdSchema),
  asyncHandler(controller.cancelAllowance),
);
router.post('/goals', customer, validate(schemas.goalSchema), asyncHandler(controller.createGoal));
router.post(
  '/goals/:goalId/contribute',
  customer,
  requireIdempotencyKey,
  validate(schemas.goalContributionSchema),
  asyncHandler(controller.contributeGoal),
);
router.post(
  '/transactions/request',
  customer,
  requireIdempotencyKey,
  validate(schemas.requestSchema),
  asyncHandler(controller.requestTransaction),
);
router.get('/transactions/my-requests', customer, asyncHandler(controller.myRequests));
router.get('/approvals/pending', customer, asyncHandler(controller.pending));
router.patch(
  '/approvals/:requestId/approve',
  customer,
  validate(schemas.reviewSchema),
  asyncHandler(controller.approve),
);
router.patch(
  '/approvals/:requestId/reject',
  customer,
  validate(schemas.reviewSchema),
  asyncHandler(controller.reject),
);
router.patch(
  '/transactions/:requestId/cancel',
  customer,
  validate(schemas.requestIdSchema),
  asyncHandler(controller.cancelRequest),
);
router.post(
  '/beneficiaries/request',
  customer,
  validate(schemas.beneficiarySchema),
  asyncHandler(controller.requestBeneficiary),
);
router.patch(
  '/beneficiaries/:permissionId/approve',
  customer,
  validate(schemas.permissionReviewSchema),
  asyncHandler(controller.approveBeneficiary),
);
router.patch(
  '/beneficiaries/:permissionId/reject',
  customer,
  validate(schemas.permissionReviewSchema),
  asyncHandler(controller.rejectBeneficiary),
);
router.delete(
  '/beneficiaries/:permissionId',
  customer,
  validate(schemas.permissionIdSchema),
  asyncHandler(controller.removeBeneficiary),
);
router.get(
  '/:juniorId/controls',
  customer,
  validate(schemas.juniorIdSchema),
  asyncHandler(controller.getControls),
);
router.patch(
  '/:juniorId/controls',
  customer,
  validate(schemas.controlsSchema),
  asyncHandler(controller.updateControls),
);
router.post(
  '/:juniorId/allowances',
  customer,
  validate(schemas.allowanceSchema),
  asyncHandler(controller.createAllowance),
);
router.get(
  '/:juniorId/allowances',
  customer,
  validate(schemas.juniorIdSchema),
  asyncHandler(controller.allowances),
);
router.get(
  '/:juniorId/goals',
  customer,
  validate(schemas.juniorIdSchema),
  asyncHandler(controller.goals),
);
router.post(
  '/:juniorId/convert-to-adult',
  authorize('employee', 'admin'),
  validate(schemas.juniorIdSchema),
  asyncHandler(controller.convert),
);
export default router;
