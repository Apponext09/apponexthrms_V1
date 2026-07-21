import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { requirePermission } from '../../common/middleware/requirePermission';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { goalController } from './controllers/GoalController';
import { okrController } from './controllers/OKRController';
import { reviewController } from './controllers/ReviewController';
import { feedbackController } from './controllers/FeedbackController';
import { appraisalController } from './controllers/AppraisalController';
import { competencyController } from './controllers/CompetencyController';
import { pipController } from './controllers/PIPController';
import { successionController } from './controllers/SuccessionController';
import { recognitionController } from './controllers/RecognitionController';
import { analyticsController } from './controllers/AnalyticsController';

const router = Router();

// Apply authentication and tenant resolution for all performance routes
router.use(authenticate, resolveTenant);

// Root endpoint - get performance summary
router.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { module: 'performance' } });
}));

// Goal Management Routes
router.post('/goals', requirePermission('performance.goal_write'), asyncHandler((req, res) => goalController.createGoal(req, res)));
router.get('/goals/:id', requirePermission('performance.goal_read'), asyncHandler((req, res) => goalController.getGoal(req, res)));
router.get('/goals', requirePermission('performance.goal_read'), asyncHandler((req, res) => goalController.listGoals(req, res)));
router.patch('/goals/:id', requirePermission('performance.goal_write'), asyncHandler((req, res) => goalController.updateGoal(req, res)));
router.patch('/goals/:id/progress', requirePermission('performance.goal_write'), asyncHandler((req, res) => goalController.updateProgress(req, res)));
router.delete('/goals/:id', requirePermission('performance.goal_write'), asyncHandler((req, res) => goalController.deleteGoal(req, res)));
router.get('/employees/:employeeId/goals', requirePermission('performance.goal_read'), asyncHandler((req, res) => goalController.getEmployeeGoals(req, res)));

// OKR Management Routes
router.post('/okrs', requirePermission('performance.okr_write'), asyncHandler((req, res) => okrController.createOKR(req, res)));
router.get('/okrs/:id', requirePermission('performance.okr_read'), asyncHandler((req, res) => okrController.getOKR(req, res)));
router.patch('/okrs/:id', requirePermission('performance.okr_write'), asyncHandler((req, res) => okrController.updateOKR(req, res)));
router.post('/okrs/:id/key-results', requirePermission('performance.okr_write'), asyncHandler((req, res) => okrController.createKeyResult(req, res)));
router.patch('/key-results/:keyResultId/progress', requirePermission('performance.okr_write'), asyncHandler((req, res) => okrController.updateKeyResultProgress(req, res)));
router.get('/okrs/:id/completion', requirePermission('performance.okr_read'), asyncHandler((req, res) => okrController.getCompletion(req, res)));
router.patch('/okrs/:id/activate', requirePermission('performance.okr_write'), asyncHandler((req, res) => okrController.activateOKR(req, res)));
router.patch('/okrs/:id/complete', requirePermission('performance.okr_write'), asyncHandler((req, res) => okrController.completeOKR(req, res)));
router.delete('/okrs/:id', requirePermission('performance.okr_write'), asyncHandler((req, res) => okrController.deleteOKR(req, res)));

// Review Cycle & Review Routes
router.post('/review-cycles', requirePermission('performance.review_cycle_write'), asyncHandler((req, res) => reviewController.createCycle(req, res)));
router.post('/review-templates', requirePermission('performance.review_cycle_write'), asyncHandler((req, res) => reviewController.createTemplate(req, res)));
router.post('/reviews', requirePermission('performance.review_write'), asyncHandler((req, res) => reviewController.createReview(req, res)));
router.get('/reviews/:id', requirePermission('performance.review_read'), asyncHandler((req, res) => reviewController.getReview(req, res)));
router.patch('/reviews/:id/submit', requirePermission('performance.review_submit'), asyncHandler((req, res) => reviewController.submitReview(req, res)));
router.patch('/reviews/:id/approve', requirePermission('performance.review_approve'), asyncHandler((req, res) => reviewController.approveReview(req, res)));
router.get('/employees/:employeeId/reviews', requirePermission('performance.review_read'), asyncHandler((req, res) => reviewController.getEmployeeReviews(req, res)));
router.get('/cycles/:cycleId/reviews', requirePermission('performance.review_read'), asyncHandler((req, res) => reviewController.getCycleReviews(req, res)));
router.patch('/cycles/:id/activate', requirePermission('performance.review_cycle_manage'), asyncHandler((req, res) => reviewController.activateCycle(req, res)));
router.patch('/cycles/:id/complete', requirePermission('performance.review_cycle_manage'), asyncHandler((req, res) => reviewController.completeCycle(req, res)));

