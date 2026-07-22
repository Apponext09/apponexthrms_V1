import { Router } from 'express';
import { helpDeskController } from './helpdesk.controller';

const router = Router();

router.get('/queries', helpDeskController.getQueries);
router.post('/queries', helpDeskController.createQuery);
router.patch('/queries/:id/status', helpDeskController.updateStatus);
router.get('/notifications', helpDeskController.getNotifications);

export default router;
