import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { requirePermission } from '../../common/middleware/requirePermission';
import { denyRoles } from '../../common/middleware/denyRoles';
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
router.use(denyRoles(['organization_admin', 'ceo', 'hr', 'hr_admin', 'hr_manager']));

// Root endpoint - get performance summary
router.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, data: { module: 'performance' } });
}));

// Goal Management Routes
router.post('/goals', requirePermission('performance.goal_write'), asyncHandler((req, res, next) => goalController.createGoal(req, res, next)));
router.get('/goals/:id', requirePermission('performance.goal_read'), asyncHandler((req, res, next) => goalController.getGoal(req, res, next)));
router.get('/goals', requirePermission('performance.goal_read'), asyncHandler((req, res, next) => goalController.listGoals(req, res, next)));
router.patch('/goals/:id', requirePermission('performance.goal_write'), asyncHandler((req, res, next) => goalController.updateGoal(req, res, next)));
router.patch('/goals/:id/progress', requirePermission('performance.goal_write'), asyncHandler((req, res, next) => goalController.updateProgress(req, res, next)));
router.delete('/goals/:id', requirePermission('performance.goal_write'), asyncHandler((req, res, next) => goalController.deleteGoal(req, res, next)));
router.get('/employees/:employeeId/goals', requirePermission('performance.goal_read'), asyncHandler((req, res, next) => goalController.getEmployeeGoals(req, res, next)));

// OKR Management Routes
router.post('/okrs', requirePermission('performance.okr_write'), asyncHandler((req, res, next) => okrController.createOKR(req, res, next)));
router.get('/okrs/:id', requirePermission('performance.okr_read'), asyncHandler((req, res, next) => okrController.getOKR(req, res, next)));
router.patch('/okrs/:id', requirePermission('performance.okr_write'), asyncHandler((req, res, next) => okrController.updateOKR(req, res, next)));
router.post('/okrs/:id/key-results', requirePermission('performance.okr_write'), asyncHandler((req, res, next) => okrController.createKeyResult(req, res, next)));
router.patch('/key-results/:keyResultId/progress', requirePermission('performance.okr_write'), asyncHandler((req, res, next) => okrController.updateKeyResultProgress(req, res, next)));
router.get('/okrs/:id/completion', requirePermission('performance.okr_read'), asyncHandler((req, res, next) => okrController.getCompletion(req, res, next)));
router.patch('/okrs/:id/activate', requirePermission('performance.okr_write'), asyncHandler((req, res, next) => okrController.activateOKR(req, res, next)));
router.patch('/okrs/:id/complete', requirePermission('performance.okr_write'), asyncHandler((req, res, next) => okrController.completeOKR(req, res, next)));
router.delete('/okrs/:id', requirePermission('performance.okr_write'), asyncHandler((req, res, next) => okrController.deleteOKR(req, res, next)));

// Review Cycle & Review Routes
router.get('/review-cycles', requirePermission('performance.review_cycle_read'), asyncHandler((req, res, next) => reviewController.listCycles(req, res, next)));
router.get('/review-cycles/:id', requirePermission('performance.review_cycle_read'), asyncHandler((req, res, next) => reviewController.getCycle(req, res, next)));
router.post('/review-cycles', requirePermission('performance.review_cycle_write'), asyncHandler((req, res, next) => reviewController.createCycle(req, res, next)));
router.patch('/review-cycles/:id', requirePermission('performance.review_cycle_write'), asyncHandler((req, res, next) => reviewController.updateCycle(req, res, next)));
router.post('/review-templates', requirePermission('performance.review_cycle_write'), asyncHandler((req, res, next) => reviewController.createTemplate(req, res, next)));
router.get('/reviews', requirePermission('performance.review_read'), asyncHandler((req, res, next) => reviewController.listReviews(req, res, next)));
router.post('/reviews', requirePermission('performance.review_write'), asyncHandler((req, res, next) => reviewController.createReview(req, res, next)));
router.get('/reviews/:id', requirePermission('performance.review_read'), asyncHandler((req, res, next) => reviewController.getReview(req, res, next)));
router.patch('/reviews/:id/submit', requirePermission('performance.review_submit'), asyncHandler((req, res, next) => reviewController.submitReview(req, res, next)));
router.patch('/reviews/:id/approve', requirePermission('performance.review_approve'), asyncHandler((req, res, next) => reviewController.approveReview(req, res, next)));
router.get('/employees/:employeeId/reviews', requirePermission('performance.review_read'), asyncHandler((req, res, next) => reviewController.getEmployeeReviews(req, res, next)));
router.get('/cycles/:cycleId/reviews', requirePermission('performance.review_read'), asyncHandler((req, res, next) => reviewController.getCycleReviews(req, res, next)));
router.patch('/cycles/:id/activate', requirePermission('performance.review_cycle_manage'), asyncHandler((req, res, next) => reviewController.activateCycle(req, res, next)));
router.patch('/cycles/:id/complete', requirePermission('performance.review_cycle_manage'), asyncHandler((req, res, next) => reviewController.completeCycle(req, res, next)));

