import { apiClient } from '@/config/api';

export interface ExpenseCategory {
  id: number;
  name: string;
  code: string;
  description?: string;
  spendingLimit: number;
  isReceiptMandatory: boolean;
  minAmountForReceipt: number;
  autoApprovalThreshold?: number;
  isActive: boolean;
}

export interface ExpensePolicy {
  id: number;
  policyName: string;
  categoryId?: number;
  categoryName?: string;
  grade?: string;
  designation?: string;
  departmentId?: number;
  location?: string;
  maxLimitPerClaim: number;
  maxLimitPerMonth: number;
  requireReceiptAbove: number;
  allowException: boolean;
  isActive: boolean;
}

export interface ExpenseClaimItem {
  id?: number;
  categoryId?: number;
  categoryName?: string;
  expenseDate: string;
  claimedAmount: number;
  approvedAmount?: number;
  rejectedAmount?: number;
  merchantName?: string;
  description?: string;
  projectCostCenter?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  receiptFileType?: string;
  receiptFileSize?: number;
  policyValidated?: boolean;
  policyViolations?: string;
  employeeJustification?: string;
  status?: string;
  adjustmentReason?: string;
}

export type ExpenseItemInput = ExpenseClaimItem;

export interface ApprovalLog {
  id: number;
  claimId: number;
  approverId?: number;
  approverName: string;
  approverRole: string;
  action: string;
  comments?: string;
  createdAt: string;
}

export interface ExpenseClaim {
  id: number;
  uuid: string;
  claimNumber: string;
  employeeId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  employeeCode?: string;
  departmentName?: string;
  designationName?: string;
  locationName?: string;
  title: string;
  categoryId?: number;
  categoryName?: string;
  claimDate: string;
  totalClaimedAmount: number;
  totalApprovedAmount: number;
  totalRejectedAmount: number;
  paymentMethod: string;
  merchantName?: string;
  description?: string;
  projectCostCenter?: string;
  receiptUrl?: string;
  status: string; // draft, submitted, pending_manager, pending_level_1, pending_level_2, pending_finance, approved, returned, rejected, payment_pending, paid
  currentApproverId?: number;
  currentApproverRole?: string;
  currentLevel?: number;
  workflowId?: number;
  rejectionReason?: string;
  returnComments?: string;
  travelRequestId?: number;
  travelAdvanceId?: number;
  submittedAt?: string;
  approvedAt?: string;
  reimbursedAt?: string;
  paymentDate?: string;
  paidAmount?: number;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
  items?: ExpenseClaimItem[];
  timeline?: ApprovalLog[];
}

