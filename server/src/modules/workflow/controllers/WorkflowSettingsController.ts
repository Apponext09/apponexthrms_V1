import type { Request, Response } from 'express';
import { WorkflowSettingsService } from '../services/WorkflowSettingsService';

export class WorkflowSettingsController {
  private service: WorkflowSettingsService;

  constructor() {
    this.service = new WorkflowSettingsService();
  }

  // --- Workflow Settings CRUD ------------------------------------------------

  async listSettings(req: Request, res: Response) {
    const { type, search, page, pageSize } = req.query;
    const result = await this.service.listWorkflowSettings(req.ctx, {
      type: type as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  }

  async createSetting(req: Request, res: Response) {
    const { workflowName, workflowType, approvalType, isActive, applicabilityFilters } = req.body;
    const workflow = await this.service.createWorkflowSetting(req.ctx, {
      workflowName,
      workflowType,
      approvalType: approvalType || 'manual',
      isActive: isActive !== false,
      applicabilityFilters,
    });
    res.status(201).json({ success: true, data: workflow });
  }

  async getSetting(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const workflow = await this.service.getWorkflowSetting(req.ctx, id);
    res.json({ success: true, data: workflow });
  }

  async updateSetting(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const { workflowName, workflowType, approvalType, isActive, applicabilityFilters } = req.body;
    const workflow = await this.service.updateWorkflowSetting(req.ctx, id, {
      workflowName,
      workflowType,
      approvalType,
      isActive,
      applicabilityFilters,
    });
    res.json({ success: true, data: workflow });
  }

  async deleteSetting(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    await this.service.deleteWorkflowSetting(req.ctx, id);
    res.json({ success: true, message: 'Workflow deleted successfully' });
  }

  // --- Step CRUD -------------------------------------------------------------

  async getSteps(req: Request, res: Response) {
    const workflowId = parseInt(req.params.workflowId);
    const steps = await this.service.getWorkflowSteps(req.ctx, workflowId);
    res.json({ success: true, data: steps });
  }

  async addStep(req: Request, res: Response) {
    const workflowId = parseInt(req.params.workflowId);
    const { stepType, stepName, approverId, approverRoleId, approverDepartmentId, stepNumber } = req.body;
    const step = await this.service.addStep(req.ctx, {
      workflowId,
      stepNumber,
      stepType,
      stepName,
      approverId,
      approverRoleId,
      approverDepartmentId,
    });
    res.status(201).json({ success: true, data: step });
  }

  async updateStep(req: Request, res: Response) {
    const stepId = parseInt(req.params.stepId);
    const { workflowId, stepType, stepName, approverId, approverRoleId, approverDepartmentId, formPermissions, escalationConfig, notificationConfig } = req.body;
    const step = await this.service.updateStep(req.ctx, stepId, {
      workflowId,
      stepType,
      stepName,
      approverId,
      approverRoleId,
      approverDepartmentId,
      formPermissions,
      escalationConfig,
      notificationConfig,
    });
    res.json({ success: true, data: step });
  }

  async deleteStep(req: Request, res: Response) {
    const stepId = parseInt(req.params.stepId);
    const workflowId = parseInt(req.params.workflowId);
    await this.service.deleteStep(req.ctx, stepId, workflowId);
    res.json({ success: true, message: 'Step deleted' });
  }

  async reorderSteps(req: Request, res: Response) {
    const workflowId = parseInt(req.params.workflowId);
    const { stepIds } = req.body;
    const steps = await this.service.reorderSteps(req.ctx, workflowId, stepIds);
    res.json({ success: true, data: steps });
  }

  // --- Recipient Lookup ------------------------------------------------------

  async getRecipientOptions(req: Request, res: Response) {
    const { query } = req.query;
    const options = await this.service.getRecipientOptions(req.ctx, query as string | undefined);
    res.json({ success: true, data: options });
  }

  async getApplicabilityOptions(req: Request, res: Response) {
    const options = await this.service.getApplicabilityOptions(req.ctx);
    res.json({ success: true, data: options });
  }
}