// Feedback Routes
router.post('/feedback-requests', requirePermission('performance.feedback_write'), asyncHandler((req, res, next) => feedbackController.createFeedbackRequest(req, res, next)));
router.post('/feedback-responses', requirePermission('performance.feedback_write'), asyncHandler((req, res, next) => feedbackController.submitFeedback(req, res, next)));
router.get('/employees/:employeeId/feedback-requests', requirePermission('performance.feedback_read'), asyncHandler((req, res, next) => feedbackController.getEmployeeFeedbackRequests(req, res, next)));
router.get('/feedback-requests/pending', requirePermission('performance.feedback_read'), asyncHandler((req, res, next) => feedbackController.getPendingRequests(req, res, next)));
router.get('/feedback-requests/:requestId/responses', requirePermission('performance.feedback_read'), asyncHandler((req, res, next) => feedbackController.getResponses(req, res, next)));
router.get('/employees/:employeeId/cycles/:cycleId/feedback-360', requirePermission('performance.feedback_360'), asyncHandler((req, res, next) => feedbackController.get360Feedback(req, res, next)));
router.get('/feedback-requests/:requestId/average-score', requirePermission('performance.feedback_read'), asyncHandler((req, res, next) => feedbackController.getAverageScore(req, res, next)));

// Appraisal Routes
router.post('/appraisals', requirePermission('performance.appraisal_write'), asyncHandler((req, res, next) => appraisalController.createAppraisal(req, res, next)));
router.post('/appraisals/:appraisalId/ratings', requirePermission('performance.appraisal_write'), asyncHandler((req, res, next) => appraisalController.addCompetencyRating(req, res, next)));
router.get('/appraisals/:id', requirePermission('performance.appraisal_read'), asyncHandler((req, res, next) => appraisalController.getAppraisal(req, res, next)));
router.get('/appraisals/:id/with-ratings', requirePermission('performance.appraisal_read'), asyncHandler((req, res, next) => appraisalController.getAppraisalWithRatings(req, res, next)));
router.patch('/appraisals/:id/finalize', requirePermission('performance.appraisal_approve'), asyncHandler((req, res, next) => appraisalController.finalizeAppraisal(req, res, next)));
router.get('/employees/:employeeId/appraisals', requirePermission('performance.appraisal_read'), asyncHandler((req, res, next) => appraisalController.getEmployeeAppraisals(req, res, next)));
router.get('/cycles/:cycleId/appraisals', requirePermission('performance.appraisal_read'), asyncHandler((req, res, next) => appraisalController.getCycleAppraisals(req, res, next)));
router.get('/cycles/:cycleId/average-rating', requirePermission('performance.appraisal_read'), asyncHandler((req, res, next) => appraisalController.getOrganizationAverageRating(req, res, next)));

// Competency Management Routes
router.post('/competency-frameworks', requirePermission('performance.competency_write'), asyncHandler((req, res, next) => competencyController.createFramework(req, res, next)));
router.post('/competencies', requirePermission('performance.competency_write'), asyncHandler((req, res, next) => competencyController.createCompetency(req, res, next)));
router.get('/competency-frameworks', requirePermission('performance.competency_read'), asyncHandler((req, res, next) => competencyController.listFrameworks(req, res, next)));
router.patch('/employee-competencies/:id', requirePermission('performance.competency_write'), asyncHandler((req, res, next) => competencyController.updateCompetency(req, res, next)));

// PIP Routes
router.post('/pips', requirePermission('performance.pip_write'), asyncHandler((req, res, next) => pipController.createPIP(req, res, next)));
router.post('/pips/:pipId/goals', requirePermission('performance.pip_write'), asyncHandler((req, res, next) => pipController.addGoal(req, res, next)));
router.post('/pips/:pipId/reviews', requirePermission('performance.pip_review'), asyncHandler((req, res, next) => pipController.createReview(req, res, next)));
router.get('/pips/:id', requirePermission('performance.pip_read'), asyncHandler((req, res, next) => pipController.getPIP(req, res, next)));
router.get('/pips/:id/with-details', requirePermission('performance.pip_read'), asyncHandler((req, res, next) => pipController.getPIPWithDetails(req, res, next)));
router.get('/employees/:employeeId/pips', requirePermission('performance.pip_read'), asyncHandler((req, res, next) => pipController.getEmployeePIPs(req, res, next)));
router.get('/pips/:id/progress', requirePermission('performance.pip_read'), asyncHandler((req, res, next) => pipController.getPIPProgress(req, res, next)));
router.patch('/pip-goals/:goalId/status', requirePermission('performance.pip_write'), asyncHandler((req, res, next) => pipController.updateGoalStatus(req, res, next)));
router.patch('/pips/:id/complete', requirePermission('performance.pip_write'), asyncHandler((req, res, next) => pipController.completePIP(req, res, next)));

