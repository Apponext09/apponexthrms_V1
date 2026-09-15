/**
 * ApponextHRMS - Client Expense Global Validation Dictionary
 * 
 * Centralized registry of user error messages, warnings, and validation helpers
 * used across all expense portal screens.
 */

export const CLIENT_EXPENSE_VALIDATION = {
  TITLE_REQUIRED: 'Please enter a clear claim title (minimum 3 characters).',
  CATEGORY_REQUIRED: 'Please select a valid expense category for each line item.',
  AMOUNT_INVALID: 'Claimed amount must be greater than ₹0.',
  RECEIPT_REQUIRED: 'Receipt attachment is mandatory for this expense item.',
  RECEIPT_SIZE_EXCEEDED: 'Receipt file size must not exceed 10MB.',
  RECEIPT_FORMAT_INVALID: 'Invalid receipt file type. Accepted formats: PDF, JPG, PNG, WEBP.',
  JUSTIFICATION_REQUIRED: 'Employee justification is required because the claim amount exceeds the standard category policy limit.',
  REJECTION_REASON_REQUIRED: 'Please enter a reason for rejecting this claim.',
  NO_ITEMS: 'At least one line item is required to submit an expense claim.',
  WORKFLOW_NAME_REQUIRED: 'Enter a workflow name.',
  WORKFLOW_AMOUNT_RANGE_INVALID: 'Maximum amount cannot be lower than minimum amount.',
  WORKFLOW_STEP_REQUIRED: 'Add at least one approval step.',
  WORKFLOW_STEP_NAME_REQUIRED: 'Enter a name for every approval step.',
  WORKFLOW_EMPLOYEE_APPROVER_REQUIRED: 'Select an employee for every Specific employee step.',
  WORKFLOW_USER_APPROVER_REQUIRED: 'Select a user for every Named user account step.',
  WORKFLOW_ROLE_APPROVER_REQUIRED: 'Select a role for every role-group step.',
  WORKFLOW_SCOPE_CONFLICT: 'The selected employee does not belong to the selected department or reporting manager. Clear the conflicting filter before saving.'
};

export function validateClientExpenseWorkflow(workflow: any, employees: any[]): { isValid: boolean; errorMessage?: string } {
  if (!String(workflow?.name || '').trim()) return { isValid: false, errorMessage: CLIENT_EXPENSE_VALIDATION.WORKFLOW_NAME_REQUIRED };
  if (workflow.maxAmount !== null && workflow.maxAmount !== '' && Number(workflow.maxAmount) < Number(workflow.minAmount || 0)) return { isValid: false, errorMessage: CLIENT_EXPENSE_VALIDATION.WORKFLOW_AMOUNT_RANGE_INVALID };
  if (!Array.isArray(workflow.levels) || !workflow.levels.length) return { isValid: false, errorMessage: CLIENT_EXPENSE_VALIDATION.WORKFLOW_STEP_REQUIRED };
  for (let index = 0; index < workflow.levels.length; index++) {
    const level = workflow.levels[index];
    const prefix = `Step ${index + 1}: `;
    if (!String(level.stepName || '').trim()) return { isValid: false, errorMessage: prefix + CLIENT_EXPENSE_VALIDATION.WORKFLOW_STEP_NAME_REQUIRED };
    if (level.approverType === 'specific_employee' && !Number(level.employeeId)) return { isValid: false, errorMessage: prefix + CLIENT_EXPENSE_VALIDATION.WORKFLOW_EMPLOYEE_APPROVER_REQUIRED };
    if (level.approverType === 'specific_user' && !Number(level.approverId)) return { isValid: false, errorMessage: prefix + CLIENT_EXPENSE_VALIDATION.WORKFLOW_USER_APPROVER_REQUIRED };
    if (['role', 'user_role'].includes(level.approverType) && !level.roleCode && !level.approverRoleId) return { isValid: false, errorMessage: prefix + CLIENT_EXPENSE_VALIDATION.WORKFLOW_ROLE_APPROVER_REQUIRED };
  }
  const employeeIds = (workflow.employeeIds || []).map(Number);
  const departmentIds = workflow.departmentId ? [Number(workflow.departmentId)] : [];
  const managerIds = (workflow.reportingManagerIds || []).map(Number);
  if (employeeIds.length && (departmentIds.length || managerIds.length)) {
    const hasMatch = employees.filter(employee => employeeIds.includes(Number(employee.id))).some(employee =>
      (!departmentIds.length || departmentIds.includes(Number(employee.currentDepartmentId)))
      && (!managerIds.length || managerIds.includes(Number(employee.reportingManagerId))));
    if (!hasMatch) return { isValid: false, errorMessage: CLIENT_EXPENSE_VALIDATION.WORKFLOW_SCOPE_CONFLICT };
  }
  return { isValid: true };
}

export function validateClientClaimForm(items: any[], categoryId?: number): { isValid: boolean; errorMessage?: string } {
  if (!items || items.length === 0) {
    return { isValid: false, errorMessage: CLIENT_EXPENSE_VALIDATION.NO_ITEMS };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const catId = item.categoryId || categoryId;
    if (!catId) {
      return { isValid: false, errorMessage: `Item #${i + 1}: ${CLIENT_EXPENSE_VALIDATION.CATEGORY_REQUIRED}` };
    }
    const amt = Number(item.claimedAmount || 0);
    if (!amt || amt <= 0) {
      return { isValid: false, errorMessage: `Item #${i + 1}: ${CLIENT_EXPENSE_VALIDATION.AMOUNT_INVALID}` };
    }
  }

  return { isValid: true };
}
