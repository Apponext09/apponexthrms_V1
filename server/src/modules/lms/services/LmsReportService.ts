import type { TenantContext } from '../../../db/types';
import { getKnex } from '../../../db/knex';

export class LmsReportService {
  async getDashboardAnalytics(ctx: TenantContext) {
    const db = getKnex();

    // 1. Total Courses & Active
    const coursesStats = await db('lms_courses')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .select(
        db.raw('COUNT(id) as total_courses'),
        db.raw('COUNT(CASE WHEN status = "published" THEN 1 END) as active_courses')
      )
      .first();

    // 2. Enrollments Stats
    const enrollmentStats = await db('lms_enrollments')
      .where('organization_id', ctx.organizationId)
      .select(
        db.raw('COUNT(id) as total_enrollments'),
        db.raw('COUNT(CASE WHEN status = "completed" THEN 1 END) as completed_enrollments'),
        db.raw('COUNT(CASE WHEN status = "in_progress" THEN 1 END) as in_progress_enrollments'),
        db.raw('COUNT(CASE WHEN status = "enrolled" THEN 1 END) as not_started_enrollments'),
        db.raw('AVG(progress_pct) as avg_progress'),
        db.raw('AVG(score) as avg_score')
      )
      .first();

    const totalEnrollments = Number(enrollmentStats?.totalEnrollments ?? enrollmentStats?.total_enrollments ?? 0);
    const completedEnrollments = Number(enrollmentStats?.completedEnrollments ?? enrollmentStats?.completed_enrollments ?? 0);
    const completionRate = totalEnrollments > 0 ? Number(((completedEnrollments / totalEnrollments) * 100).toFixed(1)) : 0;

    // 3. Total Learning Hours delivered
    const hoursResult = await db('lms_enrollments')
      .join('lms_courses', 'lms_courses.id', 'lms_enrollments.course_id')
      .where('lms_enrollments.organization_id', ctx.organizationId)
      .where('lms_enrollments.status', 'completed')
      .sum('lms_courses.duration_hours as total_hours')
      .first();

    const totalLearningHours = Number(hoursResult?.totalHours ?? hoursResult?.total_hours ?? 0);

    // 4. Top 5 Popular Courses
    const topCourses = await db('lms_courses')
      .leftJoin('lms_enrollments', 'lms_enrollments.course_id', 'lms_courses.id')
      .where('lms_courses.organization_id', ctx.organizationId)
      .whereNull('lms_courses.deleted_at')
      .groupBy('lms_courses.id', 'lms_courses.title', 'lms_courses.thumbnail_url', 'lms_courses.duration_hours')
      .select(
        'lms_courses.id',
        'lms_courses.title',
        'lms_courses.thumbnail_url',
        'lms_courses.duration_hours',
        db.raw('COUNT(lms_enrollments.id) as enrollments_count'),
        db.raw('COUNT(CASE WHEN lms_enrollments.status = "completed" THEN 1 END) as completions_count')
      )
      .orderBy('enrollments_count', 'desc')
      .limit(5);

    // 5. Department Completion Breakdown
    const departmentStats = await db('departments')
      .leftJoin('employees', 'employees.current_department_id', 'departments.id')
      .leftJoin('lms_enrollments', 'lms_enrollments.employee_id', 'employees.id')
      .where('departments.organization_id', ctx.organizationId)
      .groupBy('departments.id', 'departments.name')
      .select(
        'departments.id as department_id',
        'departments.name as department_name',
        db.raw('COUNT(DISTINCT employees.id) as total_employees'),
        db.raw('COUNT(lms_enrollments.id) as total_enrollments'),
        db.raw('COUNT(CASE WHEN lms_enrollments.status = "completed" THEN 1 END) as completed_enrollments'),
        db.raw('AVG(lms_enrollments.progress_pct) as avg_progress')
      )
      .orderBy('total_enrollments', 'desc');

    // 6. Recent Certificates Issued
    const recentCertificates = await db('lms_certificates')
      .join('employees', 'employees.id', 'lms_certificates.employee_id')
      .join('lms_courses', 'lms_courses.id', 'lms_certificates.course_id')
      .where('lms_certificates.organization_id', ctx.organizationId)
      .select(
        'lms_certificates.id',
        'lms_certificates.certificate_number',
        'lms_certificates.issued_on',
        'lms_certificates.score',
        db.raw("CONCAT(COALESCE(employees.first_name, ''), ' ', COALESCE(employees.last_name, '')) as employee_name"),
        'lms_courses.title as course_title'
      )
      .orderBy('lms_certificates.issued_on', 'desc')
      .limit(10);

    return {
      kpis: {
        totalCourses: Number(coursesStats?.totalCourses ?? coursesStats?.total_courses ?? 0),
        activeCourses: Number(coursesStats?.activeCourses ?? coursesStats?.active_courses ?? 0),
        totalEnrollments,
        completedEnrollments,
        inProgressEnrollments: Number(enrollmentStats?.inProgressEnrollments ?? enrollmentStats?.in_progress_enrollments ?? 0),
        notStartedEnrollments: Number(enrollmentStats?.notStartedEnrollments ?? enrollmentStats?.not_started_enrollments ?? 0),
        completionRate,
        avgProgress: Number(Number(enrollmentStats?.avgProgress ?? enrollmentStats?.avg_progress ?? 0).toFixed(1)),
        avgScore: Number(Number(enrollmentStats?.avgScore ?? enrollmentStats?.avg_score ?? 0).toFixed(1)),
        totalLearningHours,
      },
      topCourses,
      departmentStats,
      recentCertificates,
    };
  }
}

export const lmsReportService = new LmsReportService();
