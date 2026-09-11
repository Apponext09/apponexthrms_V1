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
  UNAUTHORIZED_APPROVER: {
    code: 'EXP_ERR_UNAUTHORIZED_APPROVER',
    statusCode: 403,
    message: 'You are not authorized to approve this claim at its current workflow status.'
  },
  CANNOT_APPROVE_OWN_CLAIM: {
    code: 'EXP_ERR_SELF_APPROVAL',
    statusCode: 403,
    message: 'Self-approval is prohibited. You cannot approve your own expense claim.'
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
