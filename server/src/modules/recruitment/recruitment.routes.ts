import { Router } from 'express';
import { recruitmentController } from './controllers/RecruitmentController';
import { mrfController } from './controllers/MrfController';
import { resumeBankController } from './controllers/ResumeBankController';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { requirePermission } from '../../common/middleware/requirePermission';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { recruitmentController } from './controllers/RecruitmentController';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

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
router.get('/', requirePermission('recruitment.job.read'), recruitmentController.listJobs);

// ==================== MRF Request Routes ====================
router.post('/mrf', requirePermission('recruitment.mrf.write'), mrfController.createMrf);
router.get('/mrf', requirePermission('recruitment.mrf.read'), mrfController.listMrfs);
router.get('/mrf/:id', requirePermission('recruitment.mrf.read'), mrfController.getMrf);
router.patch('/mrf/:id', requirePermission('recruitment.mrf.write'), mrfController.updateMrf);
router.delete('/mrf/:id', requirePermission('recruitment.mrf.write'), mrfController.deleteMrf);
router.post('/mrf/:id/copy-link', requirePermission('recruitment.mrf.read'), mrfController.copyLink);
router.post('/mrf/:id/approve', requirePermission('recruitment.mrf.write'), mrfController.approveMrf);
router.post('/mrf/:id/reject', requirePermission('recruitment.mrf.write'), mrfController.rejectMrf);
router.get('/mrf/:id/audit-log', requirePermission('recruitment.mrf.read'), mrfController.getAuditLog);
router.post('/mrf/:id/action', requirePermission('recruitment.mrf.write'), mrfController.addAction);

// ==================== MRF Table Settings Routes ====================
router.get('/mrf/settings/:configType', requirePermission('recruitment.mrf.read'), mrfController.getSettings);
router.put('/mrf/settings/:configType', requirePermission('recruitment.mrf.write'), mrfController.saveSettings);

// ==================== Job Routes ====================
router.post('/jobs', requirePermission('recruitment.job.write'), recruitmentController.createJob);
router.get('/jobs', requirePermission('recruitment.job.read'), recruitmentController.listJobs);
router.get('/jobs/:id', requirePermission('recruitment.job.read'), recruitmentController.getJob);
router.patch('/jobs/:id', requirePermission('recruitment.job.write'), recruitmentController.updateJob);
router.post('/jobs/:id/publish', requirePermission('recruitment.job.write'), recruitmentController.publishJob);
router.post('/jobs/:id/pause', requirePermission('recruitment.job.write'), recruitmentController.pauseJob);
router.post('/jobs/:id/close', requirePermission('recruitment.job.write'), recruitmentController.closeJob);
router.delete('/jobs/:id', requirePermission('recruitment.job.write'), recruitmentController.deleteJob);

// ==================== Job AI & ATS Screening Routes ====================
router.get('/jobs/:id/ai-settings', requirePermission('recruitment.job.read'), recruitmentController.getJobAiSettings);
router.put('/jobs/:id/ai-settings', requirePermission('recruitment.job.write'), recruitmentController.saveJobAiSettings);
router.post('/jobs/:id/ai-screen', requirePermission('recruitment.job.write'), recruitmentController.screenJobCandidates);
router.get('/jobs/:id/ai-suggestions', requirePermission('recruitment.job.read'), recruitmentController.getJobAiSuggestions);
router.post('/jobs/:id/ai-bulk-shortlist', requirePermission('recruitment.candidate.write'), recruitmentController.bulkShortlistAiCandidates);
router.get('/candidates/:id/ai-analysis/:jobId', requirePermission('recruitment.candidate.read'), recruitmentController.getCandidateAiAnalysis);
router.get('/skills/master', requirePermission('recruitment.job.read'), recruitmentController.listSkillMaster);

// ==================== Candidate Routes ====================
router.post('/candidates', requirePermission('recruitment.candidate.write'), recruitmentController.createCandidate);
router.get('/candidates', requirePermission('recruitment.candidate.read'), recruitmentController.listCandidates);
router.get('/candidates/:id', requirePermission('recruitment.candidate.read'), recruitmentController.getCandidate);
router.patch('/candidates/:id', requirePermission('recruitment.candidate.write'), recruitmentController.updateCandidate);
router.delete('/candidates/:id', requirePermission('recruitment.candidate.write'), recruitmentController.deleteCandidate);
router.get('/candidates/:id/notes', requirePermission('recruitment.candidate.read'), recruitmentController.getCandidateNotes);
router.post('/candidates/:id/notes', requirePermission('recruitment.candidate.write'), recruitmentController.addCandidateNote);

