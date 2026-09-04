import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export class AttendanceIntegrationService {
  async lockAttendance(ctx: TenantContext, salaryMonth: string) {
    const db = getKnex();
    
    // Count active employees in org
    const employees = await db('employees')
      .where('organization_id', ctx.organizationId)
      .whereRaw("UPPER(status) = 'ACTIVE'");

    const existing = await db('attendance_locks')
      .where('organization_id', ctx.organizationId)
      .where('salary_month', salaryMonth)
      .first();

    if (existing) {
      await db('attendance_locks')
        .where('id', existing.id)
        .update({
          status: 'locked',
          locked_by: ctx.userId,
          locked_at: new Date()
        });
      return { ...existing, status: 'locked' };
    }

    const [id] = await db('attendance_locks').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      salary_month: salaryMonth,
      total_employees: employees.length,
      locked_by: ctx.userId,
      status: 'locked'
    });

    return db('attendance_locks').where('id', id).first();
  }

  async getAttendanceLockStatus(ctx: TenantContext, salaryMonth: string) {
    const db = getKnex();
    const lock = await db('attendance_locks')
      .where('organization_id', ctx.organizationId)
      .where('salary_month', salaryMonth)
      .first();
    
    return lock || { salary_month: salaryMonth, status: 'unlocked', total_employees: 0 };
  }

  async calculateEmployeeDaysAndLop(ctx: TenantContext, employeeId: number, salaryMonth: string) {
    const db = getKnex();
    const totalMonthDays = 30;

    // Check unpaid leave applications for the month
    const leaves = await db('leave_applications')
      .where('employee_id', employeeId)
      .where('status', 'approved')
      .whereRaw("DATE_FORMAT(start_date, '%Y-%m') = ?", [salaryMonth]);

    let lopDays = 0;
    for (const l of leaves) {
      if (l.leave_type_id === 4 || l.is_unpaid) {
        lopDays += (l.total_days || 1);
      }
    }

    const payableDays = Math.max(0, totalMonthDays - lopDays);

    // Real OT: sum overtime_minutes from attendance_records for the month
    let overtimeHours = 0;
    try {
      const otResult = await db('attendance_records')
        .where('employee_id', employeeId)
        .where('organization_id', ctx.organizationId)
        .whereRaw("DATE_FORMAT(check_in_date, '%Y-%m') = ?", [salaryMonth])
        .sum('overtime_minutes as total_ot_mins')
        .first();
      overtimeHours = Number((otResult as any)?.total_ot_mins || 0) / 60;
    } catch { overtimeHours = 0; }

    return {
      totalMonthDays,
      payableDays,
      lopDays,
      overtimeHours,
    };
  }
}
