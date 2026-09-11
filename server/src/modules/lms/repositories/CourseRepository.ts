import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import type { LmsCourse } from '../types/lms.types';

export class CourseRepository extends BaseRepository<LmsCourse> {
  constructor() {
    super('lms_courses');
    this.companyScoped = true;
  }

  protected getSearchableFields(): string[] {
    return ['title', 'description'];
  }

  async listCoursesWithStats(
    ctx: TenantContext,
    filters?: {
      categoryId?: number;
      status?: string;
      type?: string;
      isMandatory?: boolean;
      search?: string;
    }
  ) {
    const query = this.query(ctx)
      .leftJoin('lms_categories', 'lms_categories.id', 'lms_courses.category_id')
      .leftJoin('lms_modules', (join) => {
        join.on('lms_modules.course_id', '=', 'lms_courses.id')
            .andOnNull('lms_modules.deleted_at');
      })
      .leftJoin('lms_enrollments', 'lms_enrollments.course_id', 'lms_courses.id')
      .whereNull('lms_courses.deleted_at')
      .groupBy('lms_courses.id', 'lms_categories.name')
      .select(
        'lms_courses.*',
        'lms_categories.name as category_name',
        this.db.raw('COUNT(DISTINCT lms_modules.id) as module_count'),
        this.db.raw('COUNT(DISTINCT lms_enrollments.id) as enrolled_count'),
        this.db.raw('COUNT(DISTINCT CASE WHEN lms_enrollments.status = "completed" THEN lms_enrollments.id END) as completed_count')
      )
      .orderBy('lms_courses.created_at', 'desc');

    if (filters?.categoryId) {
      query.where('lms_courses.category_id', filters.categoryId);
    }
    if (filters?.status) {
      query.where('lms_courses.status', filters.status);
    }
    if (filters?.type) {
      query.where('lms_courses.type', filters.type);
    }
    if (filters?.isMandatory !== undefined) {
      query.where('lms_courses.is_mandatory', filters.isMandatory);
    }
    if (filters?.search) {
      query.where((builder) => {
        builder.where('lms_courses.title', 'like', `%${filters.search}%`)
               .orWhere('lms_courses.description', 'like', `%${filters.search}%`);
      });
    }

    return query;
  }

  async getCourseDetails(ctx: TenantContext, courseId: number) {
    const course = await this.query(ctx)
      .leftJoin('lms_categories', 'lms_categories.id', 'lms_courses.category_id')
      .where('lms_courses.id', courseId)
      .whereNull('lms_courses.deleted_at')
      .select('lms_courses.*', 'lms_categories.name as category_name')
      .first();

    return course || null;
  }
}

export const courseRepository = new CourseRepository();
