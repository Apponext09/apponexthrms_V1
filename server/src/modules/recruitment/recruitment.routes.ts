import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { requirePermission } from '../../common/middleware/requirePermission';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { recruitmentController } from './controllers/RecruitmentController';

const router = Router();

// Apply authentication and tenant resolution
router.use(authenticate, resolveTenant);

// Root endpoint - list jobs
router.get('/', asyncHandler((req, res, next) => recruitmentController.listJobs(req, res, next)));

// ==================== Job Routes ====================
router.post('/jobs', requirePermission('recruitment.job.write'), asyncHandler((req, res, next) => recruitmentController.createJob(req, res, next)));
router.get('/jobs', requirePermission('recruitment.job.read'), asyncHandler((req, res, next) => recruitmentController.listJobs(req, res, next)));
router.get('/jobs/:id', requirePermission('recruitment.job.read'), asyncHandler((req, res, next) => recruitmentController.getJob(req, res, next)));
router.post('/jobs/:id/publish', requirePermission('recruitment.job.write'), asyncHandler((req, res, next) => recruitmentController.publishJob(req, res, next)));
router.post('/jobs/:id/close', requirePermission('recruitment.job.write'), asyncHandler((req, res, next) => recruitmentController.closeJob(req, res, next)));

// ==================== Candidate Routes ====================
router.post('/candidates', requirePermission('recruitment.candidate.write'), asyncHandler((req, res, next) => recruitmentController.createCandidate(req, res, next)));
router.get('/candidates', requirePermission('recruitment.candidate.read'), asyncHandler((req, res, next) => recruitmentController.listCandidates(req, res, next)));
router.get('/candidates/:id', requirePermission('recruitment.candidate.read'), asyncHandler((req, res, next) => recruitmentController.getCandidate(req, res, next)));

// ==================== Application Routes ====================
router.post('/applications', requirePermission('recruitment.application.write'), asyncHandler((req, res, next) => recruitmentController.createApplication(req, res, next)));
router.get('/applications', requirePermission('recruitment.application.read'), asyncHandler((req, res, next) => recruitmentController.listApplications(req, res, next)));
router.post('/applications/:applicationId/stage', requirePermission('recruitment.application.write'), asyncHandler((req, res, next) => recruitmentController.moveApplicationStage(req, res, next)));

// ==================== Interview Routes ====================
router.post('/interviews', requirePermission('recruitment.interview.write'), asyncHandler((req, res, next) => recruitmentController.scheduleInterview(req, res, next)));
router.get('/applications/:applicationId/interviews', requirePermission('recruitment.interview.read'), asyncHandler((req, res, next) => recruitmentController.getInterviewsByApplication(req, res, next)));

// ==================== Assessment Routes ====================
router.post('/assessments', requirePermission('recruitment.assessment.write'), asyncHandler((req, res, next) => recruitmentController.createAssessment(req, res, next)));
router.get('/assessments', requirePermission('recruitment.assessment.read'), asyncHandler((req, res, next) => recruitmentController.listAssessments(req, res, next)));

// ==================== Offer Routes ====================
router.post('/offers', requirePermission('recruitment.offer.write'), asyncHandler((req, res, next) => recruitmentController.generateOffer(req, res, next)));
router.get('/offers', requirePermission('recruitment.offer.read'), asyncHandler((req, res, next) => recruitmentController.listOffers(req, res, next)));
router.post('/offers/:offerId/accept', requirePermission('recruitment.offer.write'), asyncHandler((req, res, next) => recruitmentController.acceptOffer(req, res, next)));

// ==================== Report & Analytics Routes ====================
router.get('/analytics/dashboard', requirePermission('recruitment.report.read'), asyncHandler((req, res, next) => recruitmentController.getDashboard(req, res, next)));
router.get('/analytics/metrics', requirePermission('recruitment.report.read'), asyncHandler((req, res, next) => recruitmentController.getMetrics(req, res, next)));

export { router as recruitmentRoutes };
export default router;
