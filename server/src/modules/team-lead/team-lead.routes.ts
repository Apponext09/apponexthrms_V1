import { Router } from 'express';
import { TeamLeadController } from './controllers/TeamLeadController';

const router = Router();
const controller = new TeamLeadController();

router.get('/dashboard', controller.getDashboard);
router.get('/members', controller.getTeamMembers);
router.get('/approvals', controller.getApprovals);
router.post('/approvals/:id/decide', controller.decideApproval);

export default router;
