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
}

export class ResumeUploadLogRepository extends BaseRepository<ResumeUploadLog> {
  constructor() {
    super('resume_upload_logs');
  }

  override async create(ctx: TenantContext, data: Partial<ResumeUploadLog>): Promise<ResumeUploadLog> {
    const { v4: uuidv4 } = await import('uuid');
    return super.create(ctx, {
      uuid: data.uuid || uuidv4(),
      ...data
    });
  }

  protected getSearchableFields(): string[] {
    return ['file_name'];
  }

  async getByUploader(ctx: TenantContext, uploadedBy: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { uploaded_by: uploadedBy },
    });
  }

  async getRecent(ctx: TenantContext, limit: number = 10): Promise<ResumeUploadLog[]> {
    return this.query(ctx)
      .orderBy('uploaded_at', 'desc')
      .limit(limit) as any;
  }
}
