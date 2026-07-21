import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeDocument {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  document_type: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  issued_by: string | null;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  verification_status: 'pending' | 'verified' | 'rejected' | 'expired';
  verified_by: number | null;
  verified_at: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeDocumentRepository extends BaseRepository<EmployeeDocument> {
  constructor() {
    super('employee_documents');
  }

  /**
   * Get documents by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get document by type and employee
   */
  async getByTypeAndEmployee(ctx: TenantContext, employeeId: number, documentType: string): Promise<EmployeeDocument | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('document_type', documentType)
      .first() as Promise<EmployeeDocument | null>;
  }

  /**
   * Get pending verification documents
   */
  async getPendingVerification(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { verification_status: 'pending' },
    });
  }

  /**
   * Get expired documents
   */
  async getExpired(ctx: TenantContext, options?: ListQueryOptions) {
    const db = this.query(ctx);
    return db
      .where('expiry_date', '<', new Date().toISOString())
      .orderBy('expiry_date', 'asc')
      .limit(options?.pageSize || 20);
  }

  protected getSearchableFields(): string[] {
    return ['document_number', 'file_type'];
  }
}