// Candidate Documents
router.post('/candidates/:id/documents', requirePermission('recruitment.candidate.write'), upload.single('file'), recruitmentController.uploadCandidateDocument);
router.get('/candidates/:id/documents', requirePermission('recruitment.candidate.read'), recruitmentController.listCandidateDocuments);
router.delete('/candidates/:id/documents/:docId', requirePermission('recruitment.candidate.write'), recruitmentController.deleteCandidateDocument);

// Candidate Skills
router.get('/candidates/:id/skills', requirePermission('recruitment.candidate.read'), recruitmentController.listCandidateSkills);
router.post('/candidates/:id/skills', requirePermission('recruitment.candidate.write'), recruitmentController.addCandidateSkill);
router.delete('/candidates/:id/skills/:skillId', requirePermission('recruitment.candidate.write'), recruitmentController.deleteCandidateSkill);

// Candidate Education
router.get('/candidates/:id/education', requirePermission('recruitment.candidate.read'), recruitmentController.listCandidateEducation);
router.post('/candidates/:id/education', requirePermission('recruitment.candidate.write'), recruitmentController.addCandidateEducation);
router.delete('/candidates/:id/education/:eduId', requirePermission('recruitment.candidate.write'), recruitmentController.deleteCandidateEducation);

// Candidate Experience
router.get('/candidates/:id/experience', requirePermission('recruitment.candidate.read'), recruitmentController.listCandidateExperience);
router.post('/candidates/:id/experience', requirePermission('recruitment.candidate.write'), recruitmentController.addCandidateExperience);
router.delete('/candidates/:id/experience/:expId', requirePermission('recruitment.candidate.write'), recruitmentController.deleteCandidateExperience);

// Candidate Fitment / Scoring
router.get('/candidates/:id/score/:jobId', requirePermission('recruitment.candidate.read'), recruitmentController.getCandidateFitment);

// ==================== Application Routes ====================
router.post('/applications', requirePermission('recruitment.application.write'), recruitmentController.createApplication);
router.get('/applications', requirePermission('recruitment.application.read'), recruitmentController.listApplications);
router.patch('/applications/:applicationId/move-stage', requirePermission('recruitment.application.write'), recruitmentController.moveApplicationStage);
router.patch('/applications/:applicationId/assign-recruiter', requirePermission('recruitment.application.write'), recruitmentController.assignRecruiter);
router.get('/applications/:applicationId/history', requirePermission('recruitment.application.read'), recruitmentController.getApplicationHistory);
router.get('/pipeline-stages', requirePermission('recruitment.application.read'), recruitmentController.listPipelineStages);
router.post('/applications/:applicationId/onboard', requirePermission('recruitment.application.write'), recruitmentController.onboardCandidate);

// ==================== Interview Routes ====================
router.get('/interviews/templates', requirePermission('recruitment.interview.read'), recruitmentController.getInterviewTemplates);
router.post('/interviews', requirePermission('recruitment.interview.write'), recruitmentController.scheduleInterview);
router.post('/interviews/:interviewId/decision', requirePermission('recruitment.interview.write'), recruitmentController.recordInterviewDecision);
router.patch('/interviews/:interviewId/reschedule', requirePermission('recruitment.interview.write'), recruitmentController.rescheduleInterview);
router.post('/interviews/:interviewId/cancel', requirePermission('recruitment.interview.write'), recruitmentController.cancelInterview);
router.get('/applications/:applicationId/interviews', requirePermission('recruitment.interview.read'), recruitmentController.getInterviewsByApplication);
router.post('/interviews/feedback', requirePermission('recruitment.interview.write'), recruitmentController.submitInterviewFeedback);
router.get('/interviews/feedback', requirePermission('recruitment.interview.read'), recruitmentController.listAllInterviewFeedback);
router.get('/interviews/:interviewId/feedback', requirePermission('recruitment.interview.read'), recruitmentController.getInterviewFeedback);
router.get('/interviews/schedule', requirePermission('recruitment.interview.read'), recruitmentController.getInterviewSchedule);
router.get('/interviews/today', requirePermission('recruitment.interview.read'), recruitmentController.getTodayInterviews);

