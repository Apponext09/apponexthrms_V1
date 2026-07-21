// Cache TTLs (in seconds)
export const CACHE_TTL = {
  PERMISSION: 60, // 1 minute
  USER: 300, // 5 minutes
  ORGANIZATION: 3600, // 1 hour
  ROLE: 1800, // 30 minutes
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Password policy defaults (can be overridden per organization)
export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: true,
  PASSWORD_EXPIRY_DAYS: null,
  PASSWORD_HISTORY_COUNT: 5,
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  SESSION_TIMEOUT_MINUTES: 30,
} as const;

// Status enums
export const STATUS = {
  USER: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    INVITED: 'invited',
    LOCKED: 'locked',
    SUSPENDED: 'suspended',
  },
  ORGANIZATION: {
    TRIAL: 'trial',
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled',
  },
  SESSION: {
    ACTIVE: 'active',
    REVOKED: 'revoked',
    EXPIRED: 'expired',
  },
} as const;

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
} as const;

// Event names (for event bus)
export const EVENTS = {
  // Auth events
  USER_CREATED: 'user.created',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  SESSION_CREATED: 'session.created',
  SESSION_REVOKED: 'session.revoked',
  PASSWORD_CHANGED: 'password.changed',

  // RBAC events
  ROLE_CREATED: 'role.created',
  ROLE_UPDATED: 'role.updated',
  ROLE_DELETED: 'role.deleted',
  PERMISSION_ASSIGNED: 'permission.assigned',
  PERMISSION_REVOKED: 'permission.revoked',

  // Workflow events (Phase 2)
  WORKFLOW_INSTANCE_STARTED: 'workflow.instance.started',
  WORKFLOW_STEP_ACTIVATED: 'workflow.step.activated',
  WORKFLOW_STEP_APPROVED: 'workflow.step.approved',
  WORKFLOW_STEP_REJECTED: 'workflow.step.rejected',
  WORKFLOW_INSTANCE_COMPLETED: 'workflow.instance.completed',
  WORKFLOW_INSTANCE_CANCELLED: 'workflow.instance.cancelled',
  WORKFLOW_ESCALATED: 'workflow.escalated',
  WORKFLOW_DELEGATED: 'workflow.delegated',

  // Notification events (Phase 2)
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_QUEUED: 'notification.queued',
  NOTIFICATION_FAILED: 'notification.failed',
} as const;

// Permission scopes
export const PERMISSION_SCOPES = {
  ORGANIZATION: 'organization',
  PLATFORM: 'platform',
} as const;

// System role codes
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORGANIZATION_ADMIN: 'organization_admin',
  HR_MANAGER: 'hr_manager',
  DEPARTMENT_HEAD: 'department_head',
  EMPLOYEE: 'employee',
} as const;

// Audit action types
export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  RESTORE: 'RESTORE',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  ASSIGN_ROLE: 'ASSIGN_ROLE',
  REVOKE_ROLE: 'REVOKE_ROLE',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
} as const;

// Device types
export const DEVICE_TYPES = {
  WEB: 'web',
  MOBILE_IOS: 'mobile_ios',
  MOBILE_ANDROID: 'mobile_android',
  DESKTOP: 'desktop',
  TABLET: 'tablet',
} as const;

// Login methods
export const LOGIN_METHODS = {
  EMAIL_PASSWORD: 'email_password',
  MOBILE_PASSWORD: 'mobile_password',
  OTP: 'otp',
  SSO: 'sso',
  RECOVERY_CODE: 'recovery_code',
} as const;
