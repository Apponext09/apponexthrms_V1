import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface ResumeUploadLog {
  id: number;
  uuid: string;
  organization_id: number;
  uploaded_by: number | null;
  file_name: string;
  total_records: number;
  success_count: number;
  failed_count: number;
  status: 'Processing' | 'Completed' | 'Failed';
  error_log_json: any;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ResumeUploadLogRepository extends BaseRepository<ResumeUploadLog> {
  private static schemaChecked = false;

  constructor() {
    super('resume_upload_logs');
  }

  private async ensureTable(): Promise<boolean> {
    if (ResumeUploadLogRepository.schemaChecked) return true;
    try {
      const hasTable = await this.db.schema.hasTable(this.tableName);
      if (!hasTable) {
        await this.db.schema.createTable(this.tableName, (table) => {
          table.bigIncrements('id').primary();
          table.string('uuid', 36).notNullable();
          table.bigInteger('organization_id').unsigned().notNullable();
          table.bigInteger('uploaded_by').unsigned().nullable();
          table.string('file_name', 500).notNullable();
          table.integer('total_records').defaultTo(0);
          table.integer('success_count').defaultTo(0);
          table.integer('failed_count').defaultTo(0);
          table.string('status', 50).defaultTo('Processing');
          table.text('error_log_json').nullable();
          table.timestamp('uploaded_at').nullable();
          table.timestamp('created_at').nullable();
          table.timestamp('updated_at').nullable();
          table.timestamp('deleted_at').nullable();
        });
      } else {
        const hasDeletedAt = await this.db.schema.hasColumn(this.tableName, 'deleted_at');
        if (!hasDeletedAt) {
          await this.db.schema.alterTable(this.tableName, (table) => {
            table.timestamp('deleted_at').nullable();
          });
        }
      }
      ResumeUploadLogRepository.schemaChecked = true;
      return true;
    } catch (err) {
      console.error('[ResumeUploadLogRepository] ensureTable error:', err);
      return false;
    }
  }

  override async create(ctx: TenantContext, data: Partial<ResumeUploadLog>): Promise<ResumeUploadLog> {
    await this.ensureTable();
    const { v4: uuidv4 } = await import('uuid');
    return super.create(ctx, {
      uuid: data.uuid || uuidv4(),
      ...data
    });
  }

  override async list(ctx: TenantContext, options?: ListQueryOptions): Promise<any> {
    await this.ensureTable();
    return super.list(ctx, options);
  }

  protected getSearchableFields(): string[] {
    return ['file_name'];
  }

  async getByUploader(ctx: TenantContext, uploadedBy: number, options?: ListQueryOptions) {
    await this.ensureTable();
    return this.list(ctx, {
      ...options,
      filters: { uploaded_by: uploadedBy },
    });
  }

  async getRecent(ctx: TenantContext, limit: number = 10): Promise<ResumeUploadLog[]> {
    await this.ensureTable();
    return this.query(ctx)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .limit(limit) as any;
  }
}
