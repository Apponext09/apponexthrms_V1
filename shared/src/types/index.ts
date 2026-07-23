// Re-export all types
export * from './leave.types.js';

// JWT Claims
export interface JwtClaims {
  sub: string; // user UUID
  oid: string; // organization UUID
  sid: string; // session UUID
  iat: number;
  exp: number;
}

// Auth-related
export interface User {
  id: number;
  uuid: string;
  organizationId: number;
  employeeId: number | null;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  roles?: string[];
  mobile: string | null;
  mobileCountryCode: string | null;
  status: string; // enum
  emailVerifiedAt: string | null;
  mobileVerifiedAt: string | null;
  mfaEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  lastPasswordChangedAt: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AuthSession {
  id: number;
  uuid: string;
  organizationId: number;
  userId: number;
  refreshTokenHash: string;
  deviceId: string | null;
  deviceName: string | null;
  deviceType: string;
  userAgent: string;
  ipAddress: string;
  location: string | null;
  isTrusted: boolean;
  lastActiveAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  createdAt: string;
}

export interface LoginHistory {
  id: number;
  organizationId: number | null;
  userId: number | null;
  emailAttempted: string;
  loginMethod: string;
  status: string;
  ipAddress: string;
  userAgent: string;
  deviceId: string | null;
  sessionId: number | null;
  createdAt: string;
}

export interface SsoIdentity {
  id: number;
  organizationId: number;
  userId: number;
  provider: string;
  providerUserId: string;
  providerEmail: string;
  linkedAt: string;
  lastUsedAt: string | null;
}

// RBAC
export interface Role {
  id: number;
  uuid: string;
  organizationId: number | null;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  isPlatformRole: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Permission {
  id: number;
  code: string; // e.g., "employee.profile.read"
  module: string;
  resource: string;
  action: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: number;
  organizationId: number;
  userId: number;
  roleId: number;
  assignedBy: number;
  assignedAt: string;
  expiresAt: string | null;
}

// Organization
export interface Organization {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  industry: string | null;
  companySize: string | null;
  timezone: string;
  locale: string;
  status: string; // enum
  planTier: string;
  allowedIpRanges: string[] | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// Employee (minimal for now, extended in Phase 2)
export interface Employee {
  id: number;
  uuid: string;
  organizationId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  personalEmail: string | null;
  phone: string | null;
  dateOfJoining: string;
  employmentType: string;
  employmentStatus: string;
  reportingManagerId: number | null;
  department: string | null;
  designation: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// Audit Log
export interface AuditLog {
  id: number;
  organizationId: number;
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: string | number;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

// Pagination
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// Auth Context
export interface AuthContext {
  user: User | null;
  organization: Organization | null;
  permissions: string[];
  roles: string[];
  accessToken: string | null;
  status: 'idle' | 'authenticating' | 'authenticated' | 'unauthenticated';
  error: string | null;
}

// Password Policy
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  passwordExpiryDays: number | null;
  passwordHistoryCount: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  mfaRequired: boolean;
}
