import { InterviewRepository } from '../repositories/InterviewRepository';
import { AuditService } from '@/modules/audit/audit.service';
import { AppError } from '@/common/errors';
import type { TenantContext } from '@/db/types';
import { v4 as uuidv4 } from 'uuid';

export interface CreateInterviewInput {
  organizationId: number;
  applicantId: number;
  jobOpeningId: number;
  interviewType: string;
  interviewDate: Date | string;
  interviewerId: number;
  roundNumber?: number;
  createdBy: number;
}

export interface UpdateInterviewInput {
  interviewType?: string;
  interviewDate?: Date | string;
  interviewerId?: number;
  roundNumber?: number;
  updatedBy: number;
}

export interface SubmitFeedbackInput {
  feedback: string;
  rating: number;
  submittedBy: number;
}

export class InterviewService {
  private repo: InterviewRepository;
  private auditService: AuditService;

  constructor() {
    this.repo = new InterviewRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create new interview
   */
  async createInterview(input: CreateInterviewInput): Promise<any> {
    await this.validateInterviewInput(input);

    const ctx: TenantContext = {
      organizationId: input.organizationId,
      userId: input.createdBy,
      sessionUuid: uuidv4(),
    };

    const interviewDate = this.formatDateForMySQL(input.interviewDate);

    const interview = await this.repo.create(ctx, {
      uuid: uuidv4(),
      organization_id: input.organizationId,
      applicant_id: input.applicantId,
      job_opening_id: input.jobOpeningId,
      interview_type: input.interviewType,
      interview_date: interviewDate,
      interviewer_id: input.interviewerId,
      round_number: input.roundNumber || 1,
      status: 'scheduled',
      created_by: input.createdBy,
    } as any);

    // Log audit entry
    try {
      await this.auditService.log(ctx, {
        action: 'CREATE',
        entityType: 'INTERVIEW',
        entityId: interview.id,
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }

    return interview;
  }

  /**
   * Get interview by ID
   */
  async getInterviewById(interviewId: number, organizationId: number): Promise<any> {
    const ctx: TenantContext = {
      organizationId,
      userId: 0,
      sessionUuid: uuidv4(),
    };

    try {
      const interview = await this.repo.getById(ctx, interviewId);
      if (!interview) {
        throw new AppError('Interview not found', 404);
      }
      return interview;
    } catch (error) {
      console.error('[Interview.getById]', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Get interviews for an applicant
   */
  async getInterviewsByApplicant(
    applicantId: number,
    organizationId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const ctx: TenantContext = {
      organizationId,
      userId: 0,
      tenantId: `org_${organizationId}`,
    };

    return this.repo.getByApplicant(ctx, applicantId, limit, offset);
  }

  /**
   * List all interviews
   */
  async listInterviews(
    organizationId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const ctx: TenantContext = {
      organizationId,
      userId: 0,
      tenantId: `org_${organizationId}`,
    };

    return this.repo.getAll(ctx, limit, offset);
  }

  /**
   * Update interview
   */
  async updateInterview(
    interviewId: number,
    organizationId: number,
    input: any,
    userId: number
  ): Promise<any> {
    const ctx: TenantContext = {
      organizationId,
      userId,
      tenantId: `org_${organizationId}`,
    };

    await this.getInterviewById(interviewId, organizationId);

    const updates: any = {};
    if (input.roundNumber) updates.round_number = input.roundNumber;
    if (input.interviewType) updates.interview_type = input.interviewType;
    if (input.interviewDate) updates.interview_date = this.formatDateForMySQL(input.interviewDate);
    if (input.interviewerId) updates.interviewer_id = input.interviewerId;
    updates.updated_by = userId;

    await this.repo.update(ctx, interviewId, updates);
    return this.getInterviewById(interviewId, organizationId);
  }

  /**
   * Update interview status
   */
  async updateInterviewStatus(
    interviewId: number,
    organizationId: number,
    status: string,
    userId: number
  ): Promise<any> {
    const ctx: TenantContext = {
      organizationId,
      userId,
      tenantId: `org_${organizationId}`,
    };

    await this.getInterviewById(interviewId, organizationId);

    await this.repo.update(ctx, interviewId, {
      status,
      updated_by: userId,
    });

    return this.getInterviewById(interviewId, organizationId);
  }

  /**
   * Submit interview feedback
   */
  async submitFeedback(
    interviewId: number,
    organizationId: number,
    input: any,
    userId: number
  ): Promise<any> {
    await this.validateFeedbackInput(input);

    const ctx: TenantContext = {
      organizationId,
      userId,
      tenantId: `org_${organizationId}`,
    };

    await this.getInterviewById(interviewId, organizationId);

    await this.repo.update(ctx, interviewId, {
      feedback: input.feedback,
      rating: input.rating,
      status: 'completed',
      updated_by: userId,
    });

    return this.getInterviewById(interviewId, organizationId);
  }

  /**
   * Delete interview (soft delete)
   */
  async deleteInterview(
    interviewId: number,
    organizationId: number,
    userId: number
  ): Promise<void> {
    const ctx: TenantContext = {
      organizationId,
      userId,
      tenantId: `org_${organizationId}`,
    };

    await this.getInterviewById(interviewId, organizationId);
    await this.repo.delete(ctx, interviewId);

    try {
      await this.auditService.log(ctx, {
        action: 'DELETE',
        entityType: 'INTERVIEW',
        entityId: interviewId,
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * Private: Format date for MySQL
   */
  private formatDateForMySQL(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Private: Validate interview input
   */
  private async validateInterviewInput(input: CreateInterviewInput): Promise<void> {
    const validTypes = ['phone_screen', 'technical', 'hr', 'manager', 'final'];
    if (!validTypes.includes(input.interviewType)) {
      throw new AppError(`Invalid interview type: ${input.interviewType}`, 400);
    }

    if (!input.interviewDate) {
      throw new AppError('Interview date is required', 400);
    }

    const interviewDate = new Date(input.interviewDate);
    if (interviewDate < new Date()) {
      throw new AppError('Interview date must be in the future', 400);
    }

    if (input.roundNumber && input.roundNumber < 1) {
      throw new AppError('Round number must be at least 1', 400);
    }

    if (!input.applicantId || input.applicantId < 1) {
      throw new AppError('Valid applicant ID required', 400);
    }

    if (!input.jobOpeningId || input.jobOpeningId < 1) {
      throw new AppError('Valid job opening ID required', 400);
    }

    if (!input.interviewerId || input.interviewerId < 1) {
      throw new AppError('Valid interviewer ID required', 400);
    }
  }

  /**
   * Private: Validate feedback input
   */
  private async validateFeedbackInput(input: SubmitFeedbackInput): Promise<void> {
    if (!input.feedback || input.feedback.trim().length === 0) {
      throw new AppError('Feedback is required', 400);
    }

    if (input.feedback.length < 10) {
      throw new AppError('Feedback must be at least 10 characters', 400);
    }

    if (input.feedback.length > 65535) {
      throw new AppError('Feedback must not exceed 65535 characters', 400);
    }

    if (input.rating < 1 || input.rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }
  }
}
