import { Router } from 'express';
import { superAdminDashboardController } from './dashboard.controller';

const router = Router();

router.get('/stats', superAdminDashboardController.getStats);

export default router;
