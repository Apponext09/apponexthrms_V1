/**
 * ApponextHRMS - Expense Global Validation & Error Message Dictionary
 * 
 * Centralized registry of validation constraints, error codes, HTTP status codes,
 * policy checks, and user-facing messages for the Expense & Reimbursement Module.
 */

export interface ExpenseValidationRule {
  code: string;
  statusCode: number;
  message: string;
  field?: string;
}

export const EXPENSE_VALIDATION_MESSAGES = {
  // --- CLAIM HEADER VALIDATIONS ---
  TITLE_REQUIRED: {
    code: 'EXP_ERR_TITLE_REQUIRED',
    statusCode: 400,
    field: 'title',
    message: 'Expense claim title is required and must be between 3 and 150 characters.'
  },
  DATE_REQUIRED: {
    code: 'EXP_ERR_DATE_REQUIRED',
    statusCode: 400,
    field: 'claimDate',
    message: 'Claim date is required.'
  },
  DATE_FUTURE_INVALID: {
    code: 'EXP_ERR_DATE_FUTURE',
    statusCode: 400,
    field: 'claimDate',
    message: 'Expense date cannot be in the future.'
  },
  DATE_EXPIRED: {
    code: 'EXP_ERR_DATE_EXPIRED',
    statusCode: 400,
    field: 'claimDate',
    message: 'Expense claims cannot be submitted for expenses older than 90 days.'
  },
  EMPTY_ITEMS: {
    code: 'EXP_ERR_EMPTY_ITEMS',
    statusCode: 400,
    field: 'items',
    message: 'At least one expense line item must be included in the claim.'
  },

  // --- LINE ITEM VALIDATIONS ---
  CATEGORY_REQUIRED: {
    code: 'EXP_ERR_CATEGORY_REQUIRED',
    statusCode: 400,
    field: 'categoryId',
    message: 'Expense category is required for every line item.'
  },
  CATEGORY_INACTIVE: {
    code: 'EXP_ERR_CATEGORY_INACTIVE',
    statusCode: 400,
    field: 'categoryId',
    message: 'Selected expense category is currently inactive.'
  },
  AMOUNT_INVALID: {
    code: 'EXP_ERR_AMOUNT_INVALID',
    statusCode: 400,
    field: 'claimedAmount',
    message: 'Claimed amount must be a positive number greater than ₹0.'
  },
  RECEIPT_MANDATORY: {
    code: 'EXP_ERR_RECEIPT_MANDATORY',
    statusCode: 400,
    field: 'receiptUrl',
    message: 'Receipt upload is mandatory for this category when amount exceeds the policy threshold.'
  },
  JUSTIFICATION_REQUIRED: {
    code: 'EXP_ERR_JUSTIFICATION_REQUIRED',
    statusCode: 400,
    field: 'employeeJustification',
    message: 'Employee justification is required when claiming amounts above the category policy limit.'
  },

  // --- POLICY & SPENDING LIMITS ---
  POLICY_LIMIT_EXCEEDED: {
    code: 'EXP_WARN_POLICY_EXCEEDED',
    statusCode: 422,
    field: 'claimedAmount',
    message: 'Claimed amount exceeds the single-claim policy limit.'
  },
  DUPLICATE_CLAIM_DETECTED: {
    code: 'EXP_ERR_DUPLICATE_CLAIM',
    statusCode: 409,
    field: 'duplicate',
    message: 'A claim with identical date, merchant, and amount has already been submitted.'
  },

  // --- WORKFLOW & APPROVALS ---
  WORKFLOW_NOT_CONFIGURED: {
    code: 'EXP_ERR_NO_WORKFLOW',
    statusCode: 400,
    message: 'No active approval workflow is configured for this claim amount.'
  },
  WORKFLOW_UNPUBLISHED: {
    code: 'EXP_ERR_WORKFLOW_UNPUBLISHED',
    statusCode: 400,
    message: 'A workflow exists for this request type, but it is not published and active.'
  },
  WORKFLOW_EMPLOYEE_MISMATCH: {
    code: 'EXP_ERR_WORKFLOW_EMPLOYEE_SCOPE',
    statusCode: 400,
    message: 'The workflow does not include your employee profile.'
  },
  WORKFLOW_DEPARTMENT_MISMATCH: {
    code: 'EXP_ERR_WORKFLOW_DEPARTMENT_SCOPE',
    statusCode: 400,
    message: 'The workflow does not include your current department.'
  },
  WORKFLOW_MANAGER_MISMATCH: {
    code: 'EXP_ERR_WORKFLOW_MANAGER_SCOPE',
    statusCode: 400,
    message: 'The workflow reporting-manager filter does not match your current reporting manager. Clear that filter or select your actual reporting manager.'
  },
  WORKFLOW_ROLE_MISMATCH: {
    code: 'EXP_ERR_WORKFLOW_ROLE_SCOPE',
    statusCode: 400,
    message: 'The workflow submitter role does not match your assigned role.'
  },
  WORKFLOW_COMPANY_MISMATCH: {
    code: 'EXP_ERR_WORKFLOW_COMPANY_SCOPE',
    statusCode: 400,
    message: 'The workflow does not include your current company.'
  },
  WORKFLOW_LOCATION_MISMATCH: {
    code: 'EXP_ERR_WORKFLOW_LOCATION_SCOPE',
    statusCode: 400,
    message: 'The workflow does not include your current location.'
  },
  WORKFLOW_GRADE_MISMATCH: {
    code: 'EXP_ERR_WORKFLOW_GRADE_SCOPE',
    statusCode: 400,
    message: 'The workflow does not include your current grade.'
  },
  WORKFLOW_EMPLOYEE_TYPE_MISMATCH: {
    code: 'EXP_ERR_WORKFLOW_EMPLOYEE_TYPE_SCOPE',
    statusCode: 400,
    message: 'The workflow does not include your employment type.'
  },
  WORKFLOW_AMOUNT_MISMATCH: {
    code: 'EXP_ERR_WORKFLOW_AMOUNT_SCOPE',
    statusCode: 400,
    message: 'The request amount is outside the workflow minimum and maximum amount range.'
  },
  WORKFLOW_SCOPE_CONFLICT: {
    code: 'EXP_ERR_WORKFLOW_SCOPE_CONFLICT',
    statusCode: 400,
    message: 'The selected employee, department, and reporting-manager filters do not match any one employee. Correct the workflow scope before publishing.'
  },
  UNAUTHORIZED_APPROVER: {
    code: 'EXP_ERR_UNAUTHORIZED_APPROVER',
    statusCode: 403,
    message: 'You are not authorized to approve this claim at its current workflow status.'
  },
  CANNOT_APPROVE_OWN_CLAIM: {
    code: 'EXP_ERR_SELF_APPROVAL',
    statusCode: 403,
    message: 'Self-approval is allowed only for an explicitly named CEO, Organization Admin, or HR workflow step.'
  },
  REJECTION_REASON_REQUIRED: {
    code: 'EXP_ERR_REJECTION_REASON',
    statusCode: 400,
    field: 'rejectionReason',
    message: 'A clear reason for rejection must be provided.'
  },
  CLAIM_NOT_FOUND: {
    code: 'EXP_ERR_NOT_FOUND',
    statusCode: 404,
    message: 'Expense claim not found or you do not have access permission.'
  },
  CLAIM_ALREADY_PROCESSED: {
    code: 'EXP_ERR_ALREADY_PROCESSED',
    statusCode: 400,
    message: 'This expense claim has already been approved, rejected, or paid.'
  },

  // --- CATEGORY & POLICY CONFIGURATION ---
  CATEGORY_NAME_REQUIRED: {
    code: 'EXP_ERR_CAT_NAME',
    statusCode: 400,
    field: 'name',
    message: 'Category name is required.'
  },
  CATEGORY_CODE_EXISTS: {
    code: 'EXP_ERR_CAT_CODE_DUPLICATE',
    statusCode: 409,
    field: 'code',
    message: 'Expense category code already exists.'
  }
};

