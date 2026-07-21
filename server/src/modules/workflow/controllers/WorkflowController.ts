import type { Request, Response } from 'express';
import { WorkflowDefinitionService } from '../services/WorkflowDefinitionService';
import { WorkflowExecutionService } from '../services/WorkflowExecutionService';
import { WorkflowApprovalService } from '../services/WorkflowApprovalService';
import { WorkflowEscalationService } from '../services/WorkflowEscalationService';
import { WorkflowTemplateService } from '../services/WorkflowTemplateService';
import {
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  CreateWorkflowStepSchema,
  UpdateWorkflowStepSchema,
  CreateWorkflowConditionSchema,
  UpdateWorkflowConditionSchema,
  CreateWorkflowRuleSchema,
  UpdateWorkflowRuleSchema,
  StartWorkflowSchema,
  ApproveStepSchema,
  RejectStepSchema,
  DelegateStepSchema,
  EscalateStepSchema,
  CreateWorkflowTemplateSchema,
  UpdateWorkflowTemplateSchema,
} from '@apponexthrms/shared';

export class WorkflowController {
  private workflowDefService: WorkflowDefinitionService;
  private executionService: WorkflowExecutionService;
  private approvalService: WorkflowApprovalService;
  private escalationService: WorkflowEscalationService;
  private templateService: WorkflowTemplateService;

  constructor() {
    this.workflowDefService = new WorkflowDefinitionService();
    this.executionService = new WorkflowExecutionService();
    this.approvalService = new WorkflowApprovalService();
    this.escalationService = new WorkflowEscalationService();
    this.templateService = new WorkflowTemplateService();
  }

  // Workflow Definition Endpoints
  async createWorkflow(req: Request, res: Response) {
    const validated = CreateWorkflowSchema.parse(req.body);
    const workflow = await this.workflowDefService.createWorkflow(req.ctx, validated);
    res.status(201).json({ data: workflow });
  }

  async updateWorkflow(req: Request, res: Response) {
    const validated = UpdateWorkflowSchema.parse(req.body);
    const workflow = await this.workflowDefService.updateWorkflow(req.ctx, req.params.id as any, validated);
    res.json({ data: workflow });
  }

  async getWorkflow(req: Request, res: Response) {
    const workflow = await this.workflowDefService.getWorkflow(req.ctx, req.params.id as any);
    res.json({ data: workflow });
  }

  async listWorkflows(req: Request, res: Response) {
    const { page, pageSize, search, type, status } = req.query;
    const result = await this.workflowDefService.listWorkflows(req.ctx, {
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
      search,
      type,
      status,
    });
    res.json({ data: result.items, meta: result.meta });
  }

  async deleteWorkflow(req: Request, res: Response) {
    await this.workflowDefService.archiveWorkflow(req.ctx, req.params.id as any);
    res.status(204).send();
  }

  async publishWorkflow(req: Request, res: Response) {
    const workflow = await this.workflowDefService.publishWorkflow(req.ctx, req.params.id as any);
    res.json({ data: workflow });
  }

  async cloneWorkflow(req: Request, res: Response) {
    const { newName, newCode } = req.body;
    const cloned = await this.workflowDefService.cloneWorkflow(req.ctx, req.params.id as any, newName, newCode);
    res.status(201).json({ data: cloned });
  }

  // Workflow Execution Endpoints
  async startWorkflow(req: Request, res: Response) {
    const validated = StartWorkflowSchema.parse(req.body);
    const instance = await this.executionService.startWorkflow(req.ctx, validated);
    res.status(201).json({ data: instance });
  }

  async getWorkflowInstance(req: Request, res: Response) {
    const instance = await this.executionService.getWorkflowInstance(req.ctx, req.params.instanceId as any);
    res.json({ data: instance });
  }

  async getInstanceHistory(req: Request, res: Response) {
    const { page = 1, pageSize = 50 } = req.query;
    const history = await this.executionService.getInstanceHistory(
      req.ctx,
      req.params.instanceId as any,
      parseInt(page as string),
      parseInt(pageSize as string)
    );
    res.json({ data: history.items, meta: history.meta });
  }

  async cancelWorkflowInstance(req: Request, res: Response) {
    const { reason } = req.body;
    const instance = await this.executionService.cancelInstance(req.ctx, req.params.instanceId as any, reason);
    res.json({ data: instance });
  }

  // Approval Endpoints
  async getPendingApprovals(req: Request, res: Response) {
    const { page = 1, pageSize = 20 } = req.query;
    const approvals = await this.executionService.getPendingSteps(
      req.ctx,
      req.ctx.userId,
      parseInt(page as string),
      parseInt(pageSize as string)
    );
    res.json({ data: approvals.items, meta: approvals.meta });
  }

  async approveStep(req: Request, res: Response) {
    const validated = ApproveStepSchema.parse(req.body);
    const step = await this.approvalService.approveStep(req.ctx, validated.instanceStepId, validated.comment);
    res.json({ data: step });
  }

  async rejectStep(req: Request, res: Response) {
    const validated = RejectStepSchema.parse(req.body);
    const step = await this.approvalService.rejectStep(req.ctx, validated.instanceStepId, validated.reason);
    res.json({ data: step });
  }

  async delegateStep(req: Request, res: Response) {
    const validated = DelegateStepSchema.parse(req.body);
    const delegation = await this.approvalService.delegateStep(
      req.ctx,
      validated.instanceStepId,
      validated.toUserId,
      validated.reason,
      validated.endDate ? new Date(validated.endDate) : undefined
    );
    res.status(201).json({ data: delegation });
  }

  async escalateStep(req: Request, res: Response) {
    const validated = EscalateStepSchema.parse(req.body);
    const escalation = await this.escalationService.escalateStep(
      req.ctx,
      validated.instanceStepId,
      validated.toUserId,
      validated.reason
    );
    res.status(201).json({ data: escalation });
  }

  // Template Endpoints
  async createTemplate(req: Request, res: Response) {
    const validated = CreateWorkflowTemplateSchema.parse(req.body);
    const template = await this.templateService.createTemplate(req.ctx, validated);
    res.status(201).json({ data: template });
  }

  async listTemplates(req: Request, res: Response) {
    const { page = 1, pageSize = 20, category } = req.query;
    let result;
    if (category) {
      result = await this.templateService.listTemplatesByCategory(req.ctx, category as string, parseInt(page as string), parseInt(pageSize as string));
    } else {
      result = await this.templateService.listTemplates(req.ctx, parseInt(page as string), parseInt(pageSize as string));
    }
    res.json({ data: result.items, meta: result.meta });
  }

  async getTemplate(req: Request, res: Response) {
    const template = await this.templateService.getTemplate(req.ctx, req.params.id as any);
    res.json({ data: template });
  }

  async updateTemplate(req: Request, res: Response) {
    const validated = UpdateWorkflowTemplateSchema.parse(req.body);
    const template = await this.templateService.updateTemplate(req.ctx, req.params.id as any, validated);
    res.json({ data: template });
  }

  async deleteTemplate(req: Request, res: Response) {
    await this.templateService.deleteTemplate(req.ctx, req.params.id as any);
    res.status(204).send();
  }

  async createWorkflowFromTemplate(req: Request, res: Response) {
    const validated = CreateWorkflowSchema.parse(req.body);
    const workflow = await this.templateService.createWorkflowFromTemplate(req.ctx, req.params.id as any, validated);
    res.status(201).json({ data: workflow });
  }
}
