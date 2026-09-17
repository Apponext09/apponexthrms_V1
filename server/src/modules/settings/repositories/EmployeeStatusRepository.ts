import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, SoftDeleteFilter } from '../../../db/types';

export interface EmployeeStatus {
  id: number;
  uuid: string;
  organization_id: number;
  company_id?: number | null;
  name: string;
  is_probation_status: boolean;
  probation_period_value: number | null;
  probation_period_unit: string | null;
  notify_on_completion: boolean;
  is_confirmation_status: boolean;
  is_resignation_status: boolean;
  inactive_on_status_change: boolean;
  status_color: string | null;
  status: 'active' | 'inactive';
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type EmployeeStatusCreate = Omit<EmployeeStatus, 'id' | 'uuid' | 'organization_id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type EmployeeStatusUpdate = Partial<EmployeeStatusCreate>;

export class EmployeeStatusRepository extends BaseRepository<EmployeeStatus> {
  private static tableEnsured = false;

  constructor() {
    super('employee_statuses');
    this.companyScoped = true;
  }

  public async ensureTable() {
    if (EmployeeStatusRepository.tableEnsured) return;
    try {
      const hasTable = await this.db.schema.hasTable('employee_statuses');
      if (!hasTable) {
        await this.db.schema.createTable('employee_statuses', (table) => {
          table.bigIncrements('id').primary();
          table.string('uuid', 36).notNullable().unique();
          table.bigInteger('organization_id').unsigned().notNullable();
          table.bigInteger('company_id').unsigned().nullable();
          table.string('name', 150).notNullable();
          table.boolean('is_probation_status').defaultTo(false);
          table.integer('probation_period_value').nullable();
          table.string('probation_period_unit', 50).nullable();
          table.boolean('notify_on_completion').defaultTo(false);
          table.boolean('is_confirmation_status').defaultTo(false);
          table.boolean('is_resignation_status').defaultTo(false);
          table.boolean('inactive_on_status_change').defaultTo(false);
          table.string('status_color', 20).nullable();
          table.string('status', 50).defaultTo('active');
          
          table.bigInteger('created_by').unsigned().nullable();
          table.bigInteger('updated_by').unsigned().nullable();
          table.timestamp('created_at').defaultTo(this.db.fn.now());
          table.timestamp('updated_at').defaultTo(this.db.fn.now());
          table.timestamp('deleted_at').nullable();

          table.index('organization_id');
          table.index('company_id');
          table.index('status');
        });
      } else {
        const hasCompanyId = await this.db.schema.hasColumn('employee_statuses', 'company_id');
        if (!hasCompanyId) {
          await this.db.schema.table('employee_statuses', (table) => {
            table.bigInteger('company_id').unsigned().nullable().after('organization_id');
          });
        }
      }
      EmployeeStatusRepository.tableEnsured = true;
    } catch (err) {
      console.warn('[EmployeeStatusRepository] Error ensuring table schema:', err);
    }
  }

  async isNameUnique(ctx: TenantContext, name: string, excludeId?: number): Promise<boolean> {
    await this.ensureTable();
    let query = this.query(ctx).where('name', name).whereNull('deleted_at');
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }
}

