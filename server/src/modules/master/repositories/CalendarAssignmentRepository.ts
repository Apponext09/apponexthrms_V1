import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export interface CalendarAssignment {
  id: number;
  uuid: string;
  organization_id: number | null;
  calendar_id: number;
  company_id: number | null;
  location_id: number | null;
  department_id: number | null;
  employee_group_id: number | null;
  assigned_at: string;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class CalendarAssignmentRepository extends BaseRepository<CalendarAssignment> {
  constructor() {
    super('calendar_assignments');
  }

  /**
   * Assign calendar to company/location/department/employee-group
   */
  async assignCalendar(
    ctx: TenantContext,
    data: {
      calendar_id: number;
      company_id?: number | null;
      location_id?: number | null;
      department_id?: number | null;
      employee_group_id?: number | null;
    }
  ): Promise<CalendarAssignment> {
    const assignUuid = uuidv4();
    const userId = ctx.userId ? Number(ctx.userId) : 1;

    const [id] = await this.db('calendar_assignments').insert({
      uuid: assignUuid,
      organization_id: ctx.organizationId,
      calendar_id: data.calendar_id,
      company_id: data.company_id ?? null,
      location_id: data.location_id ?? null,
      department_id: data.department_id ?? null,
      employee_group_id: data.employee_group_id ?? null,
      assigned_at: this.db.fn.now(),
      created_by: userId,
      updated_by: userId,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    const created = await this.db('calendar_assignments').where('id', id).first();
    return {
      id: created.id,
      uuid: created.uuid,
      organization_id: created.organizationId || created.organization_id,
      calendar_id: created.calendarId || created.calendar_id,
      company_id: created.companyId || created.company_id,
      location_id: created.locationId || created.location_id,
      department_id: created.departmentId || created.department_id,
      employee_group_id: created.employeeGroupId || created.employee_group_id,
      assigned_at: created.assignedAt || created.assigned_at,
      created_by: created.createdBy || created.created_by,
      updated_by: created.updatedBy || created.updated_by,
      created_at: created.createdAt || created.created_at,
      updated_at: created.updatedAt || created.updated_at,
      deleted_at: created.deletedAt || created.deleted_at,
    };
  }

  /**
   * Get assignments by calendar ID
   */
  async getByCalendarId(ctx: TenantContext, calendarId: number | string): Promise<CalendarAssignment[]> {
    const rows = await this.db('calendar_assignments')
      .where('calendar_id', Number(calendarId))
      .whereNull('deleted_at')
      .orderBy('assigned_at', 'desc');

    return rows.map((a: any) => ({
      id: a.id,
      uuid: a.uuid,
      organization_id: a.organizationId || a.organization_id,
      calendar_id: a.calendarId || a.calendar_id,
      company_id: a.companyId || a.company_id,
      location_id: a.locationId || a.location_id,
      department_id: a.departmentId || a.department_id,
      employee_group_id: a.employeeGroupId || a.employee_group_id,
      assigned_at: a.assignedAt || a.assigned_at,
      created_by: a.createdBy || a.created_by,
      updated_by: a.updatedBy || a.updated_by,
      created_at: a.createdAt || a.created_at,
      updated_at: a.updatedAt || a.updated_at,
      deleted_at: a.deletedAt || a.deleted_at,
    }));
  }
}
