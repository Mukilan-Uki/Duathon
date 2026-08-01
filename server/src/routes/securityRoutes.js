import { Router } from 'express';
import * as controller from '../controllers/trustedDeviceController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireTrustedOrigin } from '../middleware/requireTrustedOrigin.js';
import { validate } from '../middleware/validate.js';
import * as schemas from '../validators/trustedDeviceValidators.js';
const router = Router();
router.use(authenticate);
router.get('/devices', asyncHandler(controller.list));
router.get('/devices/current', asyncHandler(controller.current));
router.post(
  '/devices/trust',
  requireTrustedOrigin,
  validate(schemas.trustSchema),
  asyncHandler(controller.trust),
);
router.patch(
  '/devices/:deviceId',
  requireTrustedOrigin,
  validate(schemas.renameSchema),
  asyncHandler(controller.rename),
);
router.delete(
  '/devices/:deviceId/trust',
  requireTrustedOrigin,
  validate(schemas.revokeSchema),
  asyncHandler(controller.revoke),
);
router.post(
  '/devices/:deviceId/logout',
  requireTrustedOrigin,
  validate(schemas.deviceIdSchema),
  asyncHandler(controller.logout),
);
router.post(
  '/devices/logout-all',
  requireTrustedOrigin,
  validate(schemas.logoutAllSchema),
  asyncHandler(controller.logoutAll),
);
export default router;
