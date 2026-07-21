import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface NotificationBatch {
  id: number;
  uuid: string;
  organization_id: number;
  batch_code: string;
  batch_name: string;
  description?: string;
  notification_count: number;
  delivered_count: number;
  failed_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export class NotificationBatchRepository extends BaseRepository<NotificationBatch> {
  constructor() {
    super('notification_batches');
  }

  /**
   * Get batch by code
   */
  async getByCode(ctx: TenantContext, batchCode: string): Promise<NotificationBatch | null> {
    return this.query(ctx).where('batch_code', batchCode).first() as Promise<
      NotificationBatch | null
    >;
  }

  /**
   * Get active batches
   */
  async getActive(ctx: TenantContext): Promise<NotificationBatch[]> {
    return this.query(ctx)
      .where((q) => {
        q.where('status', 'pending').orWhere('status', 'processing');
      })
      .orderBy('created_at', 'asc');
  }

  /**
   * Update batch progress
   */
  async updateProgress(
    ctx: TenantContext,
    batchId: number,
    deliveredCount: number,
    failedCount: number
  ): Promise<NotificationBatch> {
    return this.update(ctx, batchId, {
      delivered_count: deliveredCount,
      failed_count: failedCount,
    } as any);
  }

  /**
   * Mark batch as completed
   */
  async markCompleted(ctx: TenantContext, batchId: number): Promise<NotificationBatch> {
    return this.update(ctx, batchId, {
      status: 'completed',
      completed_at: new Date(),
    } as any);
  }

  /**
   * Mark batch as failed
   */
  async markFailed(ctx: TenantContext, batchId: number): Promise<NotificationBatch> {
    return this.update(ctx, batchId, {
      status: 'failed',
      completed_at: new Date(),
    } as any);
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['batch_code', 'batch_name', 'description'];
  }
}
