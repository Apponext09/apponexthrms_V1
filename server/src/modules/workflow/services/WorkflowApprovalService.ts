import { v4 as uuidv4 } from 'uuid';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../../common/errors/index';
import { WorkflowInstanceRepository } from '../repositories/WorkflowInstanceRepository';
import { WorkflowInstanceStepRepository } from '../repositories/WorkflowInstanceStepRepository';
import { WorkflowStepRepository } from '../repositories/WorkflowStepRepository';
import { WorkflowDelegationRepository } from '../repositories/WorkflowDelegationRepository';
import { WorkflowHistoryRepository } from '../repositories/WorkflowHistoryRepository';
import type { TenantContext } from '../../../db/types';
import { RegularizationService } from '../../attendance/services/RegularizationService';
import { WorkflowExecutionService } from './WorkflowExecutionService';

export class WorkflowApprovalService {
  private instanceRepo: WorkflowInstanceRepository;
  private instanceStepRepo: WorkflowInstanceStepRepository;
  private stepRepo: WorkflowStepRepository;
  private delegationRepo: WorkflowDelegationRepository;
  private historyRepo: WorkflowHistoryRepository;

  constructor() {
    this.instanceRepo = new WorkflowInstanceRepository();
    this.instanceStepRepo = new WorkflowInstanceStepRepository();
    this.stepRepo = new WorkflowStepRepository();
    this.delegationRepo = new WorkflowDelegationRepository();
    this.historyRepo = new WorkflowHistoryRepository();
  }

  async approveStep(
    ctx: TenantContext,
    instanceStepId: number,
    comment?: string
  ) {
    const instanceStep = await this.instanceStepRepo.getById(ctx, instanceStepId);
    if (!instanceStep) {
      throw new NotFoundError('Workflow instance step not found');
    }

    if (instanceStep.status !== 'pending') {
      throw new ValidationError('Step is not pending');
    }

    // Verify current user is the approver (or delegated to)
    const delegation = await this.delegationRepo.getActiveByInstanceStep(ctx, instanceStepId);
    const approverId = delegation ? delegation.delegated_to_user_id : instanceStep.approver_id;

    if (approverId !== ctx.userId) {
      throw new UnauthorizedError('You are not authorized to approve this step');
    }

    // Update instance step
    const updated = await this.instanceStepRepo.update(ctx, instanceStepId, {
      status: 'approved',
      approval_action: 'approve',
      approval_comment: comment,
      completed_at: new Date(),
      updated_by: ctx.userId,
    } as any);

    // Update instance
    const instance = await this.instanceRepo.getById(ctx, instanceStep.instance_id);
    if (instance) {
      const approval_count = (instance.approval_count || 0) + 1;

      // Check if this is the final step
      const step = await this.stepRepo.getById(ctx, instanceStep.step_id);
      if (step?.is_final_step) {
        // Workflow is approved
        await this.instanceRepo.update(ctx, instance.id, {
          status: 'approved',
          completion_status: 'approved',
          completed_at: new Date(),
          approval_count,
          updated_by: ctx.userId,
        } as any);
        if (instance.entity_type === 'attendance_regularization') {
          await new RegularizationService().completeConfiguredWorkflow(ctx, instance.entity_id, 'approved', comment);
        }
      } else {
        // Move to next step
        const nextStep = await this.stepRepo.getNextStep(ctx, step?.workflow_id!, step!.step_number);
        if (nextStep) {
          const nextApproverId = await new WorkflowExecutionService().resolveApproverId(ctx, nextStep, (instance.metadata || {}) as any);
          if (!nextApproverId) throw new ValidationError('No active approver could be resolved for the next workflow step');
          await this.instanceRepo.update(ctx, instance.id, {
            current_step_number: nextStep.step_number,
            approval_count,
            updated_by: ctx.userId,
          } as any);

          // Create next instance step
          await this.instanceStepRepo.create(ctx, {
            uuid: uuidv4(),
            instance_id: instance.id,
            step_id: nextStep.id,
            step_number: nextStep.step_number,
            status: 'pending',
            approver_id: nextApproverId,
            assigned_at: new Date(),
            created_by: ctx.userId,
            updated_by: ctx.userId,
          } as any);
        }
      }
    }

    // Log history
    await this.historyRepo.appendHistory(ctx, {
      uuid: uuidv4(),
      instance_id: instanceStep.instance_id,
      action: 'approved',
      actor_id: ctx.userId,
      comments: comment,
    } as any);

    return updated;
  }

