// System Roles (12 required + Super Admin platform role)
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'organization_admin',
  HR_MANAGER: 'hr_manager',
  RECRUITMENT_MANAGER: 'recruitment_manager',
  TEAM_LEAD: 'team_lead',
  REPORTING_MANAGER: 'reporting_manager',
  EMPLOYEE: 'employee',
  CONSULTANT: 'consultant',
  INTERN: 'intern',
  CLIENT: 'client',
  AUDITOR: 'auditor',
  FINANCE: 'finance',
} as const;

export const SYSTEM_ROLE_CODES = Object.values(SYSTEM_ROLES);

// Export performance permissions
export * from './performance.permissions.js';

// Permission module catalog (will grow as phases 2-18 are built)
export const PERMISSION_MODULES = {
  AUTH: 'auth',
  RBAC: 'rbac',
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  EMPLOYEES: 'employee',
  RECRUITMENT: 'recruitment',
  ATTENDANCE: 'attendance',
  LEAVE: 'leave',
  PAYROLL: 'payroll',
  PERFORMANCE: 'performance',
  LEARNING: 'learning',
  PROJECTS: 'projects',
  EXPENSES: 'expenses',
  ASSETS: 'assets',
  HELPDESK: 'helpdesk',
  ANALYTICS: 'analytics',
  AUDIT: 'audit',
} as const;

// Standard permission resources
export const PERMISSION_RESOURCES = {
  PROFILE: 'profile',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  SETTINGS: 'settings',
  DEVICES: 'devices',
  SESSIONS: 'sessions',
  HISTORY: 'history',
} as const;

// Standard permission actions
export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  EXPORT: 'export',
} as const;

// User statuses
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;

// Employment types
export const EMPLOYMENT_TYPE = {
  FULL_TIME: 'full_time',
  PART_TIME: 'part_time',
  CONTRACT: 'contract',
  CONSULTANT: 'consultant',
  INTERN: 'intern',
} as const;

// Employment status
export const EMPLOYMENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_LEAVE: 'on_leave',
  RELIEVED: 'relieved',
  TERMINATED: 'terminated',
} as const;

// Organization status
export const ORGANIZATION_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
} as const;

// Plan tiers
export const PLAN_TIER = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

// Login methods
export const LOGIN_METHOD = {
  PASSWORD: 'password',
  OTP_EMAIL: 'otp_email',
  OTP_SMS: 'otp_sms',
  SSO_GOOGLE: 'sso_google',
  SSO_MICROSOFT: 'sso_microsoft',
  MFA_TOTP: 'mfa_totp',
} as const;

// Login status
export const LOGIN_STATUS = {
  SUCCESS: 'success',
  FAILED_PASSWORD: 'failed_password',
  FAILED_OTP: 'failed_otp',
  FAILED_MFA: 'failed_mfa',
  BLOCKED_IP: 'blocked_ip',
  ACCOUNT_LOCKED: 'account_locked',
} as const;

// Device types
export const DEVICE_TYPE = {
  WEB: 'web',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  API: 'api',
} as const;

// OTP purposes
export const OTP_PURPOSE = {
  LOGIN: 'login',
  MFA_BACKUP: 'mfa_backup',
  EMAIL_VERIFICATION: 'email_verification',
  MOBILE_VERIFICATION: 'mobile_verification',
  PASSWORD_RESET: 'password_reset',
} as const;

// SSO providers
export const SSO_PROVIDER = {
  GOOGLE: 'google',
  MICROSOFT: 'microsoft',
} as const;

// API error codes
export const ERROR_CODE = {
  INVALID_CREDENTIALS: 'invalid_credentials',
  INVALID_EMAIL: 'invalid_email',
  INVALID_OTP: 'invalid_otp',
  OTP_EXPIRED: 'otp_expired',
  OTP_MAX_ATTEMPTS: 'otp_max_attempts',
  MFA_REQUIRED: 'mfa_required',
  MFA_INVALID: 'mfa_invalid',
  USER_NOT_FOUND: 'user_not_found',
  USER_INACTIVE: 'user_inactive',
  ACCOUNT_LOCKED: 'account_locked',
  PASSWORD_EXPIRED: 'password_expired',
  MUST_CHANGE_PASSWORD: 'must_change_password',
  PASSWORD_POLICY_VIOLATION: 'password_policy_violation',
  DUPLICATE_EMAIL: 'duplicate_email',
  DUPLICATE_MOBILE: 'duplicate_mobile',
  ROLE_NOT_FOUND: 'role_not_found',
  PERMISSION_DENIED: 'permission_denied',
  ORGANIZATION_NOT_FOUND: 'organization_not_found',
  INVALID_TOKEN: 'invalid_token',
  TOKEN_EXPIRED: 'token_expired',
  SESSION_EXPIRED: 'session_expired',
  DEVICE_NOT_FOUND: 'device_not_found',
  VALIDATION_ERROR: 'validation_error',
  INTERNAL_ERROR: 'internal_error',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  RATE_LIMITED: 'rate_limited',
  IP_RESTRICTED: 'ip_restricted',
} as const;
