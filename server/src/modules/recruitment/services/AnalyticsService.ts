import { JobRepository } from '../repositories/JobRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { CandidateRepository } from '../repositories/CandidateRepository';
import { OfferRepository } from '../repositories/OfferRepository';
import { ReferralRepository } from '../repositories/ReferralRepository';
import type { TenantContext } from '../../../db/types';

export class AnalyticsService {
  private jobRepo: JobRepository;
  private applicationRepo: ApplicationRepository;
  private candidateRepo: CandidateRepository;
  private offerRepo: OfferRepository;
  private referralRepo: ReferralRepository;

  constructor() {
    this.jobRepo = new JobRepository();
    this.applicationRepo = new ApplicationRepository();
    this.candidateRepo = new CandidateRepository();
    this.offerRepo = new OfferRepository();
    this.referralRepo = new ReferralRepository();
  }

  async calculateTimeToHire(ctx: TenantContext, jobId?: number): Promise<number> {
    // Get all hired applications
    const allApplications = await this.applicationRepo.list(ctx);
    const hiredApplications = allApplications.items.filter((a) => a.application_status === 'hired');

    if (hiredApplications.length === 0) return 0;

    let targetApplications = hiredApplications;
    if (jobId) {
      targetApplications = hiredApplications.filter((a) => a.job_id === jobId);
    }

    if (targetApplications.length === 0) return 0;

    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    let totalDays = 0;
    for (const app of targetApplications) {
      const appliedDate = new Date(app.applied_at);
      
      const offer = await db('offers')
        .where('application_id', app.id)
        .where('status', 'accepted')
        .first();

      const endHireDate = offer && offer.accepted_at ? new Date(offer.accepted_at) : new Date();
      const days = Math.floor((endHireDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
      totalDays += Math.max(0, days);
    }

    return Math.round(totalDays / targetApplications.length);
  }

  async calculateTimeToFill(ctx: TenantContext, jobId: number): Promise<number> {
    const job = await this.jobRepo.getById(ctx, jobId);
    if (!job || !job.published_at) return 0;

    const publishedDate = new Date(job.published_at);
    const closedDate = job.closed_at ? new Date(job.closed_at) : new Date();
    const days = Math.floor((closedDate.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

    return days;
  }

  async calculateCostPerHire(ctx: TenantContext): Promise<number> {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    // Query total referral rewards paid
    const referralRewardsRes = await db('referrals')
      .where({ organization_id: ctx.organizationId, reward_status: 'paid' })
      .sum('referral_reward_amount as total');
    const totalReferralRewards = parseFloat(referralRewardsRes[0]?.total || '0');

    // Query job postings budget / advertising cost estimate from MRFs
    const mrfBudgetRes = await db('mrf_requests')
      .where({ organization_id: ctx.organizationId, stage: 'Approved' })
      .sum('pay_scale_for_position as total');
    
    // Assumed advertising / onboarding tooling cost = 5% of MRF monthly scale
    const toolingAndAdBudget = parseFloat(mrfBudgetRes[0]?.total || '0') * 0.05;

    // Get count of hired candidates
    const hiredCountRes = await db('applications')
      .where({ organization_id: ctx.organizationId, application_status: 'hired' })
      .count('id as count')
      .first();
    const hiredCount = Number(hiredCountRes?.count || 0);

    if (hiredCount === 0) {
      return 0;
    }

    const totalCost = totalReferralRewards + toolingAndAdBudget;
    return Math.round(totalCost / hiredCount);
  }


  async getSourceEffectiveness(ctx: TenantContext): Promise<Record<string, any>> {
    const allApplications = await this.applicationRepo.list(ctx, { pageSize: 10000 });
    const allCandidates = await this.candidateRepo.list(ctx, { pageSize: 10000 });

    const sourceStats: Record<string, any> = {};

    for (const candidate of allCandidates.items) {
      const source = candidate.source;
      if (!sourceStats[source]) {
        sourceStats[source] = {
          source,
          totalCandidates: 0,
          appliedCount: 0,
          hiredCount: 0,
          rejectedCount: 0,
        };
      }

      sourceStats[source].totalCandidates++;

      const candidateApps = allApplications.items.filter((a) => a.candidate_id === candidate.id);
      sourceStats[source].appliedCount += candidateApps.length;
      sourceStats[source].hiredCount += candidateApps.filter((a) => a.application_status === 'hired').length;
      sourceStats[source].rejectedCount += candidateApps.filter((a) => a.application_status === 'rejected')
        .length;
    }

    return sourceStats;
  }

  async getRecruiterPerformance(ctx: TenantContext, recruiterId: number): Promise<any> {
    const allApplications = await this.applicationRepo.list(ctx, { pageSize: 10000 });
    const recruiterApps = allApplications.items.filter((a) => a.created_by === recruiterId);

    const stats = {
      recruiterId,
      totalApplicationsCreated: recruiterApps.length,
      hiredCount: recruiterApps.filter((a) => a.application_status === 'hired').length,
      rejectedCount: recruiterApps.filter((a) => a.application_status === 'rejected').length,
      hireRate: 0,
    };

    if (recruiterApps.length > 0) {
      stats.hireRate = Math.round((stats.hiredCount / recruiterApps.length) * 100);
    }

    return stats;
  }

  async generateHiringFunnel(ctx: TenantContext): Promise<any> {
    const allApplications = await this.applicationRepo.list(ctx, { pageSize: 10000 });
    const allCandidates = await this.candidateRepo.list(ctx, { pageSize: 10000 });

    const getStatus = (item: any) => String(item.application_status || item.status || '').toLowerCase().trim();

    const appStatuses = allApplications.items.map(getStatus);
    const candStatuses = allCandidates.items.map(getStatus);
    const combined = [...appStatuses, ...candStatuses];

    const countStage = (keys: string[]) => combined.filter(s => keys.includes(s)).length;

    const applied = countStage(['applied', 'new']);
    const screening = countStage(['screening', 'shortlisted']);
    const assessment = countStage(['assessment', 'evaluated']);
    const interview = countStage(['interview', 'interviewed', 'scheduled']);
    const offer = countStage(['offer', 'offered']);
    const hired = countStage(['hired', 'joined']);
    const rejected = countStage(['rejected', 'withdrawn']);

    return {
      applied: Math.max(applied, 1),
      screening: Math.max(screening, 0),
      assessment: Math.max(assessment, 0),
      interview: Math.max(interview, 0),
      offer: Math.max(offer, 0),
      hired: Math.max(hired, 0),
      rejected: Math.max(rejected, 0),
    };
  }

  async getConversionRates(ctx: TenantContext): Promise<any> {
    const funnel = await this.generateHiringFunnel(ctx);

    return {
      appliedToScreening: funnel.applied > 0 ? Math.round((funnel.screening / funnel.applied) * 100) : 0,
      screeningToInterview:
        funnel.screening > 0 ? Math.round((funnel.interview / funnel.screening) * 100) : 0,
      interviewToOffer: funnel.interview > 0 ? Math.round((funnel.offer / funnel.interview) * 100) : 0,
      offerToHired: funnel.offer > 0 ? Math.round((funnel.hired / funnel.offer) * 100) : 0,
      appliedToHired: funnel.applied > 0 ? Math.round((funnel.hired / funnel.applied) * 100) : 0,
    };
  }

  async getJobAnalytics(ctx: TenantContext, jobId: number): Promise<any> {
    const job = await this.jobRepo.getById(ctx, jobId);
    if (!job) return null;

    const applications = await this.applicationRepo.getByJob(ctx, jobId, { pageSize: 10000 });
    const timeToFill = await this.calculateTimeToFill(ctx, jobId);

    return {
      jobId,
      jobTitle: job.job_title,
      jobCode: job.job_code,
      totalApplications: applications.meta.total,
      appliedCount: applications.items.filter((a) => a.application_status === 'applied').length,
      screeningCount: applications.items.filter((a) => a.application_status === 'screening').length,
      interviewCount: applications.items.filter((a) => a.application_status === 'interview').length,
      offerCount: applications.items.filter((a) => a.application_status === 'offer').length,
      hiredCount: applications.items.filter((a) => a.application_status === 'hired').length,
      rejectedCount: applications.items.filter((a) => a.application_status === 'rejected').length,
      timeToFill,
      positionsNeeded: job.no_of_positions,
    };
  }

  async getDashboardMetrics(ctx: TenantContext): Promise<any> {
    const funnel = await this.generateHiringFunnel(ctx);
    const conversions = await this.getConversionRates(ctx);
    const source = await this.getSourceEffectiveness(ctx);
    const timeToHire = await this.calculateTimeToHire(ctx);

    return {
      funnel,
      conversions,
      sourceMetrics: source,
      timeToHire,
      dropOff: await this.getDropOffAnalysis(ctx),
      timestamp: new Date().toISOString(),
    };
  }

  async getDropOffAnalysis(ctx: TenantContext): Promise<any> {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const rejections = await db('applications')
      .where('organization_id', ctx.organizationId)
      .where('application_status', 'rejected')
      .select('rejected_at_stage')
      .count('* as count')
      .groupBy('rejected_at_stage');

    const dropOffStats: Record<string, number> = {
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0
    };

    for (const row of rejections as any[]) {
      const stage = row.rejected_at_stage || 'applied';
      if (stage in dropOffStats) {
        dropOffStats[stage] = parseInt(row.count, 10);
      } else {
        dropOffStats[stage] = (dropOffStats[stage] || 0) + parseInt(row.count, 10);
      }
    }

    return dropOffStats;
  }
}
