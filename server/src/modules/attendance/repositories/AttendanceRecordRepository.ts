import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'work_from_home' | 'on_leave' | 'holiday' | 'weekly_off' | 'sick';

export interface AttendanceRecord {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  check_in_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  duration_minutes: number | null;
  break_time_minutes: number;
  work_duration_minutes: number | null;
  status: AttendanceStatus;
  check_in_location_id: number | null;
  check_out_location_id: number | null;
  check_in_method: string | null;
  check_out_method: string | null;
  is_late: boolean;
  is_early_departure: boolean;
  is_regularized: boolean;
  regularization_request_id: number | null;
  overtime_minutes: number;
  notes: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Knex postProcessResponse returns camelCase at runtime.
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInDate?: string;
  durationMinutes?: number | null;
  workDurationMinutes?: number | null;
}

export class AttendanceRecordRepository extends BaseRepository<AttendanceRecord> {
  constructor() {
    super('attendance_records');
  }

  async getByEmployeeAndDate(
    ctx: TenantContext,
    employeeId: number,
    date: string
  ): Promise<AttendanceRecord | null> {
    try {
      return (await this.query(ctx)
        .where('employee_id', employeeId)
        .where((builder) => {
          builder.where('check_in_date', date).orWhere('check_in_date', 'like', `${date}%`);
        })
        .first()) as AttendanceRecord | null;
    } catch (error) {
      return null;
    }
  }

  async getEmployeeHistory(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    try {
      return await this.list(ctx, {
        ...options,
        filters: { employee_id: employeeId },
        sortBy: 'check_in_date',
        sortOrder: 'desc',
      });
    } catch (error) {
      // Return empty result if table doesn't exist or other DB error occurs
      return {
        items: [] as AttendanceRecord[],
        meta: {
          total: 0,
          page: options?.page || 1,
          pageSize: options?.pageSize || 20,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  async getByDateRange(
    ctx: TenantContext,
    employeeId: number,
    startDate: string,
    endDate: string,
    options?: ListQueryOptions
  ) {
    try {
      const baseQuery = this.query(ctx)
        .where('employee_id', employeeId)
        .where('check_in_date', '>=', startDate)
        .where('check_in_date', '<=', endDate);

      const countQuery = baseQuery.clone().count('* as total').first();
      const dataQuery = baseQuery
        .orderBy('check_in_date', 'desc')
        .limit(options?.pageSize || 20)
        .offset(((options?.page || 1) - 1) * (options?.pageSize || 20));

      const [count, items] = await Promise.all([countQuery, dataQuery]);
      const total = (count as any).total || 0;

      return {
        items: items as AttendanceRecord[],
        meta: {
          total,
          page: options?.page || 1,
          pageSize: options?.pageSize || 20,
          totalPages: Math.ceil(total / (options?.pageSize || 20)),
          hasMore: ((options?.page || 1) * (options?.pageSize || 20)) < total,
        },
      };
    } catch (error) {
      // Return empty result if table doesn't exist or other DB error occurs
      return {
        items: [] as AttendanceRecord[],
        meta: {
          total: 0,
          page: options?.page || 1,
          pageSize: options?.pageSize || 20,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  async getLateArrivals(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    try {
      return await this.list(ctx, {
        ...options,
        filters: { employee_id: employeeId, is_late: true },
        sortBy: 'check_in_date',
        sortOrder: 'desc',
      });
    } catch (error) {
      return {
        items: [] as AttendanceRecord[],
        meta: {
          total: 0,
          page: options?.page || 1,
          pageSize: options?.pageSize || 20,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  async getAbsentDays(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    try {
      return await this.list(ctx, {
        ...options,
        filters: { employee_id: employeeId, status: 'absent' },
        sortBy: 'check_in_date',
        sortOrder: 'desc',
      });
    } catch (error) {
      return {
        items: [] as AttendanceRecord[],
        meta: {
          total: 0,
          page: options?.page || 1,
          pageSize: options?.pageSize || 20,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  async getReportRecords(
    ctx: TenantContext,
    options: {
      startDate: string;
      endDate: string;
      employees?: string[];
      departments?: string[];
      locations?: string[];
    }
  ) {
    try {
      let q = this.query(ctx)
        .where('check_in_date', '>=', options.startDate)
        .where('check_in_date', '<=', options.endDate);

      if (options.employees && options.employees.length > 0) {
        const empIds = options.employees.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));
        if (empIds.length > 0) {
          q = q.whereIn('employee_id', empIds);
        }
      }

      if (options.locations && options.locations.length > 0) {
        const locIds = options.locations.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));
        if (locIds.length > 0) {
          q = q.whereIn('check_in_location_id', locIds);
        }
      }

      const records = await q.orderBy('check_in_date', 'desc');
      return records as AttendanceRecord[];
    } catch (error) {
      return [] as AttendanceRecord[];
    }
  }

  protected getSearchableFields(): string[] {
    return [];
  }

  protected getAllowedSortColumns(): string[] {
    return [
      'id',
      'check_in_date',
      'check_in_time',
      'check_out_time',
      'duration_minutes',
      'work_duration_minutes',
      'status',
      'is_late',
      'is_regularized',
      'created_at',
      'updated_at',
      'organization_id',
    ];
  }
}
