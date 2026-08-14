import { v4 as uuidv4 } from 'uuid';
import { ReferralRepository, type Referral } from '../repositories/ReferralRepository';
import { CandidateRepository } from '../repositories/CandidateRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface ReferralReward {
  id: number;
  uuid: string;
  organization_id: number;
  referral_id: number;
  reward_amount: number;
  reward_type: string;
  status: 'pending' | 'paid' | 'forfeited';
  paid_date: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ReferralService {
  private referralRepo: ReferralRepository;
  private candidateRepo: CandidateRepository;
  private applicationRepo: ApplicationRepository;
  private auditService: AuditService;

  constructor() {
    this.referralRepo = new ReferralRepository();
    this.candidateRepo = new CandidateRepository();
    this.applicationRepo = new ApplicationRepository();
    this.auditService = new AuditService();
  }

  async createReferral(
    ctx: TenantContext,
    input: {
      employeeId: number;
      candidateId: number;
      referralRewardAmount?: number;
    }
  ): Promise<Referral> {
    const candidate = await this.candidateRepo.getById(ctx, input.candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const referral = await this.referralRepo.create(ctx, {
      uuid: uuidv4(),
      referrer_employee_id: input.employeeId,
      candidate_id: input.candidateId,
      application_id: null,
      referral_date: new Date().toISOString().split('T')[0],
      referral_reward_amount: input.referralRewardAmount || null,
      referral_status: 'pending',
      hired_date: null,
      reward_status: 'pending',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'REFERRAL',
      entityId: referral.id,
      afterState: {
        employeeId: input.employeeId,
        candidateId: input.candidateId,
      },
    });

    return referral;
  }

  async linkApplicationToReferral(
    ctx: TenantContext,
    referralId: number,
    applicationId: number
  ): Promise<Referral> {
    const referral = await this.referralRepo.getById(ctx, referralId);
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }

    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    return this.referralRepo.update(ctx, referralId, {
      application_id: applicationId,
      updated_by: ctx.userId,
    } as any);
  }

  async markReferralAsHired(ctx: TenantContext, referralId: number): Promise<Referral> {
    const referral = await this.referralRepo.getById(ctx, referralId);
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }

    return this.referralRepo.update(ctx, referralId, {
      referral_status: 'hired',
      hired_date: new Date().toISOString().split('T')[0],
      reward_status: 'pending',
      updated_by: ctx.userId,
    } as any);
  }

  async rewardReferral(
    ctx: TenantContext,
    referralId: number,
    input: {
      rewardAmount: number;
      rewardType: string;
    }
  ): Promise<any> {
    const referral = await this.referralRepo.getById(ctx, referralId);
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }

    if (referral.referral_status !== 'hired') {
      throw new ValidationError('Can only reward hired referrals');
    }

    // In reality, this would create a ReferralReward record
    // For now, we'll just update the referral
    const updated = await this.referralRepo.update(ctx, referralId, {
      reward_status: 'paid',
      referral_reward_amount: input.rewardAmount,
      updated_by: ctx.userId,
    } as any);

    return updated;
  }

  async getReferral(ctx: TenantContext, referralId: number): Promise<Referral> {
    const referral = await this.referralRepo.getById(ctx, referralId);
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }
    return referral;
  }

  async listReferrals(ctx: TenantContext, options?: ListQueryOptions) {
    return this.referralRepo.list(ctx, options);
  }

  async getEmployeeReferrals(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.referralRepo.getByEmployee(ctx, employeeId, options);
  }

  async getHiredReferrals(ctx: TenantContext, options?: ListQueryOptions) {
    return this.referralRepo.getHired(ctx, options);
  }

  async trackReferralProgress(ctx: TenantContext, referralId: number): Promise<any> {
    const referral = await this.referralRepo.getById(ctx, referralId) as any;
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }

    // Get associated application if any
    let applicationStatus = null;
    const appId = referral.applicationId || (referral as any).application_id;
    if (appId) {
      const application = await this.applicationRepo.getById(ctx, appId);
      if (application) {
        applicationStatus = application.application_status;
      }
    }

    return {
      referral,
      applicationStatus,
      progress: {
        referralStatus: referral.referral_status,
        rewardStatus: referral.reward_status,
        hiredDate: referral.hired_date,
      },
    };
  }

  async deleteReferral(ctx: TenantContext, referralId: number): Promise<void> {
    const referral = await this.referralRepo.getById(ctx, referralId);
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }

    await this.referralRepo.delete(ctx, referralId);
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'REFERRAL',
      entityId: referralId,
    });
  }
}