// Feedback Routes
router.post('/feedback-requests', requirePermission('performance.feedback_write'), asyncHandler((req, res) => feedbackController.createFeedbackRequest(req, res)));
router.post('/feedback-responses', requirePermission('performance.feedback_write'), asyncHandler((req, res) => feedbackController.submitFeedback(req, res)));
router.get('/employees/:employeeId/feedback-requests', requirePermission('performance.feedback_read'), asyncHandler((req, res) => feedbackController.getEmployeeFeedbackRequests(req, res)));
router.get('/feedback-requests/pending', requirePermission('performance.feedback_read'), asyncHandler((req, res) => feedbackController.getPendingRequests(req, res)));
router.get('/feedback-requests/:requestId/responses', requirePermission('performance.feedback_read'), asyncHandler((req, res) => feedbackController.getResponses(req, res)));
router.get('/employees/:employeeId/cycles/:cycleId/feedback-360', requirePermission('performance.feedback_360'), asyncHandler((req, res) => feedbackController.get360Feedback(req, res)));
router.get('/feedback-requests/:requestId/average-score', requirePermission('performance.feedback_read'), asyncHandler((req, res) => feedbackController.getAverageScore(req, res)));

// Appraisal Routes
router.post('/appraisals', requirePermission('performance.appraisal_write'), asyncHandler((req, res) => appraisalController.createAppraisal(req, res)));
router.post('/appraisals/:appraisalId/ratings', requirePermission('performance.appraisal_write'), asyncHandler((req, res) => appraisalController.addCompetencyRating(req, res)));
router.get('/appraisals/:id', requirePermission('performance.appraisal_read'), asyncHandler((req, res) => appraisalController.getAppraisal(req, res)));
router.get('/appraisals/:id/with-ratings', requirePermission('performance.appraisal_read'), asyncHandler((req, res) => appraisalController.getAppraisalWithRatings(req, res)));
router.patch('/appraisals/:id/finalize', requirePermission('performance.appraisal_approve'), asyncHandler((req, res) => appraisalController.finalizeAppraisal(req, res)));
router.get('/employees/:employeeId/appraisals', requirePermission('performance.appraisal_read'), asyncHandler((req, res) => appraisalController.getEmployeeAppraisals(req, res)));
router.get('/cycles/:cycleId/appraisals', requirePermission('performance.appraisal_read'), asyncHandler((req, res) => appraisalController.getCycleAppraisals(req, res)));
router.get('/cycles/:cycleId/average-rating', requirePermission('performance.appraisal_read'), asyncHandler((req, res) => appraisalController.getOrganizationAverageRating(req, res)));

// Competency Management Routes
router.post('/competency-frameworks', requirePermission('performance.competency_write'), asyncHandler((req, res) => competencyController.createFramework(req, res)));
router.post('/competencies', requirePermission('performance.competency_write'), asyncHandler((req, res) => competencyController.createCompetency(req, res)));
router.post('/employee-competencies', requirePermission('performance.competency_assess'), asyncHandler((req, res) => competencyController.assessCompetency(req, res)));
router.get('/employees/:employeeId/competencies', requirePermission('performance.competency_read'), asyncHandler((req, res) => competencyController.getEmployeeCompetencies(req, res)));
router.get('/employees/:employeeId/competency-gaps', requirePermission('performance.competency_read'), asyncHandler((req, res) => competencyController.getCompetencyGaps(req, res)));
router.get('/frameworks/:frameworkId', requirePermission('performance.competency_read'), asyncHandler((req, res) => competencyController.getFrameworkWithCompetencies(req, res)));
router.get('/competency-frameworks', requirePermission('performance.competency_read'), asyncHandler((req, res) => competencyController.listFrameworks(req, res)));
router.patch('/employee-competencies/:id', requirePermission('performance.competency_write'), asyncHandler((req, res) => competencyController.updateCompetency(req, res)));

