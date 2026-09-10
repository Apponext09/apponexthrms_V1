/**
 * Leave Type
 */
export interface LeaveType {
  id: number;
  uuid: string;
  organizationId: number;
  leaveName: string;
  leaveCode: string;
  description: string | null;
  isPaid: boolean;
  requiresMedicalCertificate: boolean;
  maxConsecutiveDays: number | null;
  genderApplicable: 'all' | 'male' | 'female' | 'other';
  isOptionalHoliday: boolean;

  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

/**
 * Leave Policy
 */
export interface LeavePolicy {
  id: number;
  uuid: string;
  organizationId: number;
  policyName: string;
  policyCode: string;
  description: string | null;
  isDefault: boolean;
  applicableToDesignationId: number | null;
  applicableToDepartmentId: number | null;
  applicableToLocationId: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

/**
 * Leave Policy Assignment
 */
export interface LeavePolicyAssignment {
  id: number;
  uuid: string;
  organizationId: number;
  employeeId: number;
  leavePolicyId: number;
  leaveTypeId: number;
  annualQuota: number;
  monthlyAccrual: number | null;
  quarterlyAccrual: number | null;
  yearlyAccrual: number | null;
  carryForwardEnabled: boolean;
  carryForwardLimit: number | null;
  encashmentEnabled: boolean;
  encashmentLimit: number | null;
  maximumBalance: number | null;
  canTakeNegative: boolean;
  sandwichPolicyEnabled: boolean;
  probationExcluded: boolean;
  assignmentStartDate: string;
  assignmentEndDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Leave Balance
 */
export interface LeaveBalance {
  id: number;
  uuid: string;
  organizationId: number;
  employeeId: number;
  leaveTypeId: number;
  financialYearStart: string;
  financialYearEnd: string;
  openingBalance: number;
  creditedBalance: number;
  consumedBalance: number;
  availableBalance: number;
  carryForwardBalance: number;
  encashedBalance: number;
  expiredBalance: number;
  pendingApprovalBalance: number;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Leave Application
 */
export interface LeaveApplication {
  id: number;
  uuid: string;
  organizationId: number;
  employeeId: number;
  leaveTypeId: number;
  applicationStartDate: string;
  applicationEndDate: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDayPeriod: 'first_half' | 'second_half' | null;
  isHourly: boolean;
  hourlyDuration: number | null;
  reasonDescription: string | null;
  supportingDocumentUrl: string | null;
  workflowInstanceId: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';
  submittedAt: string | null;
  submittedByUserId: number | null;
  approvedBy: number | null;
  approvalDate: string | null;
  rejectionReason: string | null;
  cancelledBy: number | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  withdrawnAt: string | null;
  withdrawnBy: number | null;
  withdrawnReason: string | null;
  isSandwichDay: boolean;
  delegatedToUserId: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Leave Application Day
 */
export interface LeaveApplicationDay {
  id: number;
  uuid: string;
  organizationId: number;
  applicationId: number;
  leaveDate: string;
  dayType: 'full_day' | 'half_day_first_half' | 'half_day_second_half';
  isHoliday: boolean;
  isWeekend: boolean;
  status: 'approved' | 'rejected' | 'pending';
  notes: string | null;
  createdAt: string;
}

/**
 * Leave Approval
 */
export interface LeaveApproval {
  id: number;
  uuid: string;
  organizationId: number;
  applicationId: number;
  approvalLevel: number;
  approverUserId: number;
  approvalAction: 'approve' | 'reject' | 'delegate';
  approvalDate: string;
  approvalComments: string | null;
  createdAt: string;
}
