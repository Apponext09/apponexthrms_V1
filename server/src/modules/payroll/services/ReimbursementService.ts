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
    const insertData: Record<string, any> = {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: employeeId,
      claim_type: input.claimType || (input as any).type || 'travel',
      claim_date: input.claimDate || new Date().toISOString().slice(0, 10),
      amount: input.amount,
      description: input.description,
      status: 'pending'
    };
    const [id] = await db('reimbursement_claims').insert(insertData);
    const claim = await db('reimbursement_claims').where('id', id).first();

    // 🔔 Dispatch Notification to Organization Admins & Approvers
    try {
      const emp = await db('employees').where('id', employeeId).first().catch(() => null);
      const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : `Employee #${employeeId}`;
      const claimTypeLabel = String(input.claimType || 'Expense & Travel').replace(/_/g, ' ');

      const adminUsers = await db('users as u')
        .leftJoin('user_roles as ur', 'u.id', 'ur.user_id')
        .leftJoin('roles as r', 'ur.role_id', 'r.id')
        .where('u.organization_id', ctx.organizationId)
        .whereIn('r.code', ['organization_admin', 'super_admin', 'finance', 'finance_manager'])
        .whereNull('u.deleted_at')
        .select('u.id')
        .distinct();

      for (const admin of adminUsers) {
        if (admin.id) {
          await db('notifications').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            event_code: 'EXPENSE_CLAIM_SUBMITTED',
            recipient_id: admin.id,
            channels: JSON.stringify(['inapp', 'email']),
            subject_line: `New ${claimTypeLabel} Claim Request from ${empName}`,
            body_text: `${empName} submitted a new ${claimTypeLabel} reimbursement claim of ₹${Number(input.amount).toLocaleString('en-IN')}. Please review and approve.`,
            variables: JSON.stringify({ employee_name: empName, amount: input.amount, claim_id: id }),
            status: 'sent',
            priority: 'high',
            created_by: ctx.userId || 1,
            updated_by: ctx.userId || 1,
            created_at: new Date(),
            updated_at: new Date()
          }).catch(() => { });
        }
      }
    } catch (notifErr) {
      console.error('Failed to dispatch reimbursement notification:', notifErr);
    }

    return claim;
  }

  async getClaims(ctx: TenantContext, employeeId?: number, status?: string) {
    const db = getKnex();

    let targetEmployeeId = employeeId;

    if (!targetEmployeeId && ctx.userId) {
      const user = await db('users').where('id', ctx.userId).where('organization_id', ctx.organizationId).first().catch(() => null);
      if (user) {
        const roles = await db('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where('user_roles.user_id', user.id)
          .where('user_roles.organization_id', ctx.organizationId)
          .pluck('roles.code')
          .catch(() => []);

        const isPrivileged = roles.some((r: string) => ['organization_admin', 'super_admin', 'admin', 'hr', 'hr_admin', 'hr_manager', 'finance', 'finance_manager', 'department_head'].includes(r));

        if (!isPrivileged) {
          const emp = user.employee_id
            ? await db('employees').where('id', user.employee_id).first().catch(() => null)
            : await db('employees').where('email', user.email).where('organization_id', ctx.organizationId).first().catch(() => null);

          targetEmployeeId = emp ? emp.id : (user.employee_id || 0);
        }
      }
    }

    let query = db('reimbursement_claims')
      .where('reimbursement_claims.organization_id', ctx.organizationId)
      .leftJoin('employees', 'reimbursement_claims.employee_id', 'employees.id')
      .select('reimbursement_claims.*', 'employees.first_name', 'employees.last_name', 'employees.employee_code');

    if (targetEmployeeId) {
      query = query.where('reimbursement_claims.employee_id', targetEmployeeId);
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
    const claim = await db('reimbursement_claims')
      .where('id', claimId)
      .where('organization_id', ctx.organizationId)
      .first();

    // 🔔 Notify Employee of Claim Approval
    if (claim && claim.employee_id) {
      try {
        const emp = await db('employees').where('id', claim.employee_id).first().catch(() => null);
        const empUserId = (await db('users').where('employee_id', claim.employee_id).first().catch(() => null))?.id;
        const recipient = empUserId || claim.employee_id;

        await db('notifications').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          event_code: 'EXPENSE_CLAIM_APPROVED',
          recipient_id: recipient,
          channels: JSON.stringify(['inapp', 'email']),
          subject_line: `Reimbursement Claim Approved`,
          body_text: `Your ${claim.claim_type || 'expense'} claim of ₹${Number(claim.amount).toLocaleString('en-IN')} has been approved.`,
          variables: JSON.stringify({ amount: claim.amount, claim_id: claimId }),
          status: 'sent',
          priority: 'high',
          created_by: approverId,
          updated_by: approverId,
          created_at: new Date(),
          updated_at: new Date()
        }).catch(() => { });
      } catch { }
    }

    return claim;
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
    const claim = await db('reimbursement_claims')
      .where('id', claimId)
      .where('organization_id', ctx.organizationId)
      .first();

    // 🔔 Notify Employee of Claim Rejection
    if (claim && claim.employee_id) {
      try {
        const empUserId = (await db('users').where('employee_id', claim.employee_id).first().catch(() => null))?.id;
        const recipient = empUserId || claim.employee_id;

        await db('notifications').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          event_code: 'EXPENSE_CLAIM_REJECTED',
          recipient_id: recipient,
          channels: JSON.stringify(['inapp', 'email']),
          subject_line: `Reimbursement Claim Update`,
          body_text: `Your ${claim.claim_type || 'expense'} claim of ₹${Number(claim.amount).toLocaleString('en-IN')} was rejected. Reason: ${remarks}`,
          variables: JSON.stringify({ amount: claim.amount, claim_id: claimId, reason: remarks }),
          status: 'sent',
          priority: 'high',
          created_by: ctx.userId || 1,
          updated_by: ctx.userId || 1,
          created_at: new Date(),
          updated_at: new Date()
        }).catch(() => { });
      } catch { }
    }

    return claim;
  }
}
