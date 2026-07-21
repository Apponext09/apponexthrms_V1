import { v4 as uuidv4 } from 'uuid';
import { SalaryRevisionRepository } from '../repositories/SalaryRevisionRepository';
import { SalaryRevisionComponentRepository } from '../repositories/SalaryRevisionComponentRepository';
import { WorkflowExecutionService } from '../../workflow/services/WorkflowExecutionService';
import { NotificationService } from '../../notifications/services/notification.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

interface RequestRevisionInput {
  employeeId: number;
  revisionType: 'increment' | 'promotion' | 'compensation_change' | 'adjustment';
  newCTC: number;
  effectiveFrom: string;
  incrementPercentage?: number;
  incrementAmount?: number;
  reason?: string;
  components?: { componentId: number; oldValue: number; newValue: number }[];
}

export class SalaryRevisionService {
  private revisionRepo: SalaryRevisionRepository;
  private revisionComponentRepo: SalaryRevisionComponentRepository;
  private WorkflowExecutionService: WorkflowExecutionService;
  private notificationService: NotificationService;
  private auditService: AuditService;

  constructor() {
    this.revisionRepo = new SalaryRevisionRepository();
    this.revisionComponentRepo = new SalaryRevisionComponentRepository();
    this.WorkflowExecutionService = new WorkflowExecutionService();
    this.notificationService = new NotificationService();
    this.auditService = new AuditService();
  }

  async requestRevision(ctx: TenantContext, input: RequestRevisionInput) {
    if (input.newCTC <= 0) {
      throw new ValidationError('New CTC must be greater than 0');
    }

    const revision = await this.revisionRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: input.employeeId,
      revision_type: input.revisionType,
      effective_from: input.effectiveFrom,
      old_ctc: 0, // Will be updated on submit
      new_ctc: input.newCTC,
      increment_percentage: input.incrementPercentage,
      increment_amount: input.incrementAmount,
      reason_description: input.reason,
      status: 'draft',
      created_by: ctx.userId,
      updated_by: ctx.userId
    });

    // Add component details if provided
    if (input.components) {
      for (const comp of input.components) {
        await this.revisionComponentRepo.create(ctx, {
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          revision_id: revision.id,
          component_id: comp.componentId,
          old_value: comp.oldValue,
          new_value: comp.newValue
        });
      }
    }

    await this.auditService.log(ctx, 'salary_revisions', revision.id, 'create', { revision });

    return revision;
  }

  async submitForApproval(ctx: TenantContext, revisionId: number) {
    const revision = await this.revisionRepo.getById(ctx, revisionId);
    if (!revision) throw new NotFoundError('Salary revision not found');

    if (revision.status !== 'draft') {
      throw new ValidationError('Only draft revisions can be submitted');
    }

    const updated = await this.revisionRepo.update(ctx, revisionId, {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_by: ctx.userId
    });

    // Create workflow instance
    const workflowInstance = await this.WorkflowExecutionService.createInstance(ctx, {
      workflow_type: 'salary_revision',
      reference_type: 'salary_revisions',
      reference_id: revisionId,
      description: `Salary revision for employee ${revision.employee_id}`,
      priority: 'high'
    });

    await this.revisionRepo.update(ctx, revisionId, {
      workflow_instance_id: workflowInstance.id,
      updated_by: ctx.userId
    });

    // Notify managers/approvers
    await this.notificationService.send(ctx, {
      type: 'salary_revision_submitted',
      recipient_type: 'role',
      recipient_id: 'finance_manager',
      title: 'Salary Revision Approval Required',
      message: `Salary revision submitted for employee ${revision.employee_id}`,
      action_url: `/payroll/revisions/${revisionId}`
    });

    return updated;
  }

  async approveRevision(ctx: TenantContext, revisionId: number, approverId: number) {
    const revision = await this.revisionRepo.getById(ctx, revisionId);
    if (!revision) throw new NotFoundError('Salary revision not found');

    if (revision.status !== 'submitted') {
      throw new ValidationError('Only submitted revisions can be approved');
    }

    const updated = await this.revisionRepo.update(ctx, revisionId, {
      status: 'approved',
      approved_by: approverId,
      approval_date: new Date().toISOString(),
      updated_by: ctx.userId
    });

    // Mark workflow as completed
    if (revision.workflow_instance_id) {
      await this.WorkflowExecutionService.completeInstance(ctx, revision.workflow_instance_id, 'approved');
    }

    // Notify employee
    await this.notificationService.send(ctx, {
      type: 'salary_revision_approved',
      recipient_type: 'employee',
      recipient_id: revision.employee_id.toString(),
      title: 'Salary Revision Approved',
      message: `Your salary revision has been approved. New CTC: ${revision.new_ctc}`,
      action_url: `/payroll/revisions/${revisionId}`
    });

    await this.auditService.log(ctx, 'salary_revisions', revisionId, 'approve', { approved_by: approverId });

    return updated;
  }

  async rejectRevision(ctx: TenantContext, revisionId: number, reason?: string) {
    const revision = await this.revisionRepo.getById(ctx, revisionId);
    if (!revision) throw new NotFoundError('Salary revision not found');

    const updated = await this.revisionRepo.update(ctx, revisionId, {
      status: 'rejected',
      updated_by: ctx.userId
    });

    // Mark workflow as rejected
    if (revision.workflow_instance_id) {
      await this.WorkflowExecutionService.completeInstance(ctx, revision.workflow_instance_id, 'rejected');
    }

    // Notify employee
    await this.notificationService.send(ctx, {
      type: 'salary_revision_rejected',
      recipient_type: 'employee',
      recipient_id: revision.employee_id.toString(),
      title: 'Salary Revision Rejected',
      message: reason || 'Your salary revision has been rejected',
      action_url: `/payroll/revisions/${revisionId}`
    });

    await this.auditService.log(ctx, 'salary_revisions', revisionId, 'reject', { reason });

    return updated;
  }

  async getRevision(ctx: TenantContext, revisionId: number) {
    return this.revisionRepo.getById(ctx, revisionId);
  }

  async getRevisionComponents(ctx: TenantContext, revisionId: number) {
    return this.revisionComponentRepo.getForRevision(ctx, revisionId);
  }
}



