import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export interface ClaimInput {
  claimType: 'travel' | 'medical' | 'telephone' | 'fuel' | 'office_supplies' | 'other';
  claimDate: string;
  amount: number;
  description: string;
  receiptUrlsJson?: any;
}

export class ReimbursementService {
  async submitClaim(ctx: TenantContext, employeeId: number, input: ClaimInput) {
    const db = getKnex();
    const [id] = await db('reimbursement_claims').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: employeeId,
      claim_type: input.claimType,
      claim_date: input.claimDate,
      amount: input.amount,
      description: input.description,
      receipt_urls_json: input.receiptUrlsJson ? JSON.stringify(input.receiptUrlsJson) : null,
      status: 'pending'
    });
    return db('reimbursement_claims').where('id', id).first();
  }

  async getClaims(ctx: TenantContext, employeeId?: number, status?: string) {
    const db = getKnex();
    let query = db('reimbursement_claims')
      .where('reimbursement_claims.organization_id', ctx.organizationId)
      .leftJoin('employees', 'reimbursement_claims.employee_id', 'employees.id')
      .select('reimbursement_claims.*', 'employees.first_name', 'employees.last_name', 'employees.employee_code');

    if (employeeId) {
      query = query.where('reimbursement_claims.employee_id', employeeId);
    }
    if (status) {
      query = query.where('reimbursement_claims.status', status);
    }
    return query.orderBy('reimbursement_claims.created_at', 'desc');
  }

  async approveClaim(ctx: TenantContext, claimId: number, approverId: number) {
    const db = getKnex();
    await db('reimbursement_claims')
      .where('id', claimId)
      .where('organization_id', ctx.organizationId)
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date()
      });
    return db('reimbursement_claims')
      .where('id', claimId)
      .where('organization_id', ctx.organizationId)
      .first();
  }

  async rejectClaim(ctx: TenantContext, claimId: number, remarks: string) {
    const db = getKnex();
    await db('reimbursement_claims')
      .where('id', claimId)
      .where('organization_id', ctx.organizationId)
      .update({
        status: 'rejected',
        remarks,
        updated_at: new Date()
      });
    return db('reimbursement_claims')
      .where('id', claimId)
      .where('organization_id', ctx.organizationId)
      .first();
  }
}
