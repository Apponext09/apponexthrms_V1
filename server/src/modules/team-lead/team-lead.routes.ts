import { Router } from 'express';
import { TeamLeadController } from './controllers/TeamLeadController';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';

const router = Router();
const controller = new TeamLeadController();

// Apply auth and tenant resolution to all team-lead endpoints
router.use(authenticate, resolveTenant);

router.get('/dashboard', controller.getDashboard);
router.get('/members', controller.getTeamMembers);
router.get('/approvals', controller.getApprovals);
router.post('/approvals/:id/decide', controller.decideApproval);

export default router;
