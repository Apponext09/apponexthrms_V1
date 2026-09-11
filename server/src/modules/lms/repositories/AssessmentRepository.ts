import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import type { LmsAssessment } from '../types/lms.types';

export class AssessmentRepository extends BaseRepository<LmsAssessment> {
  constructor() {
    super('lms_assessments');
  }

  async getByCourseId(ctx: TenantContext, courseId: number) {
    return this.query(ctx)
      .where('course_id', courseId)
      .where('is_active', true)
      .first();
  }
}

export const assessmentRepository = new AssessmentRepository();
