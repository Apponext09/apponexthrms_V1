import { Router } from 'express';
import { ManagerController } from './controllers/ManagerController';

const router = Router();
const controller = new ManagerController();

router.get('/dashboard', controller.getDashboard);
router.get('/employees', controller.getEmployees);
router.post('/recommendations', controller.submitRecommendation);
router.post('/resource-requests', controller.submitResourceRequest);

export default router;
