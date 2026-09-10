import { BaseRepository } from '@/db/BaseRepository';
import type { TenantContext } from '@/db/types';

export interface Interview {
  id: number;
  uuid: string;
  organization_id: number;
  applicant_id: number;
  job_opening_id: number;
  interview_type: string;
  round_number?: number;
  interviewer_id?: number;
  interview_date?: Date;
  duration_minutes?: number;
  feedback?: string;
  rating?: number;
  status: string;
  created_by: number;
  updated_by?: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export class InterviewRepository extends BaseRepository<Interview> {
  constructor() {
    super('interview_schedules');
  }

  /**
   * Get interviews for an applicant
   */
  async getByApplicant(
    ctx: TenantContext,
    applicantId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<Interview[]> {
    return this.query(ctx)
      .where('applicant_id', applicantId)
      .orderBy('round_number', 'asc')
      .orderBy('interview_date', 'asc')
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get all interviews for organization
   */
  async getAll(
    ctx: TenantContext,
    limit: number = 50,
    offset: number = 0
  ): Promise<Interview[]> {
    return this.query(ctx)
      .orderBy('interview_date', 'desc')
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get by status
   */
  async getByStatus(
    ctx: TenantContext,
    status: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Interview[]> {
    return this.query(ctx)
      .where('status', status)
      .orderBy('interview_date', 'desc')
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get interviews for an interviewer
   */
  async getByInterviewer(
    ctx: TenantContext,
    interviewerId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<Interview[]> {
    let q = this.query(ctx).where('interviewer_id', interviewerId);
    if (startDate) {
      q = q.where('interview_date', '>=', startDate);
    }
    if (endDate) {
      q = q.where('interview_date', '<=', endDate);
    }
    return q.orderBy('interview_date', 'asc');
  }

  /**
   * Count total interviews
   */
  async countForOrganization(ctx: TenantContext): Promise<number> {
    const result = await this.query(ctx).count('* as count').first();
    return result?.count || 0;
  }

  /**
   * Get allowed sort columns
   */
  protected getAllowedSortColumns(): string[] {
    return [
      'id',
      'applicant_id',
      'status',
      'interview_date',
      'created_at',
      'round_number',
      'rating',
    ];
  }
}
