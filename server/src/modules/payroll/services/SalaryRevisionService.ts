import { v4 as uuidv4 } from 'uuid';
import { SalaryRevisionRepository } from '../repositories/SalaryRevisionRepository';
import { SalaryRevisionComponentRepository } from '../repositories/SalaryRevisionComponentRepository';
import { WorkflowExecutionService } from '../../workflow/services/WorkflowExecutionService';
import { NotificationService } from '../../notifications/services/notification.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import { getKnex } from '../../../db/knex';
import { PayrollFormulaEvaluator } from '../utils/PayrollFormulaEvaluator';

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

    // 🔧 FIX: Auto-fetch the employee's current CTC from their active salary structure.
    // Previously always written as 0, making revision history meaningless.
    const db = getKnex();
    let currentCTC = 0;
    try {
      const currentStruct = await db('employee_salary_structures as ess')
        .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
        .where('ess.employee_id', input.employeeId)
        .where('ess.is_current', true)
        .whereNull('ess.deleted_at')
        .select('ss.annual_ctc')
        .first()
        .catch(() => null)
        || await db('salary_structures')
          .where('employee_id', input.employeeId)
          .whereNull('deleted_at')
          .orderBy('id', 'desc')
          .select('annual_ctc')
          .first()
          .catch(() => null);

      if (currentStruct && Number(currentStruct.annual_ctc) > 0) {
        currentCTC = Number(currentStruct.annual_ctc);
      }
    } catch {
      currentCTC = 0;
    }

    const revision = await this.revisionRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: input.employeeId,
      revision_type: input.revisionType,
      effective_from: input.effectiveFrom,
      old_ctc: currentCTC, // 🔧 Now populated from active salary structure
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

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'SALARY_REVISION',
      entityId: revision.id,
      afterState: { revision }
    });

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
    const workflowInstance = await this.WorkflowExecutionService.startWorkflow(ctx, {
      workflowCode: 'salary_revision',
      entityType: 'salary_revisions',
      entityId: revisionId,
      metadata: { priority: 'high' }
    });

    await this.revisionRepo.update(ctx, revisionId, {
      workflow_instance_id: workflowInstance.id,
      updated_by: ctx.userId
    });

    // Notify managers/approvers
    try {
      const db = getKnex();
      const emp = await db('employees').where('id', revision.employee_id).first().catch(() => null);
      const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : `Employee #${revision.employee_id}`;

      const adminUsers = await db('users as u')
        .leftJoin('user_roles as ur', 'u.id', 'ur.user_id')
        .leftJoin('roles as r', 'ur.role_id', 'r.id')
        .where('u.organization_id', ctx.organizationId)
        .where(function () {
          this.whereIn('r.code', ['organization_admin', 'super_admin', 'finance_manager'])
            .orWhere('u.email', 'ajay@gmail.com');
        })
        .whereNull('u.deleted_at')
        .select('u.id')
        .distinct();

      for (const admin of adminUsers) {
        if (admin.id) {
          await db('notifications').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            event_code: 'SALARY_REVISION_SUBMITTED',
            recipient_id: admin.id,
            channels: JSON.stringify(['inapp', 'email']),
            subject_line: `New Salary Revision Request for ${empName}`,
            body_text: `HR submitted a salary revision request for ${empName} (New CTC: ₹${Number(revision.new_ctc).toLocaleString('en-IN')}). Please review and approve.`,
            variables: JSON.stringify({ employee_name: empName, new_ctc: revision.new_ctc, revision_id: revisionId }),
            status: 'sent',
            priority: 'high',
            created_by: ctx.userId,
            updated_by: ctx.userId,
            created_at: new Date(),
            updated_at: new Date()
          }).catch(() => { });
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify admins in SalaryRevisionService:', notifErr);
    }

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

    // ✅ Direct DB update — no circular require() needed
    if (revision.employee_id && Number(revision.new_ctc) > 0) {
      try {
        const db = getKnex();
        const newGrossMonthly = Math.round(Number(revision.new_ctc) / 12);

        // Fetch employee's current slab & active components
        const currentStruct = await db('salary_structures')
          .where('employee_id', revision.employee_id)
          .whereNull('deleted_at')
          .orderBy('effective_from', 'desc')
          .first();

        let slabComps: any[] = [];
        if (currentStruct?.slab_id) {
          const slabRow = await db('payroll_slabs').where('id', currentStruct.slab_id).first();
          let compIds: number[] = [];
          try {
            const raw = slabRow?.selected_component_ids;
            compIds = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
          } catch {}
          if (compIds.length > 0) {
            slabComps = await db('payroll_components').whereIn('id', compIds).where('is_active', true);
          }
        }
        if (slabComps.length === 0) {
          slabComps = await db('payroll_components').where('is_active', true);
        }

        const formulaCtx: any = {
          ctc: newGrossMonthly,
          monthly_ctc: newGrossMonthly,
          annual_ctc: Number(revision.new_ctc),
          gross: newGrossMonthly,
          gross_salary: newGrossMonthly,
          basic: Math.round(newGrossMonthly * 0.5),
        };

        let newBasicMonthly = 0;
        let newHraMonthly = 0;
        let newPfDeduction = 0;
        let newPtDeduction = 0;
        let newEsiDeduction = 0;
        let totalDeductions = 0;

        for (const comp of slabComps) {
          const compNameLower = (comp.name || '').toLowerCase();
          const compType = comp.component_type || comp.type || 'Value';
          const formula = comp.formula || '';

          let amt = 0;
          if (compType === 'Value') amt = Number(comp.amount || 0);
          else if (formula) amt = PayrollFormulaEvaluator.evaluate(formula, formulaCtx);
          else amt = Number(comp.amount || 0);

          if (compNameLower.includes('basic')) {
            newBasicMonthly = amt || Math.round(newGrossMonthly * 0.5);
            formulaCtx.basic = newBasicMonthly;
          } else if (compNameLower.includes('hra') || compNameLower.includes('house rent')) {
            newHraMonthly = amt;
            formulaCtx.hra = newHraMonthly;
          } else if (compNameLower.includes('provident') || compNameLower.includes('pf')) {
            newPfDeduction = amt;
            totalDeductions += amt;
          } else if (compNameLower.includes('professional') || compNameLower.includes('pt')) {
            newPtDeduction = amt;
            totalDeductions += amt;
          } else if (compNameLower.includes('esic') || compNameLower.includes('esi')) {
            newEsiDeduction = amt;
            totalDeductions += amt;
          }
        }

        if (!newBasicMonthly) newBasicMonthly = Math.round(newGrossMonthly * 0.5);
        if (!newHraMonthly) newHraMonthly = Math.round(newBasicMonthly * 0.4);
        const newSpecialAllowance = Math.max(0, newGrossMonthly - (newBasicMonthly + newHraMonthly));
        const newNetTakeHome = Math.max(0, newGrossMonthly - totalDeductions);

        // Update active salary structure
        await db('salary_structures')
          .where('employee_id', revision.employee_id)
          .whereNull('deleted_at')
          .update({
            gross_monthly:             newGrossMonthly,
            basic_monthly:             newBasicMonthly,
            hra_monthly:               newHraMonthly,
            special_allowance_monthly: newSpecialAllowance,
            annual_ctc:                revision.new_ctc,
            pf_deduction:              newPfDeduction,
            pf_employer:               newPfDeduction,
            pt_deduction:              newPtDeduction,
            esi_deduction:             newEsiDeduction,
            total_deductions:          totalDeductions,
            net_take_home:             newNetTakeHome,
            effective_from:            revision.effective_from || new Date().toISOString().slice(0, 10),
            updated_at:                new Date()
          })
          .catch(() => {});

        // Update employee record
        await db('employees')
          .where('id', revision.employee_id)
          .update({
            annual_ctc:   revision.new_ctc,
            gross_salary: newGrossMonthly,
            updated_at:   new Date()
          })
          .catch(() => {});
      } catch (err) {
        // Non-fatal — revision status is already saved above
      }
    }

    // Mark workflow as completed
    if (revision.workflow_instance_id) {
      await this.WorkflowExecutionService.completeInstance(ctx, revision.workflow_instance_id, 'approved');
    }

    // Notify employee
    await this.notificationService.sendNotification(ctx, {
      eventCode: 'salary_revision_approved',
      recipientId: revision.employee_id,
      variables: { revisionId: String(revisionId), newCtc: String(revision.new_ctc) }
    } as any);

    await this.auditService.log(ctx, {
      action: 'APPROVE',
      entityType: 'SALARY_REVISION',
      entityId: revisionId,
      afterState: { approved_by: approverId }
    });

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
    await this.notificationService.sendNotification(ctx, {
      eventCode: 'salary_revision_rejected',
      recipientId: revision.employee_id,
      variables: { revisionId: String(revisionId), reason: reason || '' }
    } as any);

    await this.auditService.log(ctx, {
      action: 'REJECT',
      entityType: 'SALARY_REVISION',
      entityId: revisionId,
      afterState: { reason }
    });

    return updated;
  }

  async getRevision(ctx: TenantContext, revisionId: number) {
    return this.revisionRepo.getById(ctx, revisionId);
  }

  async getRevisionComponents(ctx: TenantContext, revisionId: number) {
    return this.revisionComponentRepo.getForRevision(ctx, revisionId);
  }

  async listRevisions(ctx: TenantContext, filters: { employeeId?: number; status?: string; revisionType?: string }) {
    const listFilters: any = {};
    if (filters.employeeId) listFilters.employee_id = filters.employeeId;
    if (filters.status) listFilters.status = filters.status;
    if (filters.revisionType) listFilters.revision_type = filters.revisionType;

    const result = await this.revisionRepo.list(ctx, { filters: listFilters });
    return result.items;
  }
}



