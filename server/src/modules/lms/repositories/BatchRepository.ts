import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import type { LmsBatch } from '../types/lms.types';

export class BatchRepository extends BaseRepository<LmsBatch> {
  constructor() {
    super('lms_batches');
    this.companyScoped = true;
  }

  async listWithCourseInfo(
    ctx: TenantContext,
    filters?: { courseId?: number; status?: string; search?: string }
  ) {
    const query = this.query(ctx)
      .leftJoin('lms_courses', 'lms_courses.id', 'lms_batches.course_id')
      .whereNull('lms_batches.deleted_at')
      .select(
        'lms_batches.*',
        'lms_courses.title as course_title'
      )
      .orderBy('lms_batches.start_date', 'asc');

    if (filters?.courseId) {
      query.where('lms_batches.course_id', filters.courseId);
    }
    if (filters?.status) {
      query.where('lms_batches.status', filters.status);
    }
    if (filters?.search) {
      query.where((builder) => {
        builder.where('lms_batches.title', 'like', `%${filters.search}%`)
               .orWhere('lms_batches.trainer_name', 'like', `%${filters.search}%`);
      });
    }

    return query;
  }

  async incrementSeatsFilled(ctx: TenantContext, batchId: number) {
    return this.query(ctx)
      .where('id', batchId)
      .increment('seats_filled', 1);
  }
}

export const batchRepository = new BatchRepository();
