import { ValidationError } from '../../../common/errors/index';
import { getExpenseWorkflowMismatchMessage } from '../expense.global.validation';
export const requestTypes = ['expense_claim', 'travel_request', 'travel_advance', 'mileage_claim'] as const;
export type ExpenseRequestType = typeof requestTypes[number];
export const entityTables: Record<ExpenseRequestType, string> = {
  expense_claim: 'expense_claims', travel_request: 'travel_requests',
  travel_advance: 'travel_advances', mileage_claim: 'mileage_claims',
};
export function json<T = any>(value: any, fallback: T = {} as T): T {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { throw new ValidationError('Invalid saved workflow configuration'); }
}
export function money(value: any, allowZero = false): number {
  const n = Number(value);
  if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0) || n > 9999999999.99) throw new ValidationError('Enter a valid positive amount');
  return Math.round(n * 100) / 100;
}
export function workflowMatches(w: any, applicant: any, type: string, amount: number): boolean {
  const f = json(w.applicabilityFilters);
  const c = json(w.expenseConfig);
  if (w.type !== type || w.status !== 'published' || !w.isPublished || w.isActive === false || w.isActive === 0) return false;
  const matches = (values: any[], actual: any) => !values?.length || values.map(String).includes(String(actual));
  return matches(f.employeeIds, applicant.employeeId) && matches(f.departmentIds, applicant.departmentId)
    && matches(f.companyIds, applicant.companyId) && matches(f.companyLocationIds, applicant.locationId)
    && matches(f.gradeIds, applicant.gradeId) && matches(f.employeeTypes, applicant.employeeType)
    && matches(f.reportingManagerIds, applicant.reportingManagerId)
    && (!c.targetRole || c.targetRole === 'all' || applicant.roles.includes(c.targetRole))
    && amount >= Number(c.minAmount ?? 0) && (c.maxAmount == null || amount <= Number(c.maxAmount));
}
export function selectWorkflow(workflows: any[], applicant: any, type: string, amount: number) {
  const matches = workflows.filter(w => workflowMatches(w, applicant, type, amount));
  if (!matches.length) throw new ValidationError(getExpenseWorkflowMismatchMessage(workflows, applicant, type, amount));
  const priority = Math.max(...matches.map(w => Number(json(w.expenseConfig).priority || 0)));
  const winners = matches.filter(w => Number(json(w.expenseConfig).priority || 0) === priority);
  if (winners.length !== 1) throw new ValidationError('Multiple approval workflows match this request at the same priority. Contact your administrator.');
  return winners[0];
}
export function assertStepActor(run: any, actor: number, assigned: number[], options: { allowSelfApproval?: boolean } = {}) {
  if (run.status !== 'pending') throw new ValidationError('This request is no longer pending approval');
  if (!assigned.map(Number).includes(Number(actor))) throw new ValidationError('You are not assigned to this workflow step');
  if (Number(run.submitterUserId) === Number(actor) && !options.allowSelfApproval) throw new ValidationError('You cannot approve or reject your own request');
}