// PIP Routes
router.post('/pips', requirePermission('performance.pip_write'), asyncHandler((req, res) => pipController.createPIP(req, res)));
router.post('/pips/:pipId/goals', requirePermission('performance.pip_write'), asyncHandler((req, res) => pipController.addGoal(req, res)));
router.post('/pips/:pipId/reviews', requirePermission('performance.pip_review'), asyncHandler((req, res) => pipController.createReview(req, res)));
router.get('/pips/:id', requirePermission('performance.pip_read'), asyncHandler((req, res) => pipController.getPIP(req, res)));
router.get('/pips/:id/with-details', requirePermission('performance.pip_read'), asyncHandler((req, res) => pipController.getPIPWithDetails(req, res)));
router.get('/employees/:employeeId/pips', requirePermission('performance.pip_read'), asyncHandler((req, res) => pipController.getEmployeePIPs(req, res)));
router.get('/pips/:id/progress', requirePermission('performance.pip_read'), asyncHandler((req, res) => pipController.getPIPProgress(req, res)));
router.patch('/pip-goals/:goalId/status', requirePermission('performance.pip_write'), asyncHandler((req, res) => pipController.updateGoalStatus(req, res)));
router.patch('/pips/:id/complete', requirePermission('performance.pip_write'), asyncHandler((req, res) => pipController.completePIP(req, res)));

// Succession Planning Routes
router.post('/succession-positions', requirePermission('performance.succession_write'), asyncHandler((req, res) => successionController.createPosition(req, res)));
router.post('/successors', requirePermission('performance.succession_write'), asyncHandler((req, res) => successionController.addSuccessor(req, res)));
router.get('/succession-positions/:id', requirePermission('performance.succession_read'), asyncHandler((req, res) => successionController.getPosition(req, res)));
router.get('/succession-positions/:id/with-successors', requirePermission('performance.succession_read'), asyncHandler((req, res) => successionController.getPositionWithSuccessors(req, res)));
router.get('/succession-positions/:positionId/ready-successors', requirePermission('performance.succession_read'), asyncHandler((req, res) => successionController.getReadySuccessors(req, res)));
router.get('/succession-positions/:positionId/high-potential-successors', requirePermission('performance.succession_read'), asyncHandler((req, res) => successionController.getHighPotentialSuccessors(req, res)));
router.get('/succession-positions/critical', requirePermission('performance.succession_read'), asyncHandler((req, res) => successionController.getCriticalPositions(req, res)));
router.get('/employees/:employeeId/succession-positions', requirePermission('performance.succession_read'), asyncHandler((req, res) => successionController.getPositionsForEmployee(req, res)));
router.patch('/successors/:successorId/readiness', requirePermission('performance.succession_write'), asyncHandler((req, res) => successionController.updateSuccessorReadiness(req, res)));
router.get('/succession-positions', requirePermission('performance.succession_read'), asyncHandler((req, res) => successionController.getAllPositions(req, res)));

// Recognition & Rewards Routes
router.post('/recognitions', requirePermission('performance.recognition_write'), asyncHandler((req, res) => recognitionController.recognize(req, res)));
router.get('/employees/:employeeId/recognitions', requirePermission('performance.recognition_read'), asyncHandler((req, res) => recognitionController.getEmployeeRecognitions(req, res)));
router.get('/employees/:employeeId/total-points', requirePermission('performance.reward_read'), asyncHandler((req, res) => recognitionController.getTotalPoints(req, res)));
router.get('/employees/:employeeId/reward-points', requirePermission('performance.reward_read'), asyncHandler((req, res) => recognitionController.getRewardPoints(req, res)));
router.patch('/employees/:employeeId/redeem-points', requirePermission('performance.reward_redeem'), asyncHandler((req, res) => recognitionController.redeemPoints(req, res)));
router.get('/recognitions/type/:type', requirePermission('performance.recognition_read'), asyncHandler((req, res) => recognitionController.getRecognitionsByType(req, res)));
router.get('/leaderboard', requirePermission('performance.recognition_read'), asyncHandler((req, res) => recognitionController.getLeaderboard(req, res)));

// Analytics Routes
router.get('/analytics/dashboard', requirePermission('performance.analytics_read'), asyncHandler((req, res) => analyticsController.getDashboardMetrics(req, res)));
router.get('/analytics/goals', requirePermission('performance.analytics_read'), asyncHandler((req, res) => analyticsController.getGoalProgressReport(req, res)));
router.get('/analytics/talent-matrix', requirePermission('performance.talent_matrix_read'), asyncHandler((req, res) => analyticsController.getTalentMatrix(req, res)));
router.get('/analytics/cycles/:cycleId', requirePermission('performance.analytics_read'), asyncHandler((req, res) => analyticsController.getReviewCycleReport(req, res)));
router.get('/analytics/:metricType', requirePermission('performance.analytics_read'), asyncHandler((req, res) => analyticsController.getMetric(req, res)));

export default router;

