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

  async listEnriched(ctx: TenantContext, options?: { referrerEmployeeId?: number; referrerEmployeeIds?: number[]; createdBy?: number }) {
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
        'candidates.resume_url as candidate_resume_url',
        'employees.first_name as referrer_first_name',
        'employees.last_name as referrer_last_name',
        'employees.email as referrer_email'
      )
      .whereNull('referrals.deleted_at');

    if (options?.referrerEmployeeIds && options.referrerEmployeeIds.length > 0) {
      q = q.where((builder) => {
        builder.whereIn('referrals.referrer_employee_id', options.referrerEmployeeIds!);
        if (options?.createdBy) {
          builder.orWhere('referrals.created_by', options.createdBy);
        }
      });
    } else if (options?.referrerEmployeeId) {
      q = q.where((builder) => {
        builder.where('referrals.referrer_employee_id', options.referrerEmployeeId!);
        if (options?.createdBy) {
          builder.orWhere('referrals.created_by', options.createdBy);
        }
      });
    } else if (options?.createdBy) {
      q = q.where('referrals.created_by', options.createdBy);
    }

    const rows = await q.orderBy('referrals.id', 'desc');

    return rows.map((r: any) => {
      const candFn = r.candidateFirstName || r.candidate_first_name || '';
      const candLn = r.candidateLastName || r.candidate_last_name || '';
      const candId = r.candidateId || r.candidate_id;
      const candName = `${candFn} ${candLn}`.trim() || r.candidateName || r.candidate_name || (candId ? `Candidate #${candId}` : 'Candidate');

      const refFn = r.referrerFirstName || r.referrer_first_name || '';
      const refLn = r.referrerLastName || r.referrer_last_name || '';
      const refId = r.referrerEmployeeId || r.referrer_employee_id;
      const refName = `${refFn} ${refLn}`.trim() || r.referrerName || r.referrer_name || (refId ? `Employee #${refId}` : 'Employee');

      const candEmail = r.candidateEmail || r.candidate_email || '';
      const candPhone = r.candidatePhone || r.candidate_phone || '';
      const candPos = r.candidatePosition || r.candidate_position || 'Open Role';
      const refEmail = r.referrerEmail || r.referrer_email || '';
      const rewardAmt = r.referralRewardAmount || r.referral_reward_amount || null;
      const resumeUrl = r.candidateResumeUrl || r.candidate_resume_url || r.resumeUrl || r.resume_url || null;

      const statusVal = r.status || r.referralStatus || r.referral_status || 'submitted';

      return {
        ...r,
        id: r.id,
        candidate_id: candId,
        candidateId: candId,
        candidate_name: candName,
        candidateName: candName,
        candidate_email: candEmail,
        candidateEmail: candEmail,
        candidate_phone: candPhone,
        candidatePhone: candPhone,
        candidate_resume_url: resumeUrl,
        candidateResumeUrl: resumeUrl,
        resume_url: resumeUrl,
        resumeUrl: resumeUrl,
        position_title: candPos,
        positionTitle: candPos,
        referrer_employee_id: refId,
        referrerEmployeeId: refId,
        referrer_name: refName,
        referrerName: refName,
        referrer_email: refEmail,
        referrerEmail: refEmail,
        referral_reward_amount: rewardAmt,
        referralRewardAmount: rewardAmt,
        status: statusVal,
        referral_status: statusVal,
        referralStatus: statusVal,
        reward_status: r.rewardStatus || r.reward_status || 'pending',
        rewardStatus: r.rewardStatus || r.reward_status || 'pending',
        created_at: r.createdAt || r.created_at,
        createdAt: r.createdAt || r.created_at,
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
