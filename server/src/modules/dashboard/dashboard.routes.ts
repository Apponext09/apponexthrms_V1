import { Router } from 'express';
import { adminDashboardController } from './dashboard.controller';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';

const router = Router();

router.use(authenticate, resolveTenant);

// GET /api/v1/dashboard/admin/stats
router.get('/admin/stats', adminDashboardController.getAdminStats);

export default router;