// Succession Planning Routes
router.post('/succession-positions', requirePermission('performance.succession_write'), asyncHandler((req, res, next) => successionController.createPosition(req, res, next)));
router.post('/successors', requirePermission('performance.succession_write'), asyncHandler((req, res, next) => successionController.addSuccessor(req, res, next)));
router.get('/succession-positions/:id', requirePermission('performance.succession_read'), asyncHandler((req, res, next) => successionController.getPosition(req, res, next)));
router.get('/succession-positions/:id/with-successors', requirePermission('performance.succession_read'), asyncHandler((req, res, next) => successionController.getPositionWithSuccessors(req, res, next)));
router.get('/succession-positions/:positionId/ready-successors', requirePermission('performance.succession_read'), asyncHandler((req, res, next) => successionController.getReadySuccessors(req, res, next)));
router.get('/succession-positions/:positionId/high-potential-successors', requirePermission('performance.succession_read'), asyncHandler((req, res, next) => successionController.getHighPotentialSuccessors(req, res, next)));
router.get('/succession-positions/critical', requirePermission('performance.succession_read'), asyncHandler((req, res, next) => successionController.getCriticalPositions(req, res, next)));
router.get('/employees/:employeeId/succession-positions', requirePermission('performance.succession_read'), asyncHandler((req, res, next) => successionController.getPositionsForEmployee(req, res, next)));
router.patch('/successors/:successorId/readiness', requirePermission('performance.succession_write'), asyncHandler((req, res, next) => successionController.updateSuccessorReadiness(req, res, next)));
router.get('/succession-positions', requirePermission('performance.succession_read'), asyncHandler((req, res, next) => successionController.getAllPositions(req, res, next)));

// Recognition & Rewards Routes
router.post('/recognitions', requirePermission('performance.recognition_write'), asyncHandler((req, res, next) => recognitionController.recognize(req, res, next)));
router.get('/employees/:employeeId/recognitions', requirePermission('performance.recognition_read'), asyncHandler((req, res, next) => recognitionController.getEmployeeRecognitions(req, res, next)));
router.get('/employees/:employeeId/total-points', requirePermission('performance.reward_read'), asyncHandler((req, res, next) => recognitionController.getTotalPoints(req, res, next)));
router.get('/employees/:employeeId/reward-points', requirePermission('performance.reward_read'), asyncHandler((req, res, next) => recognitionController.getRewardPoints(req, res, next)));
router.patch('/employees/:employeeId/redeem-points', requirePermission('performance.reward_redeem'), asyncHandler((req, res, next) => recognitionController.redeemPoints(req, res, next)));
router.get('/recognitions/type/:type', requirePermission('performance.recognition_read'), asyncHandler((req, res, next) => recognitionController.getRecognitionsByType(req, res, next)));
router.get('/leaderboard', requirePermission('performance.recognition_read'), asyncHandler((req, res, next) => recognitionController.getLeaderboard(req, res, next)));

// Analytics Routes
router.get('/analytics/dashboard', requirePermission('performance.analytics_read'), asyncHandler((req, res, next) => analyticsController.getDashboardMetrics(req, res, next)));
router.get('/analytics/metrics', requirePermission('performance.analytics_read'), asyncHandler((req, res, next) => analyticsController.getMetrics(req, res, next)));
router.get('/analytics/goals', requirePermission('performance.analytics_read'), asyncHandler((req, res, next) => analyticsController.getGoalProgressReport(req, res, next)));
router.get('/analytics/talent-matrix', requirePermission('performance.talent_matrix_read'), asyncHandler((req, res, next) => analyticsController.getTalentMatrix(req, res, next)));
router.get('/analytics/cycles/:cycleId', requirePermission('performance.analytics_read'), asyncHandler((req, res, next) => analyticsController.getReviewCycleReport(req, res, next)));
router.get('/analytics/:metricType', requirePermission('performance.analytics_read'), asyncHandler((req, res, next) => analyticsController.getMetric(req, res, next)));

export default router;
