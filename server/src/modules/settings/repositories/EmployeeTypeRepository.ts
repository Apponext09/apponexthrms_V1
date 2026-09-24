import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface EmployeeType {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  status: 'active' | 'inactive';
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeTypeRepository extends BaseRepository<EmployeeType> {
  private static tableEnsured = false;

  constructor() {
    super('employee_types');
    this.companyScoped = true;
  }

  public async ensureTable() {
    if (EmployeeTypeRepository.tableEnsured) return;
    try {
      const hasTable = await this.db.schema.hasTable('employee_types');
      if (!hasTable) {
        await this.db.schema.createTable('employee_types', (table) => {
          table.bigIncrements('id').primary();
          table.string('uuid', 36).notNullable().unique();
          table.bigInteger('organization_id').unsigned().notNullable();
          table.bigInteger('company_id').unsigned().nullable();
          table.string('name', 100).notNullable();
          table.string('status', 20).defaultTo('active');
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
        const hasCompanyId = await this.db.schema.hasColumn('employee_types', 'company_id');
        if (!hasCompanyId) {
          await this.db.schema.table('employee_types', (table) => {
            table.bigInteger('company_id').unsigned().nullable().after('organization_id');
          });
        }
      }
      EmployeeTypeRepository.tableEnsured = true;
    } catch (err) {
      console.warn('[EmployeeTypeRepository] Error ensuring table schema:', err);
    }
  }

  /**
   * Check if name exists within organization
   */
  async isNameUnique(ctx: TenantContext, name: string, excludeId?: number): Promise<boolean> {
    await this.ensureTable();
    let query = this.query(ctx).where('name', name);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['name'];
  }
}

