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

  async submitReferral(
    ctx: TenantContext,
    input: {
      employeeId?: number;
      candidateId?: number;
      candidateName?: string;
      candidateEmail?: string;
      candidatePhone?: string;
      positionTitle?: string;
      referralRewardAmount?: number;
    }
  ): Promise<any> {
    let candidateId = input.candidateId;
    let employeeId = input.employeeId;

    if (!employeeId && ctx.userId) {
      const user = await this.referralRepo.db('users').where('id', ctx.userId).first();
      const userEmpId = user?.employee_id || user?.employeeId;
      if (userEmpId) {
        employeeId = userEmpId;
      } else {
        const emp = await this.referralRepo.db('employees')
          .where('organization_id', ctx.organizationId)
          .where((b) => b.where('id', ctx.userId).orWhere('email', user?.email || ''))
          .first();
        employeeId = emp?.id || ctx.userId;
      }
    }

    if (!candidateId && (input.candidateName || input.candidateEmail)) {
      const nameParts = (input.candidateName || '').trim().split(' ');
      const firstName = nameParts[0] || 'Referral';
      const lastName = nameParts.slice(1).join(' ') || 'Candidate';
      const email = input.candidateEmail || `referral_${Date.now()}@example.com`;

      let existingCand = await this.candidateRepo.db('candidates')
        .where('organization_id', ctx.organizationId)
        .where('email', email)
        .whereNull('deleted_at')
        .first();

      if (existingCand) {
        candidateId = existingCand.id;
      } else {
        const [newId] = await this.candidateRepo.db('candidates').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: input.candidatePhone || null,
          current_company: input.positionTitle || null,
          status: 'applied',
          source: 'employee_referral',
          created_by: ctx.userId || 1,
          updated_by: ctx.userId || 1,
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
        candidateId = newId;
      }
    }

    if (!candidateId) {
      throw new ValidationError('Candidate ID or candidate details (name, email) are required');
    }

    if (!employeeId) {
      throw new ValidationError('Referrer employee ID is required');
    }

    const [refId] = await this.referralRepo.db('referrals').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      referrer_employee_id: employeeId,
      candidate_id: candidateId,
      referral_date: new Date().toISOString().substring(0, 10),
      referral_reward_amount: input.referralRewardAmount || null,
      referral_status: 'pending',
      status: 'submitted',
      reward_status: 'pending',
      created_by: ctx.userId || 1,
      updated_by: ctx.userId || 1,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });

    return this.referralRepo.getById(ctx, refId);
  }

  async listReferrals(ctx: TenantContext, options?: ListQueryOptions) {
    const items = await this.referralRepo.listEnriched(ctx);
    return {
      items,
      data: items,
      meta: {
        page: options?.page || 1,
        pageSize: options?.pageSize || 20,
        totalItems: items.length,
        totalPages: Math.ceil(items.length / (options?.pageSize || 20)) || 1,
      }
    };
  }

  async getEmployeeReferrals(ctx: TenantContext, employeeId: number) {
    const items = await this.referralRepo.listEnriched(ctx, { referrerEmployeeId: employeeId });
    return {
      items,
      data: items,
    };
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
