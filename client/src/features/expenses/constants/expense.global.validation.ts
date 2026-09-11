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
  NO_ITEMS: 'At least one line item is required to submit an expense claim.'
};

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
