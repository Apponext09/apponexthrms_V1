import { v4 as uuidv4 } from 'uuid';
import { AssessmentRepository, AssessmentAttemptRepository, type Assessment } from '../repositories/AssessmentRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface AssessmentResult {
  id: number;
  uuid: string;
  organization_id: number;
  attempt_id: number;
  question_number: number;
  answer_text: string | null;
  is_correct: boolean;
  score: number | null;
  created_at: string;
}

export class AssessmentService {
  private assessmentRepo: AssessmentRepository;
  private attemptRepo: AssessmentAttemptRepository;
  private applicationRepo: ApplicationRepository;

  constructor() {
    this.assessmentRepo = new AssessmentRepository();
    this.attemptRepo = new AssessmentAttemptRepository();
    this.applicationRepo = new ApplicationRepository();
  }

  async createAssessment(
    ctx: TenantContext,
    input: {
      assessmentName: string;
      assessmentType: string;
      durationMinutes: number;
      passingScore: number;
      description?: string;
    }
  ): Promise<Assessment> {
    return this.assessmentRepo.create(ctx, {
      uuid: uuidv4(),
      assessment_name: input.assessmentName,
      assessment_type: input.assessmentType,
      duration_minutes: input.durationMinutes,
      passing_score: input.passingScore,
      description: input.description || null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);
  }

  async assignAssessment(
    ctx: TenantContext,
    applicationId: number,
    assessmentId: number
  ): Promise<any> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    const assessment = await this.assessmentRepo.getById(ctx, assessmentId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    // Check if already assigned and in progress
    const existing = await this.attemptRepo.getByApplicationAndAssessment(ctx, applicationId, assessmentId);
    if (existing && existing.status === 'in_progress') {
      throw new ValidationError('Assessment already in progress for this candidate');
    }

    // Create new attempt
    const attemptNumber = existing ? existing.attempt_number + 1 : 1;
    const attempt = await this.attemptRepo.create(ctx, {
      uuid: uuidv4(),
      application_id: applicationId,
      assessment_id: assessmentId,
      attempt_number: attemptNumber,
      started_at: new Date().toISOString(),
      completed_at: null,
      score: null,
      status: 'in_progress',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Update application status
    await this.applicationRepo.update(ctx, applicationId, {
      application_status: 'assessment',
      updated_by: ctx.userId,
    } as any);

    return attempt;
  }

  async submitAssessmentResult(
    ctx: TenantContext,
    attemptId: number,
    input: {
      answers: Array<{
        questionNumber: number;
        answerText: string;
        isCorrect: boolean;
        score?: number;
      }>;
    }
  ): Promise<any> {
    const attempt = await this.attemptRepo.getById(ctx, attemptId);
    if (!attempt) {
      throw new NotFoundError('Assessment attempt not found');
    }

    if (attempt.status !== 'in_progress') {
      throw new ValidationError('Assessment is not in progress');
    }

    // Calculate total score
    let totalScore = 0;
    for (const answer of input.answers) {
      totalScore += answer.score || (answer.isCorrect ? 1 : 0);
    }

    // Get assessment to check passing score
    const assessment = await this.assessmentRepo.getById(ctx, attempt.assessment_id);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    const passed = totalScore >= assessment.passing_score;

    // Update attempt
    const updated = await this.attemptRepo.update(ctx, attemptId, {
      completed_at: new Date().toISOString(),
      score: totalScore,
      status: passed ? 'passed' : 'failed',
      updated_by: ctx.userId,
    } as any);

    return updated;
  }

  async evaluateAssessment(ctx: TenantContext, attemptId: number): Promise<any> {
    const attempt = await this.attemptRepo.getById(ctx, attemptId);
    if (!attempt) {
      throw new NotFoundError('Assessment attempt not found');
    }

    if (attempt.status === 'in_progress') {
      throw new ValidationError('Assessment is still in progress');
    }

    return attempt;
  }

  async getAssessment(ctx: TenantContext, assessmentId: number): Promise<Assessment> {
    const assessment = await this.assessmentRepo.getById(ctx, assessmentId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }
    return assessment;
  }

  async listAssessments(ctx: TenantContext, options?: ListQueryOptions) {
    return this.assessmentRepo.list(ctx, options);
  }

  async getAssessmentAttempts(
    ctx: TenantContext,
    applicationId: number,
    options?: ListQueryOptions
  ) {
    return this.attemptRepo.getByApplication(ctx, applicationId, options);
  }

  async deleteAssessment(ctx: TenantContext, assessmentId: number): Promise<void> {
    const assessment = await this.assessmentRepo.getById(ctx, assessmentId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    await this.assessmentRepo.delete(ctx, assessmentId);
  }
}
