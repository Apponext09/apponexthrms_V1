export type SignatureMode = 'NONE' | 'ACKNOWLEDGEMENT' | 'E_SIGNATURE' | 'BOTH';

export type SignatureStatus =
  | 'PENDING'
  | 'SENT'
  | 'VIEWED'
  | 'SIGNED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'FAILED'
  | 'CANCELLED';

export interface PolicySignatureRecord {
  id: number;
  uuid: string;
  organizationId: number;
  companyId?: number | null;
  policyDocumentId: number;
  policyVersionId?: number | null;
  userId: number;
  employeeId?: number | null;
  provider: string;
  providerTransactionId: string;
  status: SignatureStatus;
  authenticationMethod?: string | null;
  initiatedAt: string;
  signedAt?: string | null;
  documentHash?: string | null;
  signedDocumentRef?: string | null;
  evidenceRef?: string | null;
  providerMetadata?: any;
  userName?: string | null;
  userEmail?: string | null;
  policyTitle?: string | null;
  policyVersion?: string | null;
}

export interface ESignInitiateResponse {
  alreadySigned: boolean;
  transactionId?: string;
  provider?: string;
  signingUrl?: string;
  status?: string;
  signature?: PolicySignatureRecord;
  message?: string;
}

export interface PolicyAttachment {
  id?: number;
  uuid?: string;
  policyDocumentId?: number;
  policyVersionId?: number | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  checksum?: string;
  isMainDocument: boolean;
  uploadedBy?: number;
  uploadedByName?: string | null;
  uploadedAt?: string;
  createdAt?: string;
}

export interface PolicySection {
  id: string;
  title: string;
  content: string;
}

export interface TargetAssignment {
  targetType: 'role' | 'department' | 'employee' | 'designation' | 'location' | 'custom' | string;
  targetId: string;
  meta?: any;
}

export interface RolePolicyRecord {
  id: number;
  roleCode?: string;
  assignedRoles?: string[];
  targetRoles?: string[];
  applicableGender?: string;
  assignments?: TargetAssignment[];
  documentRef?: string;
  category?: string;
  title: string;
  description?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  sections: PolicySection[];
  status?: 'draft' | 'published' | 'archived' | 'expired' | string;
  version?: string;
  signatureMode?: SignatureMode;
  effectiveDate?: string | null;
  reviewDate?: string | null;
  expiryDate?: string | null;
  sendNotification?: boolean;
  requireAcknowledgement?: boolean;
  allowDownload?: boolean;
  organizationId?: number | null;
  createdBy?: any;
  updatedBy?: any;
  policyAccepted?: boolean;
  policyAcceptedAt?: string | null;
  acknowledgementPercentage?: number;
  acknowledgedCount?: number;
  pendingCount?: number;
  totalTargetEmployees?: number;
  isAcknowledged?: boolean;
  signatureStatus?: SignatureStatus | null;
  signatureRecord?: PolicySignatureRecord | null;
  signedByName?: string;
  signedAt?: string;
  signatureProvider?: string;
  employeeName?: string;
  targetDepartments?: any[];
  targetEmployees?: any[];
  createdAt?: string;
  updatedAt?: string;
  attachments?: PolicyAttachment[];
  mainAttachment?: PolicyAttachment | null;
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
  policyId?: number;
  policyDocumentId?: number;
  versionNumber?: string;
  version?: string;
  title?: string;
  description?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  changeDescription?: string;
  status?: string;
  isActive?: boolean;
  createdBy?: any;
  createdByName?: string;
  updatedBy?: string;
  createdAt?: string;
  attachments?: PolicyAttachment[];
  mainAttachment?: PolicyAttachment | null;
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
  signatureStatus?: SignatureStatus | null;
  signatureProvider?: string | null;
  signedAt?: string | null;
  signatureId?: number | null;
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



