import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import type { LmsCertificate } from '../types/lms.types';

export class CertificateRepository extends BaseRepository<LmsCertificate> {
  constructor() {
    super('lms_certificates');
  }

  async listWithDetails(ctx: TenantContext, filters?: { employeeId?: number; courseId?: number }) {
    const query = this.query(ctx)
      .leftJoin('employees', 'employees.id', 'lms_certificates.employee_id')
      .leftJoin('lms_courses', 'lms_courses.id', 'lms_certificates.course_id')
      .select(
        'lms_certificates.*',
        this.db.raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as employee_name"),
        'employees.employee_code',
        'lms_courses.title as course_title',
        'lms_courses.thumbnail_url as course_thumbnail'
      )
      .orderBy('lms_certificates.issued_on', 'desc');

    if (filters?.employeeId) {
      query.where('lms_certificates.employee_id', filters.employeeId);
    }
    if (filters?.courseId) {
      query.where('lms_certificates.course_id', filters.courseId);
    }

    return query;
  }

  async getByNumber(ctx: TenantContext, certificateNumber: string) {
    return this.query(ctx)
      .leftJoin('employees', 'employees.id', 'lms_certificates.employee_id')
      .leftJoin('lms_courses', 'lms_courses.id', 'lms_certificates.course_id')
      .where('certificate_number', certificateNumber)
      .select(
        'lms_certificates.*',
        this.db.raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as employee_name"),
        'employees.employee_code',
        'lms_courses.title as course_title'
      )
      .first();
  }
}

export const certificateRepository = new CertificateRepository();
