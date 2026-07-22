import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { EmployeeController } from './controllers/EmployeeController';

const router = Router();
const controller = new EmployeeController();

/**
 * All employee routes require authentication and tenant context
 */
router.use(authenticate, resolveTenant);

/**
 * GET /employees - List all employees
 */
router.get('/', controller.listEmployees);

/**
 * GET /employees/:id - Get employee by ID
 */
router.get('/:id', controller.getEmployee);

/**
 * POST /employees - Create new employee
 */
router.post('/', controller.createEmployee);

/**
 * PUT /employees/:id - Update employee
 */
router.put('/:id', controller.updateEmployee);

/**
 * PATCH /employees/:id - Update employee (partial)
 */
router.patch('/:id', controller.updateEmployee);

/**
 * DELETE /employees/:id - Delete employee
 */
router.delete('/:id', controller.deleteEmployee);

/**
 * GET /employees/:id/direct-reports - Get direct reports
 */
router.get('/:id/direct-reports', controller.getDirectReports);

/**
 * Personal info (family & address details)
 */
router.get('/:id/personal-info', controller.getPersonalInfo);
router.put('/:id/personal-info', controller.upsertPersonalInfo);

/**
 * Professional info (education, experience, links)
 */
router.get('/:id/professional-info', controller.getProfessionalInfo);
router.put('/:id/professional-info', controller.upsertProfessionalInfo);

/**
 * Documents
 */
router.get('/:id/documents', controller.getDocuments);
router.post('/:id/documents', controller.uploadDocument);
router.post('/documents/:documentId/verify', controller.verifyDocument);
router.delete('/documents/:documentId', controller.deleteDocument);

/**
 * Asset allocations
 */
router.get('/:id/assets', controller.getEmployeeAssets);
router.post('/:id/assets', controller.allocateAsset);
router.post('/asset-allocations/:allocationId/return', controller.returnAsset);

/**
 * Lifecycle
 */
router.get('/:id/lifecycle', controller.getLifecycleHistory);
router.post('/:id/lifecycle/transition', controller.transitionStatus);

export default router;
