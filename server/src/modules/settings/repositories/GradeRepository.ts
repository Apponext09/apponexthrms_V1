import { BaseRepository } from '../../../db/BaseRepository';

export class GradeRepository extends BaseRepository<any> {
  private static tableEnsured = false;

  constructor() {
    super('grades');
    this.companyScoped = true;
  }

  public async ensureTable() {
    if (GradeRepository.tableEnsured) return;
    try {
      const hasTable = await this.db.schema.hasTable('grades');
      if (!hasTable) {
        await this.db.schema.createTable('grades', (table) => {
          table.bigIncrements('id').primary();
          table.string('uuid', 36).notNullable().unique();
          table.bigInteger('organization_id').unsigned().notNullable();
          table.bigInteger('company_id').unsigned().nullable();
          table.string('name', 150).notNullable();
          table.string('code', 50).notNullable();
          table.text('description', 'longtext').nullable();
          table.string('color', 20).nullable();
          table.string('status', 20).defaultTo('active');
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
        const hasCompanyId = await this.db.schema.hasColumn('grades', 'company_id');
        if (!hasCompanyId) {
          await this.db.schema.table('grades', (table) => {
            table.bigInteger('company_id').unsigned().nullable().after('organization_id');
          });
        }
      }
      GradeRepository.tableEnsured = true;
    } catch (err) {
      console.warn('[GradeRepository] Error ensuring table schema:', err);
    }
  }
}

