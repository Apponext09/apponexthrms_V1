import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate';
import { resolveTenant } from '../../../common/middleware/resolveTenant';
import { lifecycleController } from './LifecycleController';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/employees', lifecycleController.getEmployeeLifecycleSummaries);
router.get('/employees/me', lifecycleController.getMyEmployeeLifecycleDetails);
router.post('/employees/me/resignation', lifecycleController.submitMyResignation);
router.get('/resignations/pending', lifecycleController.listPendingResignations);
router.post('/resignations/:id/review', lifecycleController.reviewResignation);
router.get('/employees/:id', lifecycleController.getEmployeeLifecycleDetails);
router.get('/managers', lifecycleController.getManagers);
router.post('/transfers', lifecycleController.transferEmployee);
router.post('/onboarding/:employeeId', lifecycleController.saveOnboardingDetails);
router.post('/offboarding/:employeeId', lifecycleController.saveOffboardingDetails);

export default router;
