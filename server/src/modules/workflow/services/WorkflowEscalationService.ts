import { v4 as uuidv4 } from 'uuid';
import { ValidationError, NotFoundError } from '../../../common/errors/index';
import { WorkflowInstanceStepRepository } from '../repositories/WorkflowInstanceStepRepository';
import { WorkflowEscalationRepository } from '../repositories/WorkflowEscalationRepository';
import { WorkflowHistoryRepository } from '../repositories/WorkflowHistoryRepository';
import { WorkflowInstanceRepository } from '../repositories/WorkflowInstanceRepository';
import type { TenantContext } from '../../../db/types';

export class WorkflowEscalationService {
  private instanceStepRepo: WorkflowInstanceStepRepository;
  private escalationRepo: WorkflowEscalationRepository;
  private historyRepo: WorkflowHistoryRepository;
  private instanceRepo: WorkflowInstanceRepository;

  constructor() {
    this.instanceStepRepo = new WorkflowInstanceStepRepository();
    this.escalationRepo = new WorkflowEscalationRepository();
    this.historyRepo = new WorkflowHistoryRepository();
    this.instanceRepo = new WorkflowInstanceRepository();
  }

  async escalateStep(
    ctx: TenantContext,
    instanceStepId: number,
    toUserId: number,
    reason?: string
  ) {
    const instanceStep = await this.instanceStepRepo.getById(ctx, instanceStepId);
    if (!instanceStep) {
      throw new NotFoundError('Workflow instance step not found');
    }

    if (instanceStep.status !== 'pending') {
      throw new ValidationError('Only pending steps can be escalated');
    }

    // Get latest escalation to determine level
    const latestEscalation = await this.escalationRepo.getLatestEscalation(ctx, instanceStepId);
    const escalationLevel = (latestEscalation?.escalation_level || 0) + 1;

    // Create escalation
    const escalation = await this.escalationRepo.create(ctx, {
      uuid: uuidv4(),
      instance_step_id: instanceStepId,
      escalated_from_user_id: ctx.userId,
      escalated_to_user_id: toUserId,
      escalation_level: escalationLevel,
      escalation_reason: reason,
      escalation_date: new Date(),
      status: 'pending',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Update instance step status to escalated
    await this.instanceStepRepo.update(ctx, instanceStepId, {
      approval_action: 'escalate',
      updated_by: ctx.userId,
    } as any);

    // Log history
    await this.historyRepo.appendHistory(ctx, {
      uuid: uuidv4(),
      instance_id: instanceStep.instance_id,
      action: 'escalated',
      actor_id: ctx.userId,
      comments: reason || `Escalated to level ${escalationLevel}`,
    } as any);

    return escalation;
  }

  async resolveEscalation(ctx: TenantContext, escalationId: number) {
    const escalation = await this.escalationRepo.getById(ctx, escalationId);
    if (!escalation) {
      throw new NotFoundError('Escalation not found');
    }

    const resolved = await this.escalationRepo.update(ctx, escalationId, {
      status: 'resolved',
      updated_by: ctx.userId,
    } as any);

    return resolved;
  }

  async getEscalationStatus(ctx: TenantContext, instanceId: number) {
    const instance = await this.instanceRepo.getById(ctx, instanceId);
    if (!instance) {
      throw new NotFoundError('Workflow instance not found');
    }

    const currentStep = await this.instanceStepRepo.getCurrentStep(ctx, instanceId);
    if (!currentStep) {
      return null;
    }

    return this.escalationRepo.getLatestEscalation(ctx, currentStep.id);
  }

  async checkEscalationRules(ctx: TenantContext, instanceId: number) {
    const instance = await this.instanceRepo.getById(ctx, instanceId);
    if (!instance) {
      throw new NotFoundError('Workflow instance not found');
    }

    const currentStep = await this.instanceStepRepo.getCurrentStep(ctx, instanceId);
    if (!currentStep) {
      return null;
    }

    // Check if step has exceeded SLA
    if (currentStep.assigned_at) {
      const now = new Date();
      const assignedTime = new Date(currentStep.assigned_at);
      const hoursPassed = (now.getTime() - assignedTime.getTime()) / (1000 * 60 * 60);

      // If SLA is set and exceeded, escalation should be triggered
      // This is a basic check; real implementation might differ
      return {
        needsEscalation: currentStep.sla_days !== null && hoursPassed > currentStep.sla_days * 24,
        hoursPassed,
        slaHours: currentStep.sla_days ? currentStep.sla_days * 24 : null,
      };
    }

    return null;
  }

  async getPendingEscalations(ctx: TenantContext) {
    return this.escalationRepo.listPendingEscalations(ctx);
  }
}
