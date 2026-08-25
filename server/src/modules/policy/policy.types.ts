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
  isActive: boolean;
  applicableGender?: 'all' | 'male' | 'female' | 'other';
  applicableDepartmentIds?: number[];
  createdBy: number;
  updatedBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
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

export interface CreatePolicyDTO {
  title: string;
  description?: string;
  category?: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  version?: string;
  isActive?: boolean;
  applicableGender?: 'all' | 'male' | 'female' | 'other';
  applicableDepartmentIds?: number[];
  roleMappings: Array<{
    roleCode: string;
    isMandatory?: boolean;
  }>;
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
  isActive?: boolean;
  applicableGender?: 'all' | 'male' | 'female' | 'other';
  applicableDepartmentIds?: number[];
  roleMappings?: Array<{
    roleCode: string;
    isMandatory?: boolean;
  }>;
}

export interface PolicyWithStats extends PolicyDocument {
  roleMappings: Array<{
    roleCode: string;
    isMandatory: boolean;
  }>;
  stats?: {
    totalTargetUsers: number;
    acceptedUsers: number;
    pendingUsers: number;
    compliancePercentage: number;
  };
}

export interface UserPolicyView extends PolicyDocument {
  isMandatory: boolean;
  isAccepted: boolean;
  acceptedAt?: Date | string | null;
  acceptedVersion?: string | null;
  isVersionCurrent: boolean;
}
