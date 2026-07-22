import { Router } from 'express';
import { superAdminSubscriptionController } from './subscription.controller';

const router = Router();

router.get('/', superAdminSubscriptionController.getSubscriptions);
router.post('/', superAdminSubscriptionController.createPlan);
router.put('/:id', superAdminSubscriptionController.updatePlan);

export default router;
