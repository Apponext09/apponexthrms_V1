import { v4 as uuidv4 } from 'uuid';
import { EmployeeDocumentRepository, type EmployeeDocument } from '../repositories/EmployeeDocumentRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class EmployeeDocumentService {
  private documentRepo: EmployeeDocumentRepository;
  private auditService: AuditService;

  constructor() {
    this.documentRepo = new EmployeeDocumentRepository();
    this.auditService = new AuditService();
  }

  /**
   * Upload a new document
   */
  async uploadDocument(ctx: TenantContext, input: {
    employeeId: number;
    documentType: string;
    fileUrl: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
  }): Promise<EmployeeDocument> {
    const document = await this.documentRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      document_type: input.documentType,
      file_url: input.fileUrl,
      file_size: input.fileSize || null,
      file_type: input.fileType || null,
      document_number: input.documentNumber || null,
      issue_date: input.issueDate || null,
      expiry_date: input.expiryDate || null,
      verification_status: 'pending',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'DOCUMENT',
      entityId: document.id,
      afterState: {
        documentType: input.documentType,
        fileName: input.fileName,
      },
    });

    return document;
  }

  /**
   * Verify document
   */
  async verifyDocument(ctx: TenantContext, documentId: number, approved: boolean, reason?: string): Promise<EmployeeDocument> {
    const document = await this.documentRepo.getById(ctx, documentId);
    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const updated = await this.documentRepo.update(ctx, documentId, {
      verification_status: approved ? 'verified' : 'rejected',
      verified_by: ctx.userId,
      verified_at: new Date(),
    } as any);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'DOCUMENT',
      entityId: documentId,
      changeDescription: `Document ${approved ? 'verified' : 'rejected'}. Reason: ${reason || 'N/A'}`,
    });

    return updated;
  }

  /**
   * Get documents for employee
   */
  async getEmployeeDocuments(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.documentRepo.getByEmployee(ctx, employeeId, options);
  }

  /**
   * Delete document
   */
  async deleteDocument(ctx: TenantContext, documentId: number): Promise<void> {
    const document = await this.documentRepo.getById(ctx, documentId);
    if (!document) {
      throw new NotFoundError('Document not found');
    }

    await this.documentRepo.delete(ctx, documentId);

    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'DOCUMENT',
      entityId: documentId,
    });
  }

  /**
   * Get pending verification documents
   */
  async getPendingVerification(ctx: TenantContext, options?: ListQueryOptions) {
    return this.documentRepo.getPendingVerification(ctx, options);
  }

  /**
   * Get expired documents
   */
  async getExpiredDocuments(ctx: TenantContext, options?: ListQueryOptions) {
    return this.documentRepo.getExpired(ctx, options);
  }
}
