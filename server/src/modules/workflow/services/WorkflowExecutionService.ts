import { v4 as uuidv4 } from 'uuid';
import { ValidationError, NotFoundError } from '../../../common/errors/index';
import { WorkflowRepository } from '../repositories/WorkflowRepository';
import { WorkflowInstanceRepository } from '../repositories/WorkflowInstanceRepository';
import { WorkflowInstanceStepRepository } from '../repositories/WorkflowInstanceStepRepository';
import { WorkflowStepRepository } from '../repositories/WorkflowStepRepository';
import { WorkflowHistoryRepository } from '../repositories/WorkflowHistoryRepository';
import type { TenantContext } from '../../../db/types';
import type { StartWorkflowInput } from '@apponexthrms/shared';

export class WorkflowExecutionService {
  private workflowRepo: WorkflowRepository;
  private instanceRepo: WorkflowInstanceRepository;
  private instanceStepRepo: WorkflowInstanceStepRepository;
  private stepRepo: WorkflowStepRepository;
  private historyRepo: WorkflowHistoryRepository;

  constructor() {
    this.workflowRepo = new WorkflowRepository();
    this.instanceRepo = new WorkflowInstanceRepository();
    this.instanceStepRepo = new WorkflowInstanceStepRepository();
    this.stepRepo = new WorkflowStepRepository();
    this.historyRepo = new WorkflowHistoryRepository();
  }

  async startWorkflow(ctx: TenantContext, input: StartWorkflowInput) {
    if (['expense_claim', 'travel_request', 'travel_advance', 'mileage_claim'].includes(input.entityType)) {
      throw new ValidationError('Submit expense requests through the Expense module so assignment and claim status stay atomic');
    }
    // Get workflow by code
    const workflow = await this.workflowRepo.getByCode(ctx, input.workflowCode);
    if (!workflow) {
      throw new NotFoundError(`Workflow with code '${input.workflowCode}' not found`);
    }

    if (!workflow.is_published || workflow.status !== 'published') {
      throw new ValidationError('Workflow must be published before starting');
    }

    // Check if instance already exists
    const existing = await this.instanceRepo.getByEntity(
      ctx,
      input.entityType,
      input.entityId
    );
    if (existing && existing.status === 'pending') {
      throw new ValidationError('A pending workflow instance already exists for this entity');
    }

    // Create workflow instance
    const instance = await this.instanceRepo.create(ctx, {
      uuid: uuidv4(),
      workflow_id: workflow.id,
      entity_type: input.entityType,
      entity_id: input.entityId,
      initiator_id: ctx.userId,
      status: 'pending',
      current_step_number: 1,
      approval_count: 0,
      rejection_count: 0,
      started_at: new Date(),
      metadata: input.metadata,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Get first step and create instance step
    const firstStep = await this.stepRepo.getByStepNumber(ctx, workflow.id, 1);
    if (!firstStep) {
      throw new ValidationError('Workflow has no steps');
    }

    await this.instanceStepRepo.create(ctx, {
      uuid: uuidv4(),
      instance_id: instance.id,
      step_id: firstStep.id,
      step_number: 1,
      status: 'pending',
      approver_id: firstStep.approver_id,
      assigned_at: new Date(),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Log history
    await this.historyRepo.appendHistory(ctx, {
      uuid: uuidv4(),
      instance_id: instance.id,
      action: 'created',
      actor_id: ctx.userId,
      comments: `Workflow instance started for ${input.entityType}`,
    } as any);

    return instance;
  }

  async getWorkflowInstance(ctx: TenantContext, instanceId: number) {
    return this.instanceRepo.getById(ctx, instanceId);
  }

  async getCurrentStep(ctx: TenantContext, instanceId: number) {
    const instance = await this.instanceRepo.getById(ctx, instanceId);
    if (!instance) {
      throw new NotFoundError('Workflow instance not found');
    }

    return this.instanceStepRepo.getCurrentStep(ctx, instanceId);
  }

  async getPendingSteps(ctx: TenantContext, userId: number, page = 1, pageSize = 20) {
    return this.instanceStepRepo.getPendingApprovals(ctx, userId, page, pageSize);
  }

  async getInstanceHistory(ctx: TenantContext, instanceId: number, page = 1, pageSize = 50) {
    return this.historyRepo.listByInstance(ctx, instanceId, page, pageSize);
  }

  async cancelInstance(ctx: TenantContext, instanceId: number, reason?: string) {
    const instance = await this.instanceRepo.getById(ctx, instanceId);
    if (!instance) {
      throw new NotFoundError('Workflow instance not found');
    }

    const cancelled = await this.instanceRepo.update(ctx, instanceId, {
      status: 'cancelled',
      completed_at: new Date(),
      completion_status: 'cancelled',
      updated_by: ctx.userId,
    } as any);

    // Log history
    await this.historyRepo.appendHistory(ctx, {
      uuid: uuidv4(),
      instance_id: instanceId,
      action: 'cancelled',
      actor_id: ctx.userId,
      comments: reason || 'Workflow cancelled',
    } as any);

    return cancelled;
  }

  async completeInstance(ctx: TenantContext, instanceId: number, status: 'approved' | 'rejected', reason?: string) {
    const instance = await this.instanceRepo.getById(ctx, instanceId);
    if (!instance) {
      throw new NotFoundError('Workflow instance not found');
    }

    const completed = await this.instanceRepo.update(ctx, instanceId, {
      status: status === 'approved' ? 'approved' : 'rejected',
      completed_at: new Date(),
      completion_status: status,
      updated_by: ctx.userId,
    } as any);

    // Log history
    await this.historyRepo.appendHistory(ctx, {
      uuid: uuidv4(),
      instance_id: instanceId,
      action: status,
      actor_id: ctx.userId,
      comments: reason || `Workflow completed with status: ${status}`,
    } as any);

    return completed;
  }
}
