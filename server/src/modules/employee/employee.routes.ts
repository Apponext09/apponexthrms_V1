import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { requirePermission } from '../../common/middleware/requirePermission';
import { EmployeeController } from './controllers/EmployeeController';

const router = Router();
const controller = new EmployeeController();

/**
 * All employee routes require authentication and tenant context
 */
router.use(authenticate, resolveTenant);

/**
 * GET /employees/upload/sample - Download sample CSV template
 */
router.get('/upload/sample', controller.downloadSampleTemplate);

/**
 * POST /employees/bulk - Bulk upload employees
 */
router.post('/bulk', controller.bulkUploadEmployees);

router.post('/profile-update-requests', controller.createProfileUpdateRequest);
router.get('/profile-update-requests', controller.getProfileUpdateRequests);
router.patch('/profile-update-requests/:id/status', controller.updateProfileUpdateRequestStatus);
router.get('/my-edit-permission', controller.getMyEditPermission);
router.post('/consume-edit-permission/:requestId', controller.consumeEditPermission);
router.get('/my-profile-requests', controller.getMyProfileRequests);

/**
 * GET /employees/org-hierarchy - Lightweight, uncapped roster for the Org Chart
 */
router.get('/org-hierarchy', controller.getOrgHierarchy);

router.get('/org-hierarchy/rules', controller.getOrgHierarchyRules);
router.put('/org-hierarchy/rules', requirePermission('employee.org_hierarchy.update'), controller.saveOrgHierarchyRules);

/**
 * GET /employees/me - Get logged-in user employee profile
 */
router.get('/me', controller.getMeEmployee);

/**
 * PUT /employees/me - Update logged-in user employee profile
 */
router.put('/me', controller.updateMeEmployee);

/**
 * GET /employees/next-code - Preview the employee code that would be
 * assigned by the next POST /employees call (same generator, not a
 * reservation). Must stay registered before GET /:id.
 */
router.get('/next-code', controller.getNextEmployeeCode);

// Named self-service routes must stay before the dynamic /:id matcher.
router.get('/my-documents', controller.getMyDocuments);

/**
 * GET /employees - List all employees
 */
router.get('/', requirePermission('employee.profile.read'), controller.listEmployees);

/**
 * GET /employees/:id - Get employee by ID
 */
router.get('/:id', requirePermission('employee.profile.read'), controller.getEmployee);

/**
 * POST /employees - Create new employee
 */
router.post('/', requirePermission('employee.profile.create'), controller.createEmployee);

/**
 * PUT /employees/:id - Update employee
 */
router.put('/:id', requirePermission('employee.profile.update'), controller.updateEmployee);

/**
 * PATCH /employees/:id - Update employee (partial)
 */
router.patch('/:id', requirePermission('employee.profile.update'), controller.updateEmployee);

/**
 * DELETE /employees/:id - Delete employee
 */
router.delete('/:id', requirePermission('employee.profile.delete'), controller.deleteEmployee);

/**
 * GET /employees/:id/direct-reports - Get direct reports
 */
router.get('/:id/direct-reports', requirePermission('employee.profile.read'), controller.getDirectReports);

/**
 * Personal info (family & address details)
 */
router.get('/:id/personal-info', requirePermission('employee.profile.read'), controller.getPersonalInfo);
router.put('/:id/personal-info', requirePermission('employee.profile.update'), controller.upsertPersonalInfo);

/**
 * Professional info (education, experience, links)
 */
router.get('/:id/professional-info', requirePermission('employee.profile.read'), controller.getProfessionalInfo);
router.put('/:id/professional-info', requirePermission('employee.profile.update'), controller.upsertProfessionalInfo);

/**
 * Documents
 */
router.get('/:id/documents', requirePermission('employee.profile.read'), controller.getDocuments);
router.post('/:id/documents', requirePermission('employee.profile.update'), controller.uploadDocument);
router.post('/:id/accept-document-policy', controller.acceptDocumentPolicy);
router.post('/documents/:documentId/verify', controller.verifyDocument);
router.delete('/documents/:documentId', requirePermission('employee.profile.update'), controller.deleteDocument);

/**
 * Asset allocations
 */
router.get('/:id/assets', requirePermission('employee.profile.read'), controller.getEmployeeAssets);
router.post('/:id/assets', requirePermission('employee.profile.update'), controller.allocateAsset);
router.post('/asset-allocations/:allocationId/return', controller.returnAsset);

/**
 * Digital ID Card
 */
router.post('/:id/id-card/issue', requirePermission('employee.profile.update'), controller.issueIdCard);

export default router;
