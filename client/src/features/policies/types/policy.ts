export interface PolicySection {
  id: string;
  title: string;
  content: string;
}

export interface TargetAssignment {
  targetType: 'role' | 'department' | 'employee' | 'location';
  targetId: string;
}

export interface RolePolicyRecord {
  id: number;
  roleCode: string;
  assignedRoles: string[];
  applicableGender?: string;
  assignments?: TargetAssignment[];
  documentRef?: string;
  category?: string;
  title: string;
  description?: string;
  sections: PolicySection[];
  status?: 'draft' | 'published' | 'archived' | 'expired' | string;
  version?: string;
  effectiveDate?: string | null;
  reviewDate?: string | null;
  expiryDate?: string | null;
  sendNotification?: boolean;
  requireAcknowledgement?: boolean;
  allowDownload?: boolean;
  organizationId?: number | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  policyAccepted?: boolean;
  policyAcceptedAt?: string | null;
  acknowledgementPercentage?: number;
  acknowledgedCount?: number;
  pendingCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PolicyDashboardStats {
  totalPolicies: number;
  publishedPolicies: number;
  draftPolicies: number;
  archivedPolicies: number;
  employeesAcknowledgedPercent: number;
  pendingAcknowledgements: number;
}

export interface PolicyVersionRecord {
  id: number;
  policyId: number;
  versionNumber: string;
  title: string;
  description?: string;
  changeDescription?: string;
  status: string;
  updatedBy: string;
  createdAt?: string;
}

export interface PolicyAcknowledgementReportItem {
  employeeId: number;
  employeeName: string;
  email: string;
  role: string;
  department: string;
  policyId: number;
  policyName: string;
  documentRef: string;
  version: string;
  effectiveDate?: string | null;
  status: 'Acknowledged' | 'Pending' | string;
  acknowledgedDate?: string | null;
  comments?: string | null;
}

export interface PolicyAcknowledgementReportSummary {
  totalEmployees: number;
  acknowledged: number;
  pending: number;
  notApplicable: number;
}

export interface PolicyAcknowledgementReportData {
  summary: PolicyAcknowledgementReportSummary;
  report: PolicyAcknowledgementReportItem[];
}

export const POLICY_CATEGORIES = [
  'HR Policies',
  'Attendance Policies',
  'Leave Policies',
  'Payroll Policies',
  'Code of Conduct',
  'IT & Security',
  'Work From Home',
  'Travel & Expense',
  'Health & Safety',
  'Data Privacy',
  'Organization Governance',
] as const;

export const AVAILABLE_ROLES = [
  { code: 'super_admin', label: 'Super Admin' },
  { code: 'organization_admin', label: 'Organization Admin' },
  { code: 'hr_manager', label: 'HR Manager' },
  { code: 'department_head', label: 'Department Head' },
  { code: 'team_lead', label: 'Team Lead' },
  { code: 'employee', label: 'Employee' },
  { code: 'intern', label: 'Intern' },
  { code: 'custom_roles', label: 'Custom Roles' },
] as const;
