import { Router } from 'express';
import accountRoutes from './accountRoutes.js';
import authRoutes from './authRoutes.js';
import beneficiaryRoutes from './beneficiaryRoutes.js';
import healthRoutes from './healthRoutes.js';
import transactionRoutes from './transactionRoutes.js';

const router = Router();
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/beneficiaries', beneficiaryRoutes);
export default router;