const parseWorkflowValue = (value: any) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
};

/** Returns an actionable, claimant-scoped reason when configured workflows do not match. */
export function getExpenseWorkflowMismatchMessage(workflows: any[], applicant: any, requestType: string, amount: number): string {
  const typed = workflows.filter(workflow => workflow.type === requestType);
  if (!typed.length) return `No approval workflow has been created for ${requestType.replace(/_/g, ' ')}. Create and publish one before submitting.`;
  const reasonsFor = (workflow: any): string[] => {
    const filters = parseWorkflowValue(workflow.applicabilityFilters);
    const config = parseWorkflowValue(workflow.expenseConfig);
    const includes = (values: any[], actual: any) => !values?.length || values.map(String).includes(String(actual));
    const reasons: string[] = [];
    if (workflow.status !== 'published' || !workflow.isPublished || workflow.isActive === false || workflow.isActive === 0) reasons.push(EXPENSE_VALIDATION_MESSAGES.WORKFLOW_UNPUBLISHED.message);
    if (!includes(filters.employeeIds, applicant.employeeId)) reasons.push(EXPENSE_VALIDATION_MESSAGES.WORKFLOW_EMPLOYEE_MISMATCH.message);
    if (!includes(filters.departmentIds, applicant.departmentId)) reasons.push(EXPENSE_VALIDATION_MESSAGES.WORKFLOW_DEPARTMENT_MISMATCH.message);
    if (!includes(filters.companyIds, applicant.companyId) || (workflow.companyId && String(workflow.companyId) !== String(applicant.companyId))) reasons.push(EXPENSE_VALIDATION_MESSAGES.WORKFLOW_COMPANY_MISMATCH.message);
    if (!includes(filters.companyLocationIds, applicant.locationId)) reasons.push(EXPENSE_VALIDATION_MESSAGES.WORKFLOW_LOCATION_MISMATCH.message);
    if (!includes(filters.gradeIds, applicant.gradeId)) reasons.push(EXPENSE_VALIDATION_MESSAGES.WORKFLOW_GRADE_MISMATCH.message);
    if (!includes(filters.employeeTypes, applicant.employeeType)) reasons.push(EXPENSE_VALIDATION_MESSAGES.WORKFLOW_EMPLOYEE_TYPE_MISMATCH.message);
    if (!includes(filters.reportingManagerIds, applicant.reportingManagerId)) reasons.push(EXPENSE_VALIDATION_MESSAGES.WORKFLOW_MANAGER_MISMATCH.message);
    if (config.targetRole && config.targetRole !== 'all' && !applicant.roles.includes(config.targetRole)) reasons.push(EXPENSE_VALIDATION_MESSAGES.WORKFLOW_ROLE_MISMATCH.message);
    if (amount < Number(config.minAmount ?? 0) || (config.maxAmount != null && amount > Number(config.maxAmount))) reasons.push(EXPENSE_VALIDATION_MESSAGES.WORKFLOW_AMOUNT_MISMATCH.message);
    return reasons;
  };
  const evaluated = typed.map(workflow => ({ workflow, reasons: reasonsFor(workflow) })).sort((a, b) => a.reasons.length - b.reasons.length);
  const closest = evaluated[0];
  if (!closest?.reasons.length) return EXPENSE_VALIDATION_MESSAGES.WORKFLOW_NOT_CONFIGURED.message;
  return `Workflow “${closest.workflow.workflowName || closest.workflow.name}” cannot be used: ${closest.reasons.join(' ')}`;
}

