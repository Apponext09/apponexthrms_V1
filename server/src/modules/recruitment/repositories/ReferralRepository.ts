import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Referral {
  id: number;
  uuid: string;
  organization_id: number;
  referrer_employee_id: number;
  candidate_id: number;
  application_id: number | null;
  referral_date: string;
  referral_reward_amount: number | null;
  referral_status: 'pending' | 'hired' | 'rejected';
  hired_date: string | null;
  reward_status: 'pending' | 'paid' | 'forfeited';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ReferralRepository extends BaseRepository<Referral> {
  constructor() {
    super('referrals');
  }

  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { referrer_employee_id: employeeId },
    });
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { referral_status: status },
    });
  }

  async getHired(ctx: TenantContext, options?: ListQueryOptions) {
    return this.getByStatus(ctx, 'hired', options);
  }

  async countByEmployee(ctx: TenantContext, employeeId: number): Promise<number> {
    return this.count(ctx, { referrer_employee_id: employeeId });
  }
}
