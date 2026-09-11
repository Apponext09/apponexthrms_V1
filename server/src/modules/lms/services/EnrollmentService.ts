import type { TenantContext } from '../../../db/types';
import type { BulkEnrollInput } from '../types/lms.types';
import { enrollmentRepository } from '../repositories/EnrollmentRepository';
import { batchRepository } from '../repositories/BatchRepository';
import { moduleRepository } from '../repositories/ModuleRepository';
import { assessmentRepository } from '../repositories/AssessmentRepository';
import { certificateService } from './CertificateService';

export class EnrollmentService {
  async getEnrollments(ctx: TenantContext, filters?: any) {
    return enrollmentRepository.listWithDetails(ctx, filters);
  }

  async getEnrollmentById(ctx: TenantContext, id: number) {
    return enrollmentRepository.getById(ctx, id);
  }

  async enroll(ctx: TenantContext, data: any) {
    const existing = await enrollmentRepository.getEnrollment(ctx, data.employeeId, data.courseId);
    if (existing) {
      if (existing.status === 'dropped') {
        // Re-enroll
        return enrollmentRepository.update(ctx, existing.id, {
          status: 'enrolled',
          batch_id: data.batchId || existing.batch_id,
        });
      }
      return existing;
    }

    if (data.batchId) {
      await batchRepository.incrementSeatsFilled(ctx, data.batchId);
    }

    const enrollment = await enrollmentRepository.create(ctx, {
      organization_id: ctx.organizationId,
      employee_id: data.employeeId,
      course_id: data.courseId,
      batch_id: data.batchId || null,
      enrolled_by: data.enrolledBy || 'self',
      enrolled_by_employee_id: data.enrolledByEmployeeId || null,
      status: 'enrolled',
      progress_pct: 0,
      completed_modules: JSON.stringify([]),
      enrolled_on: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    return enrollment;
  }

  async bulkEnroll(ctx: TenantContext, data: BulkEnrollInput | { courseId: number; batchId?: number | null; employeeIds: number[]; enrolledBy?: 'admin' | 'manager' | 'self' }) {
    const results = [];
    for (const employeeId of data.employeeIds) {
      const res = await this.enroll(ctx, {
        employeeId,
        courseId: data.courseId,
        batchId: data.batchId,
        enrolledBy: data.enrolledBy,
      });
      results.push(res);
    }
    return results;
  }

  async updateProgress(ctx: TenantContext, enrollmentId: number, data: { progressPct?: number; completedModuleId?: number; status?: string }) {
    const enrollment: any = await enrollmentRepository.getById(ctx, enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const courseId = Number(enrollment.courseId || enrollment.course_id);
    const employeeId = Number(enrollment.employeeId || enrollment.employee_id);

    let completedModules: number[] = [];
    const rawCompleted = enrollment.completedModules ?? enrollment.completed_modules;
    if (rawCompleted) {
      try {
        completedModules = typeof rawCompleted === 'string' ? JSON.parse(rawCompleted) : rawCompleted;
        if (!Array.isArray(completedModules)) completedModules = [];
      } catch {
        completedModules = [];
      }
    }

    if (data.completedModuleId && !completedModules.includes(data.completedModuleId)) {
      completedModules.push(data.completedModuleId);
    }

    // Auto calculate progress percentage based on completed modules count vs total course modules
    const courseModules = await moduleRepository.getByCourseId(ctx, courseId);
    let progressPct = data.progressPct !== undefined ? data.progressPct : (enrollment.progressPct ?? enrollment.progress_pct ?? 0);
    if (courseModules.length > 0) {
      progressPct = Math.min(100, Math.round((completedModules.length / courseModules.length) * 100));
    }

    let status = data.status || enrollment.status || 'enrolled';
    let completedOn = enrollment.completedOn || enrollment.completed_on || null;

    if (progressPct > 0 && status === 'enrolled') {
      status = 'in_progress';
    }

    // Check if 100% completed
    if (progressPct >= 100) {
      // Check if course has an assessment
      const assessment = await assessmentRepository.getByCourseId(ctx, courseId);
      if (assessment) {
        // If course requires an assessment, status stays in_progress until assessment is passed
        const passMark = Number(assessment.passPercentage || (assessment as any).pass_percentage || 60);
        const currentScore = Number(enrollment.score ?? 0);
        if (currentScore >= passMark) {
          status = 'completed';
          completedOn = completedOn || new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
      } else {
        // No assessment required: auto mark completed and issue certificate
        status = 'completed';
        completedOn = new Date().toISOString().slice(0, 19).replace('T', ' ');
        try {
          await certificateService.issueCertificate(ctx, {
            employeeId,
            courseId,
            enrollmentId: enrollment.id,
            score: 100,
          });
        } catch (e) {
          console.error('[Certificate auto-issue warning]', e);
        }
      }
    }

    return enrollmentRepository.update(ctx, enrollmentId, {
      progress_pct: progressPct,
      completed_modules: JSON.stringify(completedModules),
      status,
      completed_on: completedOn,
    });
  }

  async dropEnrollment(ctx: TenantContext, enrollmentId: number) {
    return enrollmentRepository.update(ctx, enrollmentId, {
      status: 'dropped',
    });
  }
}

export const enrollmentService = new EnrollmentService();
