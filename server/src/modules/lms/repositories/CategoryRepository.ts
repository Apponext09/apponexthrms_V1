import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import type { LmsCategory } from '../types/lms.types';

export class CategoryRepository extends BaseRepository<LmsCategory> {
  constructor() {
    super('lms_categories');
    this.companyScoped = true;
  }

  protected getSearchableFields(): string[] {
    return ['name', 'description'];
  }

  async listWithCourseCount(ctx: TenantContext, options?: ListQueryOptions) {
    const query = this.query(ctx)
      .leftJoin('lms_courses', (join) => {
        join.on('lms_courses.category_id', '=', 'lms_categories.id')
            .andOnNull('lms_courses.deleted_at');
      })
      .whereNull('lms_categories.deleted_at')
      .groupBy('lms_categories.id')
      .select(
        'lms_categories.*',
        this.db.raw('COUNT(lms_courses.id) as course_count')
      )
      .orderBy('lms_categories.name', 'asc');

    if (options?.search) {
      query.where('lms_categories.name', 'like', `%${options.search}%`);
    }

    return query;
  }
}

export const categoryRepository = new CategoryRepository();
