import { Router } from 'express';
import accountRoutes from './accountRoutes.js';
import authRoutes from './authRoutes.js';
import healthRoutes from './healthRoutes.js';

const router = Router();
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
export default router;