export interface TravelRequest {
  id: number;
  uuid: string;
  requestNumber: string;
  employeeId: number;
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
  departmentName?: string;
  fromLocation: string;
  toLocation: string;
  purpose: string;
  startDate: string;
  endDate: string;
  estimatedBudget: number;
  status: string; // pending_level_1 | pending_level_2 | pending_finance | approved | rejected
  currentLevel?: number;
  currentApproverRole?: string;
  workflowId?: number;
  submittedByRole?: string; // employee | team_lead | manager | hr | admin
  approverNotes?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface TravelAdvance {
  id: number;
  uuid: string;
  advanceNumber: string;
  employeeId: number;
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
  departmentName?: string;
  travelRequestId?: number;
  requestNumber?: string;
  travelPurpose?: string;
  advanceAmount: number;
  approvedAmount: number;
  settledAmount: number;
  balanceAmount: number;
  purpose?: string;
  status: string; // pending_finance | approved | rejected | disbursed
  submittedByRole?: string; // employee | team_lead | manager | hr | admin
  financeNotes?: string;
  rejectionReason?: string;
  financeApprovedAt?: string;
  disbursedAt?: string;
  createdAt: string;
}

export interface MileageClaim {
  id: number;
  uuid: string;
  employeeId: number;
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
  tripDate: string;
  fromLocation: string;
  toLocation: string;
  vehicleType: string;
  distanceKm: number;
  ratePerKm: number;
  calculatedAmount: number;
  purpose?: string;
  status: string;
  createdAt: string;
}

export interface MileageDesignationRate {
  designationId: number;
  designationIds?: number[];
  designationName: string;
  designationCode?: string;
  rateCar: number;
  rateBike: number;
  hasCustomRate?: boolean;
}

export interface ExpenseSettings {
  id: number;
  autoApprovalThreshold: number;
  categoryThresholds?: Array<{ id: number; name?: string; autoApprovalThreshold: number }>;
  mileageRateCar: number;
  mileageRateBike: number;
  mileageRatesByDesignation?: MileageDesignationRate[];
  myMileageRateCar?: number;
  myMileageRateBike?: number;
  myDesignationId?: number | null;
  myDesignationName?: string | null;
  requireManagerApproval: boolean;
  requireFinanceApproval: boolean;
  multiLevelApproval: boolean;
  enableTravelModule?: boolean;
  enableMileageModule?: boolean;
}

export interface ExpenseWorkflowLevel {
  id?: number;
  workflowId?: number;
  levelOrder: number;
  approverType: 'reporting_manager' | 'department_head' | 'hr' | 'ceo' | 'role';
  approverRole?: string;
  stepName: string;
  isMandatory: boolean;
}

export interface ExpenseWorkflow {
  id: number;
  name: string;
  description?: string;
  minAmount: number;
  maxAmount: number;
  departmentId?: number;
  isActive: boolean;
  levels?: ExpenseWorkflowLevel[];
}

export const expenseApi = {
  // Categories
  getCategories: (includeInactive?: boolean) => apiClient.get('/expenses/categories', { params: { includeInactive } }).then((res) => res.data.data),
  createCategory: (data: Partial<ExpenseCategory>) => apiClient.post('/expenses/categories', data).then((res) => res.data.data),
  updateCategory: (id: number, data: Partial<ExpenseCategory>) => apiClient.put(`/expenses/categories/${id}`, data).then((res) => res.data.data),
  deleteCategory: (id: number) => apiClient.delete(`/expenses/categories/${id}`).then((res) => res.data),

  // Policies
  getPolicies: () => apiClient.get('/expenses/policies').then((res) => res.data.data),
  createPolicy: (data: Partial<ExpensePolicy>) => apiClient.post('/expenses/policies', data).then((res) => res.data.data),
  updatePolicy: (id: number, data: Partial<ExpensePolicy>) => apiClient.put(`/expenses/policies/${id}`, data).then((res) => res.data.data),
  deletePolicy: (id: number) => apiClient.delete(`/expenses/policies/${id}`).then((res) => res.data),
  validatePolicy: (categoryId: number, amount: number, receiptProvided: boolean) =>
    apiClient.post('/expenses/policies/validate', { categoryId, amount, receiptProvided }).then((res) => res.data.data),

  // Claims
  getClaims: (params?: Record<string, any>) => apiClient.get('/expenses/claims', { params }).then((res) => res.data.data),
  getClaimById: (id: number | string) => apiClient.get(`/expenses/claims/${id}`).then((res) => res.data.data),
  createClaim: (data: any) => apiClient.post('/expenses/claims', data).then((res) => res.data.data),
  updateClaim: (id: number | string, data: any) => apiClient.put(`/expenses/claims/${id}`, data).then((res) => res.data.data),

  // Actions
  managerApproveClaim: (id: number | string, comments?: string) => apiClient.post(`/expenses/claims/${id}/manager-approve`, { comments }).then((res) => res.data.data),
  bulkApproveClaims: (ids: (number | string)[], comments?: string) =>
    apiClient.post('/expenses/claims/bulk-approve', { ids, comments }).then((res) => res.data.data),
  financeVerifyClaim: (id: number | string, data: { items?: any[]; comments?: string }) => apiClient.post(`/expenses/claims/${id}/finance-verify`, data).then((res) => res.data.data),
  rejectClaim: (id: number | string, reason: string) => apiClient.post(`/expenses/claims/${id}/reject`, { reason }).then((res) => res.data.data),
  returnClaim: (id: number | string, comments: string) => apiClient.post(`/expenses/claims/${id}/return`, { comments }).then((res) => res.data.data),
  processReimbursement: (id: number | string, data: { paymentDate: string; paidAmount: number; paymentMethod: string; paymentReference?: string }) =>
    apiClient.post(`/expenses/claims/${id}/reimburse`, data).then((res) => res.data.data),

  // Travel
  getTravelRequests: (params?: Record<string, any> | number | null) => {
    const p = typeof params === 'number' ? { employeeId: params } : (params || undefined);
    return apiClient.get('/expenses/travel-requests', { params: p }).then((res) => res.data.data);
  },
  createTravelRequest: (data: any) => apiClient.post('/expenses/travel-requests', data).then((res) => res.data.data),
  updateTravelRequestStatus: (id: number, status: string, notes?: string) => apiClient.put(`/expenses/travel-requests/${id}/status`, { status, notes }).then((res) => res.data.data),

  getTravelAdvances: (params?: Record<string, any> | number | null) => {
    const p = typeof params === 'number' ? { employeeId: params } : (params || undefined);
    return apiClient.get('/expenses/travel-advances', { params: p }).then((res) => res.data.data);
  },
  createTravelAdvance: (data: any) => apiClient.post('/expenses/travel-advances', data).then((res) => res.data.data),
  approveTravelAdvance: (id: number, data: { comments?: string; approvedAmount?: number }) =>
    apiClient.put(`/expenses/travel-advances/${id}/approve`, data).then((res) => res.data.data),
  rejectTravelAdvance: (id: number, reason: string) =>
    apiClient.put(`/expenses/travel-advances/${id}/reject`, { reason }).then((res) => res.data.data),

  // Mileage
  getMileageClaims: (params?: Record<string, any> | number | null) => {
    const p = typeof params === 'number' ? { employeeId: params } : (params || undefined);
    return apiClient.get('/expenses/mileage', { params: p }).then((res) => res.data.data);
  },
  createMileageClaim: (data: any) => apiClient.post('/expenses/mileage', data).then((res) => res.data.data),

  // Dashboard & Reports
  getDashboardSummary: () => apiClient.get('/expenses/dashboard/summary').then((res) => res.data.data),
  getReports: (params?: Record<string, any>) => apiClient.get('/expenses/reports', { params }).then((res) => res.data.data),

  // Settings & Workflows
  getSettings: () => apiClient.get('/expenses/settings').then((res) => res.data.data),
  updateSettings: (data: any) => apiClient.put('/expenses/settings', data).then((res) => res.data.data),
  getWorkflows: () => apiClient.get('/expenses/workflows').then((res) => res.data.data),
  createWorkflow: (data: any) => apiClient.post('/expenses/workflows', data).then((res) => res.data.data),
  updateWorkflow: (id: number, data: any) => apiClient.put(`/expenses/workflows/${id}`, data).then((res) => res.data.data),
  deleteWorkflow: (id: number) => apiClient.delete(`/expenses/workflows/${id}`).then((res) => res.data),
};
