import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import type { LmsEnrollment } from '../types/lms.types';

export class EnrollmentRepository extends BaseRepository<LmsEnrollment> {
  constructor() {
    super('lms_enrollments');
  }

  async listWithDetails(
    ctx: TenantContext,
    filters?: {
      employeeId?: number;
      employeeIds?: number[];
      courseId?: number;
      batchId?: number;
      status?: string;
      enrolledBy?: string;
      search?: string;
    }
  ) {
    const query = this.query(ctx)
      .leftJoin('employees', 'employees.id', 'lms_enrollments.employee_id')
      .leftJoin('users', 'users.id', 'lms_enrollments.employee_id')
      .leftJoin('departments', 'departments.id', 'employees.current_department_id')
      .leftJoin('lms_courses', 'lms_courses.id', 'lms_enrollments.course_id')
      .leftJoin('lms_batches', 'lms_batches.id', 'lms_enrollments.batch_id')
      .select(
        'lms_enrollments.*',
        this.db.raw(`
          NULLIF(TRIM(COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, ''))), ''),
            users.email
          )), '') as employee_name
        `),
        this.db.raw(`COALESCE(employees.employee_code, '') as employee_code`),
        'departments.name as department_name',
        'lms_courses.title as course_title',
        'lms_courses.thumbnail_url as course_thumbnail',
        'lms_courses.duration_hours as course_duration_hours',
        'lms_courses.type as course_type',
        'lms_batches.title as batch_title',
        'lms_batches.meeting_link as batch_meeting_link',
        'lms_batches.trainer_name as batch_trainer_name',
        'lms_batches.mode as batch_mode',
        'lms_batches.start_date as batch_start_date',
        'lms_batches.end_date as batch_end_date',
        'lms_batches.schedule_time as batch_schedule_time',
        'lms_batches.schedule_days as batch_schedule_days',
        'lms_batches.today_session_time as batch_today_session_time',
        'lms_batches.session_notice as batch_session_notice'
      )
      .orderBy('lms_enrollments.created_at', 'desc');

    if (filters?.employeeId) {
      query.where('lms_enrollments.employee_id', filters.employeeId);
    }
    if (filters?.employeeIds && filters.employeeIds.length > 0) {
      query.whereIn('lms_enrollments.employee_id', filters.employeeIds);
    }
    if (filters?.courseId) {
      query.where('lms_enrollments.course_id', filters.courseId);
    }
    if (filters?.batchId) {
      query.where('lms_enrollments.batch_id', filters.batchId);
    }
    if (filters?.status) {
      query.where('lms_enrollments.status', filters.status);
    }
    if (filters?.enrolledBy) {
      query.where('lms_enrollments.enrolled_by', filters.enrolledBy);
    }
    if (filters?.search) {
      query.where((builder) => {
        builder.where('employees.first_name', 'like', `%${filters.search}%`)
               .orWhere('employees.last_name', 'like', `%${filters.search}%`)
               .orWhere('employees.employee_code', 'like', `%${filters.search}%`)
               .orWhere('lms_courses.title', 'like', `%${filters.search}%`);
      });
    }

    return query;
  }

  async getEnrollment(ctx: TenantContext, employeeId: number, courseId: number) {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('course_id', courseId)
      .first();
  }
}

export const enrollmentRepository = new EnrollmentRepository();