  async rejectStep(
    ctx: TenantContext,
    instanceStepId: number,
    reason: string
  ) {
    const instanceStep = await this.instanceStepRepo.getById(ctx, instanceStepId);
    if (!instanceStep) {
      throw new NotFoundError('Workflow instance step not found');
    }

    if (instanceStep.status !== 'pending') {
      throw new ValidationError('Step is not pending');
    }

    // Verify current user is the approver
    if (instanceStep.approver_id !== ctx.userId) {
      throw new UnauthorizedError('You are not authorized to reject this step');
    }

    // Update instance step
    await this.instanceStepRepo.update(ctx, instanceStepId, {
      status: 'rejected',
      approval_action: 'reject',
      approval_comment: reason,
      completed_at: new Date(),
      updated_by: ctx.userId,
    } as any);

    // Update instance as rejected
    const instance = await this.instanceRepo.getById(ctx, instanceStep.instance_id);
    if (instance) {
      const rejection_count = (instance.rejection_count || 0) + 1;
      await this.instanceRepo.update(ctx, instance.id, {
        status: 'rejected',
        completion_status: 'rejected',
        completed_at: new Date(),
        rejection_count,
        updated_by: ctx.userId,
      } as any);
      if (instance.entity_type === 'attendance_regularization') {
        await new RegularizationService().completeConfiguredWorkflow(ctx, instance.entity_id, 'rejected', reason);
      }
    }

    // Log history
    await this.historyRepo.appendHistory(ctx, {
      uuid: uuidv4(),
      instance_id: instanceStep.instance_id,
      action: 'rejected',
      actor_id: ctx.userId,
      comments: reason,
    } as any);

    return instanceStep;
  }

  async delegateStep(
    ctx: TenantContext,
    instanceStepId: number,
    toUserId: number,
    reason?: string,
    endDate?: Date
  ) {
    const instanceStep = await this.instanceStepRepo.getById(ctx, instanceStepId);
    if (!instanceStep) {
      throw new NotFoundError('Workflow instance step not found');
    }

    const step = await this.stepRepo.getById(ctx, instanceStep.step_id);
    if (!step?.can_delegate) {
      throw new ValidationError('This step does not allow delegation');
    }

    if (instanceStep.approver_id !== ctx.userId) {
      throw new UnauthorizedError('You can only delegate your own approvals');
    }

    // Create delegation
    const delegation = await this.delegationRepo.create(ctx, {
      uuid: uuidv4(),
      instance_step_id: instanceStepId,
      delegated_from_user_id: ctx.userId,
      delegated_to_user_id: toUserId,
      delegation_reason: reason,
      delegation_start_date: new Date(),
      delegation_end_date: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      status: 'active',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Log history
    await this.historyRepo.appendHistory(ctx, {
      uuid: uuidv4(),
      instance_id: instanceStep.instance_id,
      action: 'delegated',
      actor_id: ctx.userId,
      comments: reason || `Delegated to user ${toUserId}`,
    } as any);

    return delegation;
  }

  async reassignStep(
    ctx: TenantContext,
    instanceStepId: number,
    newApproverId: number
  ) {
    const instanceStep = await this.instanceStepRepo.getById(ctx, instanceStepId);
    if (!instanceStep) {
      throw new NotFoundError('Workflow instance step not found');
    }

    const step = await this.stepRepo.getById(ctx, instanceStep.step_id);
    if (!step?.can_reassign) {
      throw new ValidationError('This step does not allow reassignment');
    }

    const updated = await this.instanceStepRepo.update(ctx, instanceStepId, {
      approver_id: newApproverId,
      assigned_at: new Date(),
      updated_by: ctx.userId,
    } as any);

    // Log history
    await this.historyRepo.appendHistory(ctx, {
      uuid: uuidv4(),
      instance_id: instanceStep.instance_id,
      action: 'reassigned',
      actor_id: ctx.userId,
      comments: `Reassigned to user ${newApproverId}`,
    } as any);

    return updated;
  }
}
