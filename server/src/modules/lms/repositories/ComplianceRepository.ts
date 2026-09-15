import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import type { LmsCompliance } from '../types/lms.types';

export class ComplianceRepository extends BaseRepository<LmsCompliance> {
  constructor() {
    super('lms_compliance');
  }

  async listWithDetails(ctx: TenantContext) {
    return this.query(ctx)
      .leftJoin('lms_courses', 'lms_courses.id', 'lms_compliance.course_id')
      .leftJoin('departments', 'departments.id', 'lms_compliance.department_id')
      .leftJoin('designations', 'designations.id', 'lms_compliance.designation_id')
      .select(
        'lms_compliance.*',
        'lms_courses.title as course_title',
        'departments.name as department_name',
        'designations.name as designation_name'
      )
      .orderBy('lms_compliance.created_at', 'desc');
  }
}

export const complianceRepository = new ComplianceRepository();
