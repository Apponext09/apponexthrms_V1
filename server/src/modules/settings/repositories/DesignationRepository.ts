import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface Designation {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  code: string;
  department_id: number | null;
  level: number | null;
  description: string | null;
  status: 'active' | 'inactive';
  mapped_companies: string | null;
  mapped_locations: string | null;
  mapped_departments: string | null;
  mapped_shifts: string | null;
  mapped_grades: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class DesignationRepository extends BaseRepository<Designation> {
  private static tableEnsured = false;

  constructor() {
    super('designations');
    this.companyScoped = true;
  }

  public async ensureTable() {
    if (DesignationRepository.tableEnsured) return;
    try {
      const hasTable = await this.db.schema.hasTable('designations');
      if (!hasTable) {
        await this.db.schema.createTable('designations', (table) => {
          table.bigIncrements('id').primary();
          table.string('uuid', 36).notNullable().unique();
          table.bigInteger('organization_id').unsigned().notNullable();
          table.bigInteger('company_id').unsigned().nullable();
          table.string('name', 150).notNullable();
          table.string('code', 50).notNullable();
          table.bigInteger('department_id').unsigned().nullable();
          table.integer('level').nullable();
          table.text('description').nullable();
          table.string('status', 20).defaultTo('active');
          table.text('mapped_companies').nullable();
          table.text('mapped_locations').nullable();
          table.text('mapped_departments').nullable();
          table.text('mapped_shifts').nullable();
          table.text('mapped_grades').nullable();
          table.bigInteger('created_by').unsigned().nullable();
          table.bigInteger('updated_by').unsigned().nullable();
          table.timestamp('created_at').defaultTo(this.db.fn.now());
          table.timestamp('updated_at').defaultTo(this.db.fn.now());
          table.timestamp('deleted_at').nullable();

          table.index('organization_id');
          table.index('company_id');
          table.index('code');
          table.index('status');
        });
      } else {
        const columnsToCheck = [
          'company_id',
          'mapped_companies',
          'mapped_locations',
          'mapped_departments',
          'mapped_shifts',
          'mapped_grades'
        ];
        for (const col of columnsToCheck) {
          const hasCol = await this.db.schema.hasColumn('designations', col);
          if (!hasCol) {
            await this.db.schema.table('designations', (table) => {
              if (col === 'company_id') {
                table.bigInteger('company_id').unsigned().nullable().after('organization_id');
              } else {
                table.text(col).nullable();
              }
            });
          }
        }
      }
      DesignationRepository.tableEnsured = true;
    } catch (err) {
      console.warn('[DesignationRepository] Error ensuring schema:', err);
    }
  }

  /**
   * Get designation by code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Designation | null> {
    await this.ensureTable();
    return this.query(ctx).where('code', code).first() as Promise<Designation | null>;
  }

  /**
   * Get designations by department
   */
  async getByDepartment(ctx: TenantContext, departmentId: number) {
    await this.ensureTable();
    return this.query(ctx).where('department_id', departmentId);
  }

  /**
   * Get designations by level
   */
  async getByLevel(ctx: TenantContext, level: number) {
    await this.ensureTable();
    return this.query(ctx).where('level', level);
  }

  /**
   * Check if code exists within organization
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    await this.ensureTable();
    let query = this.query(ctx).where('code', code);
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
    return ['name', 'code', 'description'];
  }
}
