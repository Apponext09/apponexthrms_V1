import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Interview {
  id: number;
  uuid: string;
  organization_id: number;
  application_id: number;
  interview_type: 'phone' | 'video' | 'in_person';
  interview_round: number;
  scheduled_date: string;
  interview_duration_minutes: number | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  meeting_url: string | null;
  recording_url: string | null;
  feedback_submitted: boolean;
  interviewer_ids: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class InterviewRepository extends BaseRepository<Interview> {
  constructor() {
    super('interviews');
  }

  async getByApplication(ctx: TenantContext, applicationId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { application_id: applicationId },
    });
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  async getScheduled(ctx: TenantContext, options?: ListQueryOptions) {
    return this.getByStatus(ctx, 'scheduled', options);
  }

  async getByInterviewDate(
    ctx: TenantContext,
    startDate: string,
    endDate: string,
    options?: ListQueryOptions
  ) {
    const result = await this.list(ctx, options);
    // Filter in application layer
    return {
      ...result,
      items: result.items.filter(
        (item) => item.scheduled_date >= startDate && item.scheduled_date <= endDate
      ),
    };
  }

  async getByInterviewer(ctx: TenantContext, interviewerId: number, options?: ListQueryOptions) {
    const query = this.query(ctx)
      .leftJoin('applications', 'interviews.application_id', 'applications.id')
      .leftJoin('candidates', 'applications.candidate_id', 'candidates.id')
      .leftJoin('jobs', 'applications.job_id', 'jobs.id')
      .select([
        'interviews.*',
        this.db.raw("TRIM(CONCAT(candidates.first_name, ' ', COALESCE(candidates.last_name, ''))) as candidate_name"),
        'jobs.job_title as position_title'
      ]);

    const items = await query;

    // Filter in application layer (interviewer_ids is JSON)
    const filtered = items.filter((item) => {
      if (!item.interviewer_ids) return false;
      try {
        const ids = typeof item.interviewer_ids === 'string' 
          ? JSON.parse(item.interviewer_ids) 
          : item.interviewer_ids;
        return Array.isArray(ids) && ids.includes(interviewerId);
      } catch {
        return false;
      }
    });

    return {
      items: filtered,
      meta: {
        page: 1,
        pageSize: 100,
        total: filtered.length,
        hasMore: false,
        totalPages: 1
      }
    };
  }
}