/**
 * Global helper function to validate an Expense Claim submission
 */
export function validateExpenseClaimPayload(data: any): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors: Array<{ field: string; message: string }> = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: [{ field: 'payload', message: 'Invalid claim payload.' }] };
  }

  const title = String(data.title || '').trim();
  if (!title || title.length < 3) {
    errors.push({ field: 'title', message: EXPENSE_VALIDATION_MESSAGES.TITLE_REQUIRED.message });
  }

  // Normalize single-item payload if items array was omitted or empty
  let items = data.items;
  if (!Array.isArray(items) || items.length === 0) {
    const fallbackCatId = Number(data.categoryId || data.category_id || 0);
    const fallbackAmount = Number(data.amount ?? data.claimedAmount ?? data.claimed_amount ?? data.totalClaimedAmount ?? 0);
    if (fallbackCatId && fallbackAmount > 0) {
      items = [
        {
          categoryId: fallbackCatId,
          claimedAmount: fallbackAmount,
          expenseDate: data.claimDate || data.claim_date || new Date().toISOString().slice(0, 10),
          merchantName: data.merchantName || data.merchant_name,
          description: data.description,
          receiptUrl: data.receiptUrl || data.receipt_url
        }
      ];
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.push({ field: 'items', message: EXPENSE_VALIDATION_MESSAGES.EMPTY_ITEMS.message });
  } else {
    items.forEach((item: any, idx: number) => {
      const itemCatId = Number(item.categoryId || item.category_id || data.categoryId || data.category_id || 0);
      if (!itemCatId) {
        errors.push({ field: `items[${idx}].categoryId`, message: `Item #${idx + 1}: ${EXPENSE_VALIDATION_MESSAGES.CATEGORY_REQUIRED.message}` });
      }

      const amt = Number(item.claimedAmount ?? item.claimed_amount ?? item.amount ?? 0);
      if (!amt || amt <= 0 || isNaN(amt)) {
        errors.push({ field: `items[${idx}].claimedAmount`, message: `Item #${idx + 1}: ${EXPENSE_VALIDATION_MESSAGES.AMOUNT_INVALID.message}` });
      }

      const expDate = item.expenseDate || item.expense_date || data.claimDate || data.claim_date;
      if (expDate) {
        const d = new Date(expDate);
        if (isNaN(d.getTime())) {
          errors.push({ field: `items[${idx}].expenseDate`, message: `Item #${idx + 1}: Invalid expense date format.` });
        } else {
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);
          if (d > endOfToday) {
            errors.push({ field: `items[${idx}].expenseDate`, message: `Item #${idx + 1}: ${EXPENSE_VALIDATION_MESSAGES.DATE_FUTURE_INVALID.message}` });
          }
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
