import type { TenantContext } from '../../../db/types';
import { assessmentRepository } from '../repositories/AssessmentRepository';
import { assessmentAttemptRepository } from '../repositories/AssessmentAttemptRepository';
import { enrollmentRepository } from '../repositories/EnrollmentRepository';
import { certificateService } from './CertificateService';

export class AssessmentService {
  async getByCourseId(ctx: TenantContext, courseId: number, sanitize: boolean = true) {
    const assessment = await assessmentRepository.getByCourseId(ctx, courseId);
    if (!assessment) return null;

    let questions = assessment.questions;
    if (typeof questions === 'string') {
      questions = JSON.parse(questions);
    }

    if (sanitize && Array.isArray(questions)) {
      // Remove correctIndex and explanation so employee cannot inspect answers
      questions = questions.map((q: any) => {
        const { correctIndex, explanation, ...safeQ } = q;
        return safeQ;
      });
    }

    return { ...assessment, questions };
  }

  async getAdminAssessment(ctx: TenantContext, courseId: number) {
    return this.getByCourseId(ctx, courseId, false);
  }

  async createAssessment(ctx: TenantContext, data: any) {
    return assessmentRepository.create(ctx, {
      course_id: data.courseId,
      title: data.title,
      description: data.description || null,
      pass_percentage: data.passPercentage || 60,
      attempt_limit: data.attemptLimit || 3,
      timer_seconds: data.timerSeconds || 1800,
      is_active: data.isActive !== undefined ? data.isActive : true,
      organization_id: ctx.organizationId,
      questions: typeof data.questions === 'string' ? data.questions : JSON.stringify(data.questions || []),
    });
  }

  async updateAssessment(ctx: TenantContext, id: number, data: any) {
    const payload: any = {};
    if (data.courseId !== undefined) payload.course_id = data.courseId;
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.passPercentage !== undefined) payload.pass_percentage = data.passPercentage;
    if (data.attemptLimit !== undefined) payload.attempt_limit = data.attemptLimit;
    if (data.timerSeconds !== undefined) payload.timer_seconds = data.timerSeconds;
    if (data.isActive !== undefined) payload.is_active = data.isActive;
    if (data.questions !== undefined) {
      payload.questions = typeof data.questions === 'string' ? data.questions : JSON.stringify(data.questions);
    }
    return assessmentRepository.update(ctx, id, payload);
  }

  async getAttempts(ctx: TenantContext, assessmentId: number, employeeId: number) {
    return assessmentAttemptRepository.getAttemptsByEmployee(ctx, assessmentId, employeeId);
  }

  async submitAssessment(
    ctx: TenantContext,
    data: {
      assessmentId: number;
      employeeId: number;
      enrollmentId?: number | null;
      answers: Record<string, number>;
    }
  ) {
    const assessment = await assessmentRepository.getById(ctx, data.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Check attempt limit
    const attemptCount = await assessmentAttemptRepository.getAttemptCount(ctx, data.assessmentId, data.employeeId);
    if (attemptCount >= (assessment.attempt_limit || 3)) {
      throw new Error(`Maximum attempt limit of ${assessment.attempt_limit || 3} reached for this assessment.`);
    }

    let questions: any[] = [];
    if (typeof assessment.questions === 'string') {
      questions = JSON.parse(assessment.questions);
    } else if (Array.isArray(assessment.questions)) {
      questions = assessment.questions;
    }

    // Calculate score
    let totalMarks = 0;
    let earnedMarks = 0;

    questions.forEach((q, idx) => {
      const qId = q.id !== undefined ? String(q.id) : String(idx);
      const marks = Number(q.marks) || 1;
      totalMarks += marks;

      const userAns = data.answers[qId];
      if (userAns !== undefined && Number(userAns) === Number(q.correctIndex)) {
        earnedMarks += marks;
      }
    });

    const passMark = Number(assessment.passPercentage || (assessment as any).pass_percentage || 60);
    const scorePct = totalMarks > 0 ? Number(((earnedMarks / totalMarks) * 100).toFixed(2)) : 0;
    const passed = scorePct >= passMark;

    const attemptNumber = attemptCount + 1;

    const attempt = await assessmentAttemptRepository.create(ctx, {
      organization_id: ctx.organizationId,
      assessment_id: data.assessmentId,
      employee_id: data.employeeId,
      enrollment_id: data.enrollmentId || null,
      answers: JSON.stringify(data.answers),
      score: scorePct,
      passed,
      attempt_number: attemptNumber,
      attempted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    // If passed and enrollmentId exists, update enrollment and issue certificate
    if (data.enrollmentId) {
      const enrollment: any = await enrollmentRepository.getById(ctx, data.enrollmentId);
      if (enrollment) {
        const courseId = Number(assessment.courseId || assessment.course_id || enrollment.courseId || enrollment.course_id);
        await enrollmentRepository.update(ctx, data.enrollmentId, {
          score: scorePct,
          status: passed ? 'completed' : (enrollment.status || 'in_progress'),
          completed_on: passed ? new Date().toISOString().slice(0, 19).replace('T', ' ') : enrollment.completed_on,
        });

        if (passed) {
          try {
            await certificateService.issueCertificate(ctx, {
              employeeId: data.employeeId,
              courseId,
              enrollmentId: data.enrollmentId,
              score: scorePct,
            });
          } catch (e) {
            console.error('[Certificate issuance error in assessment submit]', e);
          }
        }
      }
    }

    return {
      attemptId: attempt.id,
      score: scorePct,
      passed,
      attemptNumber,
      totalQuestions: questions.length,
      earnedMarks,
      totalMarks,
    };
  }
}

export const assessmentService = new AssessmentService();
