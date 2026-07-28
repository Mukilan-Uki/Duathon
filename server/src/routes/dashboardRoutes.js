import { Router } from 'express';
import {
  adminDashboard,
  customerDashboard,
  employeeDashboard,
} from '../controllers/dashboardController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
router.use(authenticate);
router.get('/customer', authorize('customer'), asyncHandler(customerDashboard));
router.get('/employee', authorize('employee'), asyncHandler(employeeDashboard));
router.get('/admin', authorize('admin'), asyncHandler(adminDashboard));

export default router;
