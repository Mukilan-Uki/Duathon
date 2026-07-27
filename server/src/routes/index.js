import { Router } from 'express';
import healthRoutes from './healthRoutes.js';

const router = Router();
router.use('/health', healthRoutes);
export default router;
