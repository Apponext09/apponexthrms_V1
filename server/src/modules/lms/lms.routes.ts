import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { requireMenuModule } from '../rbac/requireMenuAccess';
import { requirePermission } from '../../common/middleware/requirePermission';

import { categoryController } from './controllers/CategoryController';
import { courseController } from './controllers/CourseController';
import { moduleController } from './controllers/ModuleController';
import { batchController } from './controllers/BatchController';
import { enrollmentController } from './controllers/EnrollmentController';
import { assessmentController } from './controllers/AssessmentController';
import { certificateController } from './controllers/CertificateController';
import { complianceController } from './controllers/ComplianceController';
import { lmsReportController } from './controllers/LmsReportController';
import { lmsIntegrationController } from './controllers/LmsIntegrationController';

const router = Router();

router.use(authenticate, resolveTenant);
router.use(requireMenuModule('learning'));

// ── Analytics & Dashboard ──────────────────────────────────────────
router.get('/dashboard/analytics', asyncHandler((req, res) => lmsReportController.getDashboardAnalytics(req, res)));

// ── Categories ────────────────────────────────────────────────────
router.get('/categories', requirePermission('lms.category.view'), asyncHandler((req, res) => categoryController.getCategories(req, res)));
router.post('/categories', requirePermission('lms.category.create'), asyncHandler((req, res) => categoryController.createCategory(req, res)));
router.put('/categories/:id', requirePermission('lms.category.update'), asyncHandler((req, res) => categoryController.updateCategory(req, res)));
router.delete('/categories/:id', requirePermission('lms.category.delete'), asyncHandler((req, res) => categoryController.deleteCategory(req, res)));

// ── Courses ───────────────────────────────────────────────────────
router.get('/courses', requirePermission('lms.course.view'), asyncHandler((req, res) => courseController.getCourses(req, res)));
router.get('/courses/:id', requirePermission('lms.course.view'), asyncHandler((req, res) => courseController.getCourseById(req, res)));
router.post('/courses', requirePermission('lms.course.create'), asyncHandler((req, res) => courseController.createCourse(req, res)));
router.put('/courses/:id', requirePermission('lms.course.update'), asyncHandler((req, res) => courseController.updateCourse(req, res)));
router.delete('/courses/:id', requirePermission('lms.course.delete'), asyncHandler((req, res) => courseController.deleteCourse(req, res)));

// ── Modules ───────────────────────────────────────────────────────
router.get('/courses/:courseId/modules', requirePermission('lms.module.view'), asyncHandler((req, res) => moduleController.getModules(req, res)));
router.post('/modules', requirePermission('lms.module.create'), asyncHandler((req, res) => moduleController.createModule(req, res)));
router.post('/modules/reorder', requirePermission('lms.module.update'), asyncHandler((req, res) => moduleController.reorderModules(req, res)));
router.put('/modules/:id', requirePermission('lms.module.update'), asyncHandler((req, res) => moduleController.updateModule(req, res)));
router.delete('/modules/:id', requirePermission('lms.module.delete'), asyncHandler((req, res) => moduleController.deleteModule(req, res)));

// ── Batches ───────────────────────────────────────────────────────
router.get('/batches', requirePermission('lms.batch.view'), asyncHandler((req, res) => batchController.getBatches(req, res)));
router.post('/batches', requirePermission('lms.batch.create'), asyncHandler((req, res) => batchController.createBatch(req, res)));
router.put('/batches/:id', requirePermission('lms.batch.update'), asyncHandler((req, res) => batchController.updateBatch(req, res)));
router.delete('/batches/:id', requirePermission('lms.batch.delete'), asyncHandler((req, res) => batchController.deleteBatch(req, res)));

// ── Enrollments ───────────────────────────────────────────────────
router.get('/enrollments', requirePermission('lms.enrollment.view'), asyncHandler((req, res) => enrollmentController.getEnrollments(req, res)));
router.get('/enrollments/my', asyncHandler((req, res) => enrollmentController.getMyEnrollments(req, res)));
router.get('/enrollments/team', asyncHandler((req, res) => enrollmentController.getTeamEnrollments(req, res)));
router.post('/enrollments', requirePermission('lms.enrollment.create'), asyncHandler((req, res) => enrollmentController.createEnrollment(req, res)));
router.post('/enrollments/bulk', requirePermission('lms.enrollment.create'), asyncHandler((req, res) => enrollmentController.bulkEnroll(req, res)));
router.put('/enrollments/:id/progress', requirePermission('lms.enrollment.update'), asyncHandler((req, res) => enrollmentController.updateProgress(req, res)));
router.delete('/enrollments/:id', requirePermission('lms.enrollment.delete'), asyncHandler((req, res) => enrollmentController.dropEnrollment(req, res)));

// ── Assessments ───────────────────────────────────────────────────
router.get('/courses/:courseId/assessment', asyncHandler((req, res) => assessmentController.getByCourseId(req, res)));
router.get('/courses/:courseId/assessment/admin', requirePermission('lms.assessment.view'), asyncHandler((req, res) => assessmentController.getAdminAssessment(req, res)));
router.post('/assessments', requirePermission('lms.assessment.create'), asyncHandler((req, res) => assessmentController.createAssessment(req, res)));
router.put('/assessments/:id', requirePermission('lms.assessment.update'), asyncHandler((req, res) => assessmentController.updateAssessment(req, res)));
router.get('/assessments/:id/attempts', requirePermission('lms.assessment.view'), asyncHandler((req, res) => assessmentController.getAttempts(req, res)));
router.post('/assessments/submit', asyncHandler((req, res) => assessmentController.submitAssessment(req, res)));

// ── Certificates ──────────────────────────────────────────────────
router.get('/certificates', asyncHandler((req, res) => certificateController.getCertificates(req, res)));
router.get('/certificates/my', asyncHandler((req, res) => certificateController.getMyCertificates(req, res)));
router.get('/certificates/:id', asyncHandler((req, res) => certificateController.getCertificateById(req, res)));
router.get('/certificates/verify/:certificateNumber', asyncHandler((req, res) => certificateController.getCertificateByNumber(req, res)));

// ── Compliance ────────────────────────────────────────────────────
router.get('/compliance', requirePermission('lms.compliance.view'), asyncHandler((req, res) => complianceController.getComplianceRules(req, res)));
router.post('/compliance', requirePermission('lms.compliance.create'), asyncHandler((req, res) => complianceController.createComplianceRule(req, res)));
router.put('/compliance/:id', requirePermission('lms.compliance.update'), asyncHandler((req, res) => complianceController.updateComplianceRule(req, res)));
router.delete('/compliance/:id', requirePermission('lms.compliance.delete'), asyncHandler((req, res) => complianceController.deleteComplianceRule(req, res)));

// ── Integrations (Platform toggle + on-demand sync) ────────────────
// GET  /lms/integrations/settings          → list all platforms + enabled flags (no credentials)
// PUT  /lms/integrations/settings/:platform → admin: enable/disable + save credentials
// POST /lms/integrations/sync/:platform     → admin: trigger on-demand import
router.get('/integrations/settings', requirePermission('lms.integration.view'), asyncHandler((req, res) => lmsIntegrationController.getSettings(req, res)));
router.put('/integrations/settings/:platform', requirePermission('lms.integration.update'), asyncHandler((req, res) => lmsIntegrationController.updateSetting(req, res)));
router.post('/integrations/sync/:platform', requirePermission('lms.integration.update'), asyncHandler((req, res) => lmsIntegrationController.syncPlatform(req, res)));

export default router;
