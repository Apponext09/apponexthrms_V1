import { Router } from 'express';
import { WorkflowController } from './controllers/WorkflowController';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { requirePermission } from '../../common/middleware/requirePermission';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();
const controller = new WorkflowController();

router.use(authenticate, resolveTenant);

// Root endpoint - list workflows
router.get('/', asyncHandler(controller.listWorkflows.bind(controller)));

// Workflow Definition Routes
router.post('/workflows', authenticate, requirePermission('workflow:create'), asyncHandler(controller.createWorkflow.bind(controller)));
router.get('/workflows', authenticate, requirePermission('workflow:read'), asyncHandler(controller.listWorkflows.bind(controller)));
router.get('/workflows/:id', authenticate, requirePermission('workflow:read'), asyncHandler(controller.getWorkflow.bind(controller)));
router.patch('/workflows/:id', authenticate, requirePermission('workflow:update'), asyncHandler(controller.updateWorkflow.bind(controller)));
router.delete('/workflows/:id', authenticate, requirePermission('workflow:delete'), asyncHandler(controller.deleteWorkflow.bind(controller)));
router.post('/workflows/:id/publish', authenticate, requirePermission('workflow:publish'), asyncHandler(controller.publishWorkflow.bind(controller)));
router.post('/workflows/:id/clone', authenticate, requirePermission('workflow:create'), asyncHandler(controller.cloneWorkflow.bind(controller)));

// Workflow Execution Routes
router.post('/workflows/:workflowCode/start', authenticate, requirePermission('workflow:execute'), asyncHandler(controller.startWorkflow.bind(controller)));
router.get('/instances/:instanceId', authenticate, requirePermission('workflow:read'), asyncHandler(controller.getWorkflowInstance.bind(controller)));
router.get('/instances/:instanceId/history', authenticate, requirePermission('workflow:read'), asyncHandler(controller.getInstanceHistory.bind(controller)));
router.post('/instances/:instanceId/cancel', authenticate, requirePermission('workflow:execute'), asyncHandler(controller.cancelWorkflowInstance.bind(controller)));

// Approval Routes
router.get('/approvals/pending', authenticate, asyncHandler(controller.getPendingApprovals.bind(controller)));
router.post('/approvals/:stepId/approve', authenticate, requirePermission('workflow:approve'), asyncHandler(controller.approveStep.bind(controller)));
router.post('/approvals/:stepId/reject', authenticate, requirePermission('workflow:approve'), asyncHandler(controller.rejectStep.bind(controller)));
router.post('/approvals/:stepId/delegate', authenticate, requirePermission('workflow:delegate'), asyncHandler(controller.delegateStep.bind(controller)));
router.post('/approvals/:stepId/escalate', authenticate, requirePermission('workflow:escalate'), asyncHandler(controller.escalateStep.bind(controller)));

// Template Routes
router.post('/templates', authenticate, requirePermission('workflow:manage_templates'), asyncHandler(controller.createTemplate.bind(controller)));
router.get('/templates', authenticate, requirePermission('workflow:read'), asyncHandler(controller.listTemplates.bind(controller)));
router.get('/templates/:id', authenticate, requirePermission('workflow:read'), asyncHandler(controller.getTemplate.bind(controller)));
router.patch('/templates/:id', authenticate, requirePermission('workflow:manage_templates'), asyncHandler(controller.updateTemplate.bind(controller)));
router.delete('/templates/:id', authenticate, requirePermission('workflow:manage_templates'), asyncHandler(controller.deleteTemplate.bind(controller)));
router.post('/templates/:id/workflows', authenticate, requirePermission('workflow:create'), asyncHandler(controller.createWorkflowFromTemplate.bind(controller)));

export default router;

