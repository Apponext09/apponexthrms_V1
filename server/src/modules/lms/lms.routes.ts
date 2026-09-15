import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';

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

// ── Analytics & Dashboard ──────────────────────────────────────────
router.get('/dashboard/analytics', asyncHandler((req, res) => lmsReportController.getDashboardAnalytics(req, res)));

// ── Categories ────────────────────────────────────────────────────
router.get('/categories', asyncHandler((req, res) => categoryController.getCategories(req, res)));
router.post('/categories', asyncHandler((req, res) => categoryController.createCategory(req, res)));
router.put('/categories/:id', asyncHandler((req, res) => categoryController.updateCategory(req, res)));
router.delete('/categories/:id', asyncHandler((req, res) => categoryController.deleteCategory(req, res)));

// ── Courses ───────────────────────────────────────────────────────
router.get('/courses', asyncHandler((req, res) => courseController.getCourses(req, res)));
router.get('/courses/:id', asyncHandler((req, res) => courseController.getCourseById(req, res)));
router.post('/courses', asyncHandler((req, res) => courseController.createCourse(req, res)));
router.put('/courses/:id', asyncHandler((req, res) => courseController.updateCourse(req, res)));
router.delete('/courses/:id', asyncHandler((req, res) => courseController.deleteCourse(req, res)));

// ── Modules ───────────────────────────────────────────────────────
router.get('/courses/:courseId/modules', asyncHandler((req, res) => moduleController.getModules(req, res)));
router.post('/modules', asyncHandler((req, res) => moduleController.createModule(req, res)));
router.post('/modules/reorder', asyncHandler((req, res) => moduleController.reorderModules(req, res)));
router.put('/modules/:id', asyncHandler((req, res) => moduleController.updateModule(req, res)));
router.delete('/modules/:id', asyncHandler((req, res) => moduleController.deleteModule(req, res)));

// ── Batches ───────────────────────────────────────────────────────
router.get('/batches', asyncHandler((req, res) => batchController.getBatches(req, res)));
router.post('/batches', asyncHandler((req, res) => batchController.createBatch(req, res)));
router.put('/batches/:id', asyncHandler((req, res) => batchController.updateBatch(req, res)));
router.delete('/batches/:id', asyncHandler((req, res) => batchController.deleteBatch(req, res)));

// ── Enrollments ───────────────────────────────────────────────────
router.get('/enrollments', asyncHandler((req, res) => enrollmentController.getEnrollments(req, res)));
router.get('/enrollments/my', asyncHandler((req, res) => enrollmentController.getMyEnrollments(req, res)));
router.get('/enrollments/team', asyncHandler((req, res) => enrollmentController.getTeamEnrollments(req, res)));
router.post('/enrollments', asyncHandler((req, res) => enrollmentController.createEnrollment(req, res)));
router.post('/enrollments/bulk', asyncHandler((req, res) => enrollmentController.bulkEnroll(req, res)));
router.put('/enrollments/:id/progress', asyncHandler((req, res) => enrollmentController.updateProgress(req, res)));
router.delete('/enrollments/:id', asyncHandler((req, res) => enrollmentController.dropEnrollment(req, res)));

// ── Assessments ───────────────────────────────────────────────────
router.get('/courses/:courseId/assessment', asyncHandler((req, res) => assessmentController.getByCourseId(req, res)));
router.get('/courses/:courseId/assessment/admin', asyncHandler((req, res) => assessmentController.getAdminAssessment(req, res)));
router.post('/assessments', asyncHandler((req, res) => assessmentController.createAssessment(req, res)));
router.put('/assessments/:id', asyncHandler((req, res) => assessmentController.updateAssessment(req, res)));
router.get('/assessments/:id/attempts', asyncHandler((req, res) => assessmentController.getAttempts(req, res)));
router.post('/assessments/submit', asyncHandler((req, res) => assessmentController.submitAssessment(req, res)));

// ── Certificates ──────────────────────────────────────────────────
router.get('/certificates', asyncHandler((req, res) => certificateController.getCertificates(req, res)));
router.get('/certificates/my', asyncHandler((req, res) => certificateController.getMyCertificates(req, res)));
router.get('/certificates/:id', asyncHandler((req, res) => certificateController.getCertificateById(req, res)));
router.get('/certificates/verify/:certificateNumber', asyncHandler((req, res) => certificateController.getCertificateByNumber(req, res)));

// ── Compliance ────────────────────────────────────────────────────
router.get('/compliance', asyncHandler((req, res) => complianceController.getComplianceRules(req, res)));
router.post('/compliance', asyncHandler((req, res) => complianceController.createComplianceRule(req, res)));
router.put('/compliance/:id', asyncHandler((req, res) => complianceController.updateComplianceRule(req, res)));
router.delete('/compliance/:id', asyncHandler((req, res) => complianceController.deleteComplianceRule(req, res)));

// ── Integrations (Platform toggle + on-demand sync) ────────────────
// GET  /lms/integrations/settings          → list all platforms + enabled flags (no credentials)
// PUT  /lms/integrations/settings/:platform → admin: enable/disable + save credentials
// POST /lms/integrations/sync/:platform     → admin: trigger on-demand import
router.get('/integrations/settings', asyncHandler((req, res) => lmsIntegrationController.getSettings(req, res)));
router.put('/integrations/settings/:platform', asyncHandler((req, res) => lmsIntegrationController.updateSetting(req, res)));
router.post('/integrations/sync/:platform', asyncHandler((req, res) => lmsIntegrationController.syncPlatform(req, res)));

export default router;
