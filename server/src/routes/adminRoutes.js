import { Router } from 'express';
import { broadcast } from '../controllers/operationsController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { broadcastNotificationSchema } from '../validators/operationsValidators.js';

const router = Router();
router.use(authenticate, authorize('admin'));
router.post(
  '/notifications/broadcast',
  validate(broadcastNotificationSchema),
  asyncHandler(broadcast),
);

export default router;
