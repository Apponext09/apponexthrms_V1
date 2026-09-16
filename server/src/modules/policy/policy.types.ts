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

export interface PolicySignature {
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
  initiatedAt: Date | string;
  signedAt?: Date | string | null;
  documentHash?: string | null;
  signedDocumentRef?: string | null;
  evidenceRef?: string | null;
  providerMetadata?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  userName?: string | null;
  userEmail?: string | null;
  policyTitle?: string | null;
  policyVersion?: string | null;
}

export interface PolicyAttachment {
  id: number;
  uuid: string;
  organizationId: number;
  companyId?: number | null;
  policyDocumentId: number;
  policyVersionId?: number | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  checksum: string;
  isMainDocument: boolean;
  uploadedBy: number;
  uploadedByName?: string | null;
  uploadedAt: Date | string;
  createdAt?: Date | string;
}

export interface PolicyAttachmentInput {
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  checksum: string;
  isMainDocument?: boolean;
}

export interface PolicyDocument {
  id: number;
  uuid: string;
  organizationId: number;
  companyId?: number | null;
  title: string;
  description?: string | null;
  category: string;
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  version: string;
  signatureMode?: SignatureMode;
  isActive: boolean;
  applicableGender?: 'all' | 'male' | 'female' | 'other' | string;
  applicableDepartmentIds?: number[];
  applicableEmployeeIds?: (number | string)[];
  applicableDesignationIds?: (number | string)[];
  customScope?: Record<string, any>;
  createdBy: number;
  updatedBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  attachments?: PolicyAttachment[];
  mainAttachment?: PolicyAttachment | null;
}

export interface PolicyRoleMapping {
  id: number;
  uuid: string;
  organizationId: number;
  companyId?: number | null;
  policyDocumentId: number;
  roleCode: string;
  roleId?: number | null;
  isMandatory: boolean;
  createdBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface EmployeePolicyAcceptance {
  id: number;
  uuid: string;
  organizationId: number;
  companyId?: number | null;
  employeeId?: number | null;
  userId: number;
  policyDocumentId: number;
  policyVersion: string;
  acceptedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyVersionHistoryRecord {
  id: number;
  uuid: string;
  organizationId: number;
  companyId?: number | null;
  policyDocumentId: number;
  version: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  changeDescription?: string | null;
  createdBy: number;
  createdByName?: string | null;
  createdAt: Date | string;
  attachments?: PolicyAttachment[];
  mainAttachment?: PolicyAttachment | null;
}

export interface CreatePolicyDTO {
  title: string;
  description?: string;
  category?: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  version?: string;
  signatureMode?: SignatureMode;
  isActive?: boolean;
  applicableGender?: 'all' | 'male' | 'female' | 'other' | string;
  applicableDepartmentIds?: (number | string)[];
  applicableEmployeeIds?: (number | string)[];
  applicableDesignationIds?: (number | string)[];
  customScope?: Record<string, any>;
  changeDescription?: string;
  roleMappings: Array<{
    roleCode: string;
    isMandatory?: boolean;
  }>;
  assignments?: Array<{
    targetType: string;
    targetId: string;
  }>;
  attachments?: PolicyAttachmentInput[];
}

export interface UpdatePolicyDTO {
  title?: string;
  description?: string;
  category?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  version?: string;
  signatureMode?: SignatureMode;
  isActive?: boolean;
  applicableGender?: 'all' | 'male' | 'female' | 'other' | string;
  applicableDepartmentIds?: (number | string)[];
  applicableEmployeeIds?: (number | string)[];
  applicableDesignationIds?: (number | string)[];
  customScope?: Record<string, any>;
  changeDescription?: string;
  roleMappings?: Array<{
    roleCode: string;
    isMandatory?: boolean;
  }>;
  assignments?: Array<{
    targetType: string;
    targetId: string;
  }>;
  attachments?: PolicyAttachmentInput[];
}

export interface PolicyWithStats extends PolicyDocument {
  roleMappings: Array<{
    roleCode: string;
    isMandatory: boolean;
  }>;
  assignments?: Array<{
    targetType: string;
    targetId: string;
  }>;
  stats?: {
    totalTargetUsers: number;
    acceptedUsers: number;
    pendingUsers: number;
    compliancePercentage: number;
  };
  attachments?: PolicyAttachment[];
  mainAttachment?: PolicyAttachment | null;
}

export interface UserPolicyView extends PolicyDocument {
  isMandatory: boolean;
  isAccepted: boolean;
  acceptedAt?: Date | string | null;
  acceptedVersion?: string | null;
  isVersionCurrent: boolean;
  signatureStatus?: SignatureStatus | null;
  signatureRecord?: PolicySignature | null;
  attachments?: PolicyAttachment[];
  mainAttachment?: PolicyAttachment | null;
}

export interface TargetOptionItem {
  id: string | number;
  name: string;
  code?: string;
  description?: string;
  [key: string]: any;
}

export interface TargetOptionsData {
  roles: TargetOptionItem[];
  departments: TargetOptionItem[];
  employees: TargetOptionItem[];
  designations: TargetOptionItem[];
  locations: TargetOptionItem[];
  employeeTypes: TargetOptionItem[];
  shifts: TargetOptionItem[];
  reportingManagers: TargetOptionItem[];
}



