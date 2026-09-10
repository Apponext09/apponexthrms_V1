import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface LeaveCancellation {
  id: number;
  uuid: string;
  organization_id: number;
  application_id: number;
  cancellation_reason: string;
  cancellation_requested_at: string;
  workflow_instance_id: number | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: number | null;
  approval_date: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class LeaveCancellationRepository extends BaseRepository<LeaveCancellation> {
  constructor() {
    super('leave_cancellations');
    this.companyScoped = true;
  }

  /**
   * Get cancellations for application
   */
  async getForApplication(ctx: TenantContext, applicationId: number): Promise<LeaveCancellation[]> {
    return this.query(ctx)
      .where('application_id', applicationId)
      .orderBy('cancellation_requested_at', 'desc') as Promise<LeaveCancellation[]>;
  }

  /**
   * Get pending cancellations
   */
  async getPending(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'pending' },
    });
  }

  /**
   * Get latest cancellation for application
   */
  async getLatestForApplication(ctx: TenantContext, applicationId: number): Promise<LeaveCancellation | null> {
    return this.query(ctx)
      .where('application_id', applicationId)
      .orderBy('cancellation_requested_at', 'desc')
      .first() as Promise<LeaveCancellation | null>;
  }
}
