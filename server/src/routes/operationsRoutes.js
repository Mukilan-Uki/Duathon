import { Router } from 'express';
import {
  audits,
  flag,
  investigate,
  notifications,
  preferences,
  readAllNotifications,
  readNotification,
  saveSetting,
  settings,
  suspicious,
} from '../controllers/operationsController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  auditListSchema,
  flagTransactionSchema,
  investigationSchema,
  notificationIdSchema,
  notificationListSchema,
  preferencesSchema,
  settingSchema,
  suspiciousListSchema,
} from '../validators/operationsValidators.js';

const router = Router();
router.use(authenticate);

router.get('/notifications', validate(notificationListSchema), asyncHandler(notifications));
router.patch('/notifications/read-all', authorize('customer'), asyncHandler(readAllNotifications));
router.patch(
  '/notifications/:notificationId/read',
  authorize('customer'),
  validate(notificationIdSchema),
  asyncHandler(readNotification),
);
router.patch(
  '/notification-preferences',
  authorize('customer'),
  validate(preferencesSchema),
  asyncHandler(preferences),
);

router.get(
  '/suspicious-activities',
  authorize('employee', 'admin'),
  validate(suspiciousListSchema),
  asyncHandler(suspicious),
);
router.post(
  '/transactions/:transactionId/flag',
  authorize('employee', 'admin'),
  validate(flagTransactionSchema),
  asyncHandler(flag),
);
router.patch(
  '/suspicious-activities/:activityId',
  authorize('employee', 'admin'),
  validate(investigationSchema),
  asyncHandler(investigate),
);
router.get('/audit-logs', authorize('admin'), validate(auditListSchema), asyncHandler(audits));
router.get('/system-settings', authorize('admin'), asyncHandler(settings));
router.put(
  '/system-settings',
  authorize('admin'),
  validate(settingSchema),
  asyncHandler(saveSetting),
);

export default router;
