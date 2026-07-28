import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export class PayrollLedgerService {
  async recordLedgerEntry(ctx: TenantContext, entry: {
    payrollRunId: number;
    employeeId: number;
    entryType: 'earning' | 'deduction' | 'employer_contribution' | 'reimbursement' | 'net_payout';
    componentCode: string;
    componentName: string;
    amount: number;
    financialYear: string;
    salaryMonth: string;
  }) {
    const db = getKnex();
    await db('payroll_ledger_entries').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      payroll_run_id: entry.payrollRunId,
      employee_id: entry.employeeId,
      entry_type: entry.entryType,
      component_code: entry.componentCode,
      component_name: entry.componentName,
      amount: entry.amount,
      financial_year: entry.financialYear,
      salary_month: entry.salaryMonth
    });
  }

  async getLedgerEntries(ctx: TenantContext, salaryMonth?: string, employeeId?: number) {
    const db = getKnex();
    let query = db('payroll_ledger_entries')
      .where('organization_id', ctx.organizationId);

    if (salaryMonth) {
      query = query.where('salary_month', salaryMonth);
    }
    if (employeeId) {
      query = query.where('employee_id', employeeId);
    }
    return query.orderBy('created_at', 'desc');
  }
}
