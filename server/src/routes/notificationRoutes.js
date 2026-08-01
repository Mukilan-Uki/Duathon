import { Router } from 'express';
import {
  notifications,
  preferences,
  readAllNotifications,
  readNotification,
  removeNotification,
  unreadNotifications,
} from '../controllers/operationsController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  notificationIdSchema,
  notificationListSchema,
  preferencesSchema,
} from '../validators/operationsValidators.js';

const router = Router();
router.use(authenticate);
router.get('/', validate(notificationListSchema), asyncHandler(notifications));
router.get('/unread', validate(notificationListSchema), asyncHandler(unreadNotifications));
router.patch('/read-all', asyncHandler(readAllNotifications));
router.patch('/preferences', validate(preferencesSchema), asyncHandler(preferences));
router.patch(
  '/:notificationId/read',
  validate(notificationIdSchema),
  asyncHandler(readNotification),
);
router.delete('/:notificationId', validate(notificationIdSchema), asyncHandler(removeNotification));

export default router;
