import type { TenantContext } from '../../../db/types';
import { certificateRepository } from '../repositories/CertificateRepository';

export class CertificateService {
  async getCertificates(ctx: TenantContext, filters?: any) {
    return certificateRepository.listWithDetails(ctx, filters);
  }

  async getCertificateById(ctx: TenantContext, id: number) {
    return certificateRepository.getById(ctx, id);
  }

  async getCertificateByNumber(ctx: TenantContext, certificateNumber: string) {
    return certificateRepository.getByNumber(ctx, certificateNumber);
  }

  async issueCertificate(
    ctx: TenantContext,
    data: {
      employeeId: number;
      courseId: number;
      enrollmentId?: number;
      score?: number;
    }
  ) {
    // Generate unique Certificate Number: CERT-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const certNumber = `CERT-${dateStr}-${randStr}`;

    const cert = await certificateRepository.create(ctx, {
      certificate_number: certNumber,
      organization_id: ctx.organizationId,
      employee_id: data.employeeId,
      course_id: data.courseId,
      enrollment_id: data.enrollmentId || null,
      score: data.score || null,
      issued_on: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    return cert;
  }
}

export const certificateService = new CertificateService();