// ==================== Assessment Routes ====================
router.post('/assessments', requirePermission('recruitment.assessment.write'), recruitmentController.createAssessment);
router.get('/assessments', requirePermission('recruitment.assessment.read'), recruitmentController.listAssessments);
router.patch('/assessments/:assessmentId', requirePermission('recruitment.assessment.write'), recruitmentController.updateAssessment);
router.delete('/assessments/:assessmentId', requirePermission('recruitment.assessment.write'), recruitmentController.deleteAssessment);
router.get('/assessments/:assessmentId/attempts', requirePermission('recruitment.assessment.read'), recruitmentController.getAttemptsByAssessment);
router.post('/assessments/assign', requirePermission('recruitment.assessment.write'), recruitmentController.assignAssessment);
router.get('/applications/:applicationId/assessment-attempts', requirePermission('recruitment.assessment.read'), recruitmentController.getAssessmentAttempts);

// Assessment Questions
router.get('/assessments/:assessmentId/questions', requirePermission('recruitment.assessment.read'), recruitmentController.listAssessmentQuestions);
router.post('/assessments/:assessmentId/questions', requirePermission('recruitment.assessment.write'), recruitmentController.addAssessmentQuestion);
router.patch('/assessments/:assessmentId/questions/:questionId', requirePermission('recruitment.assessment.write'), recruitmentController.updateAssessmentQuestion);
router.delete('/assessments/:assessmentId/questions/:questionId', requirePermission('recruitment.assessment.write'), recruitmentController.deleteAssessmentQuestion);

// ==================== Offer Routes ====================
router.get('/offers/templates', requirePermission('recruitment.offer.read'), recruitmentController.getOfferTemplates);
router.post('/offers', requirePermission('recruitment.offer.write'), recruitmentController.generateOffer);
router.get('/offers', requirePermission('recruitment.offer.read'), recruitmentController.listOffers);
router.get('/offers/:offerId', requirePermission('recruitment.offer.read'), recruitmentController.getOffer);
router.post('/offers/:offerId/accept', requirePermission('recruitment.offer.write'), recruitmentController.acceptOffer);
router.post('/offers/:offerId/reject', requirePermission('recruitment.offer.write'), recruitmentController.rejectOffer);
router.post('/offers/:offerId/send', requirePermission('recruitment.offer.write'), recruitmentController.sendOfferWithTemplate);

// ==================== Rejection / Regret Routes ====================
router.get('/rejection/templates', requirePermission('recruitment.application.read'), recruitmentController.getRejectionTemplates);
router.post('/applications/:applicationId/reject-email', requirePermission('recruitment.application.write'), recruitmentController.sendRejectionWithTemplate);

// ==================== Referral Routes ====================
router.post('/referrals', requirePermission('recruitment.candidate.write'), recruitmentController.createReferral);
router.get('/referrals', requirePermission('recruitment.candidate.read'), recruitmentController.listReferrals);
router.get('/referrals/:id', requirePermission('recruitment.candidate.read'), recruitmentController.getReferral);
router.post('/referrals/:id/reward', requirePermission('recruitment.offer.write'), recruitmentController.rewardReferral);
router.delete('/referrals/:id', requirePermission('recruitment.candidate.write'), recruitmentController.deleteReferral);
router.get('/referrals/:id/progress', requirePermission('recruitment.candidate.read'), recruitmentController.trackReferralProgress);

// ==================== Resume Bank Routes ====================
router.post('/resume-bank', requirePermission('recruitment.candidate.write'), resumeBankController.addEntry);
router.post('/resume-bank/:id/shortlist', requirePermission('recruitment.candidate.write'), resumeBankController.shortlistToPipeline);
router.get('/resume-bank', requirePermission('recruitment.candidate.read'), resumeBankController.listEntries);
router.post('/resume-bank/bulk-upload', requirePermission('recruitment.candidate.write'), upload.any(), resumeBankController.bulkUpload);
router.get('/resume-bank/upload-logs', requirePermission('recruitment.candidate.read'), resumeBankController.getUploadLogs);
router.get('/resume-bank/export', requirePermission('recruitment.candidate.read'), resumeBankController.exportCsv);

// ==================== Dashboard & Analytics Routes ====================
router.get('/dashboard', requirePermission('recruitment.read'), recruitmentController.getDashboard);
router.get('/metrics', requirePermission('recruitment.read'), recruitmentController.getMetrics);
router.get('/reports/funnel', requirePermission('recruitment.read'), recruitmentController.getCandidateFunnelReport);

export { router as recruitmentRoutes };
export default router;
