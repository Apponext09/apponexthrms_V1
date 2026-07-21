import { v4 as uuidv4 } from 'uuid';
import { ValidationError, NotFoundError, ConflictError } from '../../../common/errors/index';
import { WorkflowRepository } from '../repositories/WorkflowRepository';
import { WorkflowVersionRepository } from '../repositories/WorkflowVersionRepository';
import { WorkflowStepRepository } from '../repositories/WorkflowStepRepository';
import type { TenantContext } from '../../../db/types';
import type { CreateWorkflowInput, UpdateWorkflowInput } from '@apponexthrms/shared';

export class WorkflowDefinitionService {
  private workflowRepo: WorkflowRepository;
  private versionRepo: WorkflowVersionRepository;
  private stepRepo: WorkflowStepRepository;

  constructor() {
    this.workflowRepo = new WorkflowRepository();
    this.versionRepo = new WorkflowVersionRepository();
    this.stepRepo = new WorkflowStepRepository();
  }

  async createWorkflow(ctx: TenantContext, input: CreateWorkflowInput) {
    // Check if workflow code already exists
    const existing = await this.workflowRepo.getByCode(ctx, input.workflow_code);
    if (existing) {
      throw new ConflictError(`Workflow with code '${input.workflow_code}' already exists`);
    }

    // Create workflow
    const workflow = await this.workflowRepo.create(ctx, {
      uuid: uuidv4(),
      workflow_code: input.workflow_code,
      workflow_name: input.workflow_name,
      description: input.description,
      type: input.type,
      status: 'draft',
      approval_pattern: input.approval_pattern || 'sequential',
      max_escalation_levels: input.max_escalation_levels || 3,
      sla_days: input.sla_days,
      notify_on_completion: input.notify_on_completion !== false,
      auto_approve_after_days: input.auto_approve_after_days,
      auto_reject_after_days: input.auto_reject_after_days,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Create initial draft version
    await this.versionRepo.create(ctx, {
      uuid: uuidv4(),
      workflow_id: workflow.id,
      version_number: 1,
      status: 'draft',
      description: 'Initial draft',
      created_by: ctx.userId,
    } as any);

    return workflow;
  }

  async updateWorkflow(ctx: TenantContext, id: number, input: UpdateWorkflowInput) {
    const workflow = await this.workflowRepo.getById(ctx, id);
    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    if (workflow.status === 'published') {
      throw new ValidationError('Cannot update published workflow');
    }

    const updated = await this.workflowRepo.update(ctx, id, {
      ...input,
      updated_by: ctx.userId,
    } as any);

    return updated;
  }

  async publishWorkflow(ctx: TenantContext, id: number) {
    const workflow = await this.workflowRepo.getById(ctx, id);
    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    if (workflow.status === 'archived') {
      throw new ValidationError('Cannot publish archived workflow');
    }

    // Verify workflow has at least one step
    const steps = await this.stepRepo.getAllSteps(ctx, workflow.id);
    if (steps.length === 0) {
      throw new ValidationError('Workflow must have at least one step before publishing');
    }

    // Create new version
    const latestVersion = await this.versionRepo.getLatestVersion(ctx, workflow.id);
    const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

    await this.versionRepo.create(ctx, {
      uuid: uuidv4(),
      workflow_id: workflow.id,
      version_number: nextVersionNumber,
      status: 'published',
      created_by: ctx.userId,
      published_by: ctx.userId,
      published_at: new Date(),
    } as any);

    // Update workflow as published
    const published = await this.workflowRepo.update(ctx, id, {
      status: 'published',
      is_published: true,
      version_number: nextVersionNumber,
      published_by: ctx.userId,
      published_at: new Date(),
      updated_by: ctx.userId,
    } as any);

    return published;
  }

  async archiveWorkflow(ctx: TenantContext, id: number) {
    const workflow = await this.workflowRepo.getById(ctx, id);
    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    const archived = await this.workflowRepo.update(ctx, id, {
      status: 'archived',
      updated_by: ctx.userId,
    } as any);

    return archived;
  }

  async cloneWorkflow(ctx: TenantContext, id: number, newName: string, newCode: string) {
    const workflow = await this.workflowRepo.getById(ctx, id);
    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    // Check if new code already exists
    const existing = await this.workflowRepo.getByCode(ctx, newCode);
    if (existing) {
      throw new ConflictError(`Workflow with code '${newCode}' already exists`);
    }

    // Create cloned workflow
    const cloned = await this.workflowRepo.create(ctx, {
      uuid: uuidv4(),
      workflow_code: newCode,
      workflow_name: newName,
      description: workflow.description,
      type: workflow.type,
      status: 'draft',
      approval_pattern: workflow.approval_pattern,
      max_escalation_levels: workflow.max_escalation_levels,
      sla_days: workflow.sla_days,
      notify_on_completion: workflow.notify_on_completion,
      auto_approve_after_days: workflow.auto_approve_after_days,
      auto_reject_after_days: workflow.auto_reject_after_days,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Clone all steps
    const steps = await this.stepRepo.getAllSteps(ctx, workflow.id);
    for (const step of steps) {
      await this.stepRepo.create(ctx, {
        uuid: uuidv4(),
        workflow_id: cloned.id,
        step_number: step.step_number,
        step_name: step.step_name,
        step_description: step.step_description,
        approval_mode: step.approval_mode,
        approver_type: step.approver_type,
        approver_id: step.approver_id,
        approver_role_id: step.approver_role_id,
        max_approvers: step.max_approvers,
        can_delegate: step.can_delegate,
        can_reject: step.can_reject,
        can_reassign: step.can_reassign,
        timeout_days: step.timeout_days,
        sla_days: step.sla_days,
        is_final_step: step.is_final_step,
        action_on_approval: step.action_on_approval,
        action_on_rejection: step.action_on_rejection,
        notes: step.notes,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as any);
    }

    return cloned;
  }

  async getWorkflow(ctx: TenantContext, id: number) {
    return this.workflowRepo.getById(ctx, id);
  }

  async listWorkflows(ctx: TenantContext, options: any = {}) {
    const { page = 1, pageSize = 20, search, type, status } = options;
    return this.workflowRepo.list(ctx, {
      page,
      pageSize,
      search,
      filters: {
        ...(type && { type }),
        ...(status && { status }),
      },
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }
}
