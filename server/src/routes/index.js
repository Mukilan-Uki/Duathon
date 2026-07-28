import { Router } from 'express';
import accountRoutes from './accountRoutes.js';
import authRoutes from './authRoutes.js';
import beneficiaryRoutes from './beneficiaryRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import healthRoutes from './healthRoutes.js';
import loanRoutes from './loanRoutes.js';
import transactionRoutes from './transactionRoutes.js';

const router = Router();
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/beneficiaries', beneficiaryRoutes);
router.use('/loans', loanRoutes);
router.use('/dashboards', dashboardRoutes);
export default router;
