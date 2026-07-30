import { Router } from 'express';
import { approvalController } from './controllers/ApprovalController';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/dashboard', approvalController.getDashboardData);

export default router;
