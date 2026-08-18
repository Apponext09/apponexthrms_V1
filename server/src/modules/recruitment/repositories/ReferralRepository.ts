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
    return this.listEnriched(ctx, { referrerEmployeeId: employeeId });
  }

  async listEnriched(ctx: TenantContext, options?: { referrerEmployeeId?: number }) {
    let q = this.query(ctx)
      .leftJoin('candidates', 'referrals.candidate_id', 'candidates.id')
      .leftJoin('employees', 'referrals.referrer_employee_id', 'employees.id')
      .select(
        'referrals.*',
        'candidates.first_name as candidate_first_name',
        'candidates.last_name as candidate_last_name',
        'candidates.email as candidate_email',
        'candidates.phone as candidate_phone',
        'candidates.current_company as candidate_position',
        'employees.first_name as referrer_first_name',
        'employees.last_name as referrer_last_name',
        'employees.email as referrer_email'
      )
      .whereNull('referrals.deleted_at');

    if (options?.referrerEmployeeId) {
      q = q.where('referrals.referrer_employee_id', options.referrerEmployeeId);
    }

    const rows = await q.orderBy('referrals.id', 'desc');

    return rows.map((r: any) => {
      const candFn = r.candidate_first_name || '';
      const candLn = r.candidate_last_name || '';
      const candName = `${candFn} ${candLn}`.trim() || r.candidate_name || (r.candidate_id ? `Candidate #${r.candidate_id}` : 'Candidate');

      const refFn = r.referrer_first_name || '';
      const refLn = r.referrer_last_name || '';
      const refName = `${refFn} ${refLn}`.trim() || r.referrer_name || (r.referrer_employee_id ? `Employee #${r.referrer_employee_id}` : 'Employee');

      const statusVal = r.status || r.referral_status || 'submitted';

      return {
        ...r,
        id: r.id,
        candidate_id: r.candidate_id,
        candidateId: r.candidate_id,
        candidate_name: candName,
        candidateName: candName,
        candidate_email: r.candidate_email || '',
        candidateEmail: r.candidate_email || '',
        candidate_phone: r.candidate_phone || '',
        candidatePhone: r.candidate_phone || '',
        position_title: r.candidate_position || 'Open Role',
        positionTitle: r.candidate_position || 'Open Role',
        referrer_employee_id: r.referrer_employee_id,
        referrerEmployeeId: r.referrer_employee_id,
        referrer_name: refName,
        referrerName: refName,
        referrer_email: r.referrer_email || '',
        referrerEmail: r.referrer_email || '',
        referral_reward_amount: r.referral_reward_amount,
        referralRewardAmount: r.referral_reward_amount,
        status: statusVal,
        referral_status: statusVal,
        referralStatus: statusVal,
        reward_status: r.reward_status || 'pending',
        rewardStatus: r.reward_status || 'pending',
        created_at: r.created_at,
        createdAt: r.created_at,
      };
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
