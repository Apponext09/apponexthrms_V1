import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Offer {
  id: number;
  uuid: string;
  organization_id: number;
  application_id: number;
  offer_code: string;
  position_title: string;
  department_id: number | null;
  designation_id: number | null;
  cost_to_company: number;
  base_salary: number;
  currency: string;
  offer_start_date: string;
  offer_expiry_date: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
  offer_pdf_url: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  workflow_instance_id: number | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class OfferRepository extends BaseRepository<Offer> {
  constructor() {
    super('offers');
  }

  async getByCode(ctx: TenantContext, code: string): Promise<Offer | null> {
    return this.query(ctx).where('offer_code', code).first();
  }

  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('offer_code', code);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  async getByApplication(ctx: TenantContext, applicationId: number): Promise<Offer | null> {
    return this.query(ctx).where('application_id', applicationId).first();
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  async getPending(ctx: TenantContext, options?: ListQueryOptions) {
    const result = await this.list(ctx, options);
    // Filter for sent but not accepted/rejected
    return {
      ...result,
      items: result.items.filter((item) => item.status === 'sent'),
    };
  }

  async getExpired(ctx: TenantContext, options?: ListQueryOptions) {
    const result = await this.list(ctx, options);
    const now = new Date().toISOString().split('T')[0];
    return {
      ...result,
      items: result.items.filter((item) => item.offer_expiry_date < now && item.status === 'sent'),
    };
  }
}
