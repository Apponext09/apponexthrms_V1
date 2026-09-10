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
  shift_id?: number | null;
  shiftId?: number | null;
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
  private static schemaChecked = false;

  constructor() {
    super('attendance_records');
    this.companyScoped = true;
    this.ensureShiftIdColumn();
  }

  private async ensureShiftIdColumn() {
    if (AttendanceRecordRepository.schemaChecked) return;
    try {
      const hasCol = await this.db.schema.hasColumn('attendance_records', 'shift_id');
      if (!hasCol) {
        await this.db.schema.alterTable('attendance_records', (table) => {
          table.integer('shift_id').unsigned().nullable();
        });
        console.log('✅ Added shift_id column to attendance_records table');
      }
      AttendanceRecordRepository.schemaChecked = true;
    } catch (err: any) {
      console.warn('⚠️ Failed to verify shift_id column in attendance_records:', err.message);
    }
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
          builder
            .where('check_in_date', date)
            .orWhere('check_in_date', 'like', `${date}%`)
            .orWhereRaw('DATE(check_in_time) = ?', [date])
            .orWhereRaw('DATE(check_in_date) = ?', [date]);
        })
        .orderBy('id', 'desc')
        .first()) as AttendanceRecord | null;
    } catch (error) {
      return null;
    }
  }

  async getEmployeeHistory(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    try {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 100;
      const offset = (page - 1) * pageSize;

      const baseQuery = this.db('attendance_records')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', employeeId)
        .whereNull('deleted_at')
        .where((b) => {
          if (ctx.companyId) {
            b.where('company_id', ctx.companyId).orWhereNull('company_id');
          }
        });

      const countResult = await baseQuery.clone().count('* as total').first();
      const total = (countResult as any)?.total ? Number((countResult as any).total) : 0;

      const items = await baseQuery
        .orderBy('check_in_date', 'desc')
        .orderBy('id', 'desc')
        .limit(pageSize)
        .offset(offset);

      return {
        items: items as AttendanceRecord[],
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          hasMore: page * pageSize < total,
        },
      };
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

  async getByDateRange(
    ctx: TenantContext,
    employeeId: number,
    startDate: string,
    endDate: string,
    options?: ListQueryOptions
  ) {
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const clampedEndDate = endDate > todayStr ? todayStr : endDate;
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 100;
      const offset = (page - 1) * pageSize;

      const baseQuery = this.db('attendance_records')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', employeeId)
        .whereNull('deleted_at')
        .where((b) => {
          if (ctx.companyId) {
            b.where('company_id', ctx.companyId).orWhereNull('company_id');
          }
        })
        .where((b) => {
          b.where((dateBuilder) => {
            dateBuilder
              .where('check_in_date', '>=', startDate)
              .orWhereRaw('DATE(check_in_date) >= ?', [startDate])
              .orWhereRaw('DATE(check_in_time) >= ?', [startDate]);
          });
        })
        .where((b) => {
          b.where((dateBuilder) => {
            dateBuilder
              .where('check_in_date', '<=', clampedEndDate)
              .orWhereRaw('DATE(check_in_date) <= ?', [clampedEndDate])
              .orWhereRaw('DATE(check_in_time) <= ?', [clampedEndDate]);
          });
        });

      const countQuery = baseQuery.clone().count('* as total').first();
      const dataQuery = baseQuery
        .orderBy('check_in_date', 'desc')
        .orderBy('id', 'desc')
        .limit(pageSize)
        .offset(offset);

      const [count, items] = await Promise.all([countQuery, dataQuery]);
      const total = (count as any)?.total ? Number((count as any).total) : 0;

      return {
        items: items as AttendanceRecord[],
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          hasMore: page * pageSize < total,
        },
      };
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
