import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  accept,
  addGoal,
  cancelInvite,
  changePermissions,
  changeRole,
  contribute,
  create,
  details,
  editGoal,
  goal,
  goals,
  invite,
  members,
  mine,
  myInvitations,
  reject,
  remove,
  stopGoal,
} from '../controllers/familyController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireIdempotencyKey } from '../middleware/requireIdempotencyKey.js';
import { validate } from '../middleware/validate.js';
import {
  contributeGoalSchema,
  createFamilySchema,
  createGoalSchema,
  familyIdSchema,
  goalIdSchema,
  invitationIdSchema,
  invitationSchema,
  memberIdSchema,
  memberPermissionsSchema,
  memberRoleSchema,
  updateGoalSchema,
} from '../validators/familyValidators.js';

const router = Router();
const invitationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many family invitation requests', errors: [] },
});

router.use(authenticate, authorize('customer'));
router.post('/', validate(createFamilySchema), asyncHandler(create));
router.get('/my', asyncHandler(mine));
router.get('/invitations/my', asyncHandler(myInvitations));
router.patch(
  '/invitations/:invitationId/accept',
  validate(invitationIdSchema),
  asyncHandler(accept),
);
router.patch(
  '/invitations/:invitationId/reject',
  validate(invitationIdSchema),
  asyncHandler(reject),
);
router.patch(
  '/invitations/:invitationId/cancel',
  validate(invitationIdSchema),
  asyncHandler(cancelInvite),
);
router.post(
  '/:familyId/invitations',
  invitationLimiter,
  validate(invitationSchema),
  asyncHandler(invite),
);
router.get('/:familyId', validate(familyIdSchema), asyncHandler(details));
router.get('/:familyId/members', validate(familyIdSchema), asyncHandler(members));
router.patch(
  '/:familyId/members/:memberId/permissions',
  validate(memberPermissionsSchema),
  asyncHandler(changePermissions),
);
router.patch(
  '/:familyId/members/:memberId/role',
  validate(memberRoleSchema),
  asyncHandler(changeRole),
);
router.delete('/:familyId/members/:memberId', validate(memberIdSchema), asyncHandler(remove));
router.post('/:familyId/goals', validate(createGoalSchema), asyncHandler(addGoal));
router.get('/:familyId/goals', validate(familyIdSchema), asyncHandler(goals));
router.get('/:familyId/goals/:goalId', validate(goalIdSchema), asyncHandler(goal));
router.post(
  '/:familyId/goals/:goalId/contribute',
  requireIdempotencyKey,
  validate(contributeGoalSchema),
  asyncHandler(contribute),
);
router.patch('/:familyId/goals/:goalId', validate(updateGoalSchema), asyncHandler(editGoal));
router.patch('/:familyId/goals/:goalId/cancel', validate(goalIdSchema), asyncHandler(stopGoal));

export default router;
