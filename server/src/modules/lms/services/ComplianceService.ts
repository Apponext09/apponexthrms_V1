import type { TenantContext } from '../../../db/types';
import { complianceRepository } from '../repositories/ComplianceRepository';

export class ComplianceService {
  async getComplianceRules(ctx: TenantContext) {
    return complianceRepository.listWithDetails(ctx);
  }

  async getComplianceById(ctx: TenantContext, id: number) {
    return complianceRepository.getById(ctx, id);
  }

  async createComplianceRule(ctx: TenantContext, data: any) {
    return complianceRepository.create(ctx, {
      course_id: data.courseId,
      department_id: data.departmentId || null,
      designation_id: data.designationId || null,
      is_mandatory: data.isMandatory !== undefined ? data.isMandatory : true,
      deadline_days: data.deadlineDays || 30,
      reminder_schedule: data.reminderSchedule ? (typeof data.reminderSchedule === 'string' ? data.reminderSchedule : JSON.stringify(data.reminderSchedule)) : JSON.stringify([7, 3, 1]),
      organization_id: ctx.organizationId,
    });
  }

  async updateComplianceRule(ctx: TenantContext, id: number, data: any) {
    const payload: any = {};
    if (data.courseId !== undefined) payload.course_id = data.courseId;
    if (data.departmentId !== undefined) payload.department_id = data.departmentId;
    if (data.designationId !== undefined) payload.designation_id = data.designationId;
    if (data.isMandatory !== undefined) payload.is_mandatory = data.isMandatory;
    if (data.deadlineDays !== undefined) payload.deadline_days = data.deadlineDays;
    if (data.reminderSchedule !== undefined) {
      payload.reminder_schedule = typeof data.reminderSchedule === 'string' ? data.reminderSchedule : JSON.stringify(data.reminderSchedule);
    }
    return complianceRepository.update(ctx, id, payload);
  }

  async deleteComplianceRule(ctx: TenantContext, id: number) {
    return complianceRepository.delete(ctx, id);
  }
}

export const complianceService = new ComplianceService();
