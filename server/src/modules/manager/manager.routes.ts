import { Router } from 'express';
import { ManagerController } from './controllers/ManagerController';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';

const router = Router();
const controller = new ManagerController();

// Apply auth and tenant resolution to all manager endpoints
router.use(authenticate, resolveTenant);

router.get('/dashboard', controller.getDashboard);
router.get('/employees', controller.getEmployees);
router.post('/recommendations', controller.submitRecommendation);
router.post('/resource-requests', controller.submitResourceRequest);

export default router;
