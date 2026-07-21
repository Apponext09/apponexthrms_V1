import { Router } from 'express';
import { recruitmentController } from './controllers/RecruitmentController';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { requirePermission } from '../../common/middleware/requirePermission';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();

// Apply authentication and tenant resolution
router.use(authenticate, resolveTenant);

// Root endpoint - list jobs
router.get('/', asyncHandler((req, res) => recruitmentController.listJobs(req, res)));

// ==================== Job Routes ====================
router.post('/jobs', requirePermission('recruitment.job.write'), asyncHandler((req, res) => recruitmentController.createJob(req, res)));
router.get('/jobs', requirePermission('recruitment.job.read'), asyncHandler((req, res) => recruitmentController.listJobs(req, res)));
router.get('/jobs/:id', requirePermission('recruitment.job.read'), asyncHandler((req, res) => recruitmentController.getJob(req, res)));
router.post('/jobs/:id/publish', requirePermission('recruitment.job.write'), asyncHandler((req, res) => recruitmentController.publishJob(req, res)));
router.post('/jobs/:id/close', requirePermission('recruitment.job.write'), asyncHandler((req, res) => recruitmentController.closeJob(req, res)));

// ==================== Candidate Routes ====================
router.post('/candidates', requirePermission('recruitment.candidate.write'), asyncHandler((req, res) => recruitmentController.createCandidate(req, res)));
router.get('/candidates', requirePermission('recruitment.candidate.read'), asyncHandler((req, res) => recruitmentController.listCandidates(req, res)));
router.get('/candidates/:id', requirePermission('recruitment.candidate.read'), asyncHandler((req, res) => recruitmentController.getCandidate(req, res)));

// ==================== Application Routes ====================
router.post('/applications', requirePermission('recruitment.application.write'), asyncHandler((req, res) => recruitmentController.createApplication(req, res)));
router.get('/applications', requirePermission('recruitment.application.read'), asyncHandler((req, res) => recruitmentController.listApplications(req, res)));
router.patch('/applications/:applicationId/move-stage', requirePermission('recruitment.application.write'), asyncHandler((req, res) => recruitmentController.moveApplicationStage(req, res)));

// ==================== Interview Routes ====================
router.post('/interviews', requirePermission('recruitment.interview.write'), asyncHandler((req, res) => recruitmentController.scheduleInterview(req, res)));
router.get('/applications/:applicationId/interviews', requirePermission('recruitment.interview.read'), asyncHandler((req, res) => recruitmentController.getInterviewsByApplication(req, res)));

// ==================== Assessment Routes ====================
router.post('/assessments', requirePermission('recruitment.assessment.write'), asyncHandler((req, res) => recruitmentController.createAssessment(req, res)));
router.get('/assessments', requirePermission('recruitment.assessment.read'), asyncHandler((req, res) => recruitmentController.listAssessments(req, res)));

// ==================== Offer Routes ====================
router.post('/offers', requirePermission('recruitment.offer.write'), asyncHandler((req, res) => recruitmentController.generateOffer(req, res)));
router.get('/offers', requirePermission('recruitment.offer.read'), asyncHandler((req, res) => recruitmentController.listOffers(req, res)));
router.post('/offers/:offerId/accept', requirePermission('recruitment.offer.write'), asyncHandler((req, res) => recruitmentController.acceptOffer(req, res)));

// ==================== Dashboard & Analytics Routes ====================
router.get('/dashboard', requirePermission('recruitment.read'), asyncHandler((req, res) => recruitmentController.getDashboard(req, res)));
router.get('/metrics', requirePermission('recruitment.read'), asyncHandler((req, res) => recruitmentController.getMetrics(req, res)));

export default router;

