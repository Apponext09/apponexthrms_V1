import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import type { LmsAssessmentAttempt } from '../types/lms.types';

export class AssessmentAttemptRepository extends BaseRepository<LmsAssessmentAttempt> {
  constructor() {
    super('lms_assessment_attempts');
  }

  async getAttemptsByEmployee(ctx: TenantContext, assessmentId: number, employeeId: number) {
    return this.query(ctx)
      .where('assessment_id', assessmentId)
      .where('employee_id', employeeId)
      .orderBy('attempt_number', 'asc');
  }

  async getAttemptCount(ctx: TenantContext, assessmentId: number, employeeId: number): Promise<number> {
    const result = await this.query(ctx)
      .where('assessment_id', assessmentId)
      .where('employee_id', employeeId)
      .count('id as count')
      .first();

    return Number((result as any)?.count || 0);
  }

  async getBestAttempt(ctx: TenantContext, assessmentId: number, employeeId: number) {
    return this.query(ctx)
      .where('assessment_id', assessmentId)
      .where('employee_id', employeeId)
      .orderBy('score', 'desc')
      .first();
  }
}

export const assessmentAttemptRepository = new AssessmentAttemptRepository();
