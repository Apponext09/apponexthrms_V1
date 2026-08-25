import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { policyController } from './controllers/PolicyController';

const router = Router();

// All policy routes require authentication and tenant resolution
router.use(authenticate, resolveTenant);

// User-facing policy endpoints (Must be accessible by all authenticated roles)
router.get('/my-policies', policyController.getMyPolicies);
router.get('/pending', policyController.getPendingPolicies);

// Category Management endpoints (Before /:id to avoid route collisions)
router.get('/categories', policyController.listCategories);
router.post('/categories', policyController.createCategory);
router.delete('/categories/:id', policyController.deleteCategory);

router.post('/:id/accept', policyController.acceptPolicy);

// Admin & HR management endpoints
router.get('/', policyController.listPolicies);
router.post('/', policyController.createPolicy);
router.get('/:id', policyController.getPolicy);
router.put('/:id', policyController.updatePolicy);
router.delete('/:id', policyController.deletePolicy);
router.get('/:id/audit', policyController.getPolicyAudit);

export default router;
