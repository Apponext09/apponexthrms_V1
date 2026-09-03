/**
 * Security Utilities — RBAC helpers and authorization checks
 *
 * Use these utilities for:
 * - Conditional rendering based on roles/permissions
 * - Authorization checks before API calls
 * - Role hierarchy validation
 * - Audit logging
 */

import { useAuthStore } from '@/features/auth/store/authStore';
import { SYSTEM_ROLES, hasHigherOrEqualRole, type Role } from '@/config/roles';

/**
 * Audit log entry for unauthorized access attempts
 */
export interface AuditLog {
  timestamp: string;
  userId: number | undefined;
  email: string | undefined;
  attempt: 'route_access' | 'api_call' | 'permission_check';
  resource: string;
  reason: string;
  userRoles: string[];
  requiredRoles?: string[];
}

/**
 * In-memory audit log (replace with backend in production)
 */
const auditLogs: AuditLog[] = [];

/**
 * Log unauthorized access attempt
 */
export function logUnauthorizedAccess(
  resource: string,
  reason: string,
  requiredRoles?: string[]
) {
  const { user } = useAuthStore.getState();
  const log: AuditLog = {
    timestamp: new Date().toISOString(),
    userId: user?.id,
    email: user?.email,
    attempt: 'route_access',
    resource,
    reason,
    userRoles: user?.roles || [],
    requiredRoles,
  };

  auditLogs.push(log);

  // In production, send to backend logging service
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    console.warn('[SECURITY] Unauthorized access attempt:', log);
    // TODO: Send to backend logging endpoint
    // fetch('/api/v1/audit/log', { method: 'POST', body: JSON.stringify(log) })
  }
}

/**
 * Get audit logs (for debugging)
 */
export function getAuditLogs(): AuditLog[] {
  return [...auditLogs];
}

/**
 * Clear audit logs
 */
export function clearAuditLogs() {
  auditLogs.length = 0;
}

/**
 * Check if user has admin privileges
 * Includes: super_admin, organization_admin, ceo, hr_admin, hr, hr_manager
 */
export function isAdminLevel(roles: string[]): boolean {
  const adminRoles = [
    SYSTEM_ROLES.SUPER_ADMIN,
    SYSTEM_ROLES.ORGANIZATION_ADMIN,
    SYSTEM_ROLES.CEO,
    SYSTEM_ROLES.HR_ADMIN,
    SYSTEM_ROLES.HR,
    SYSTEM_ROLES.HR_MANAGER,
  ];
  return roles.some((role) => (adminRoles as string[]).includes(role));
}

/**
 * Check if user has manager privileges
 * Includes: all admin roles + department_head, manager
 */
export function isManagerLevel(roles: string[]): boolean {
  return (
    isAdminLevel(roles) ||
    roles.some((role) =>
      ([SYSTEM_ROLES.DEPARTMENT_HEAD, SYSTEM_ROLES.MANAGER] as string[]).includes(role)
    )
  );
}

/**
 * Check if user has team lead privileges
 * Includes: all manager roles + team_lead
 */
export function isTeamLeadLevel(roles: string[]): boolean {
  return (
    isManagerLevel(roles) || roles.includes(SYSTEM_ROLES.TEAM_LEAD)
  );
}

/**
 * Check if user has employee privileges (all roles have employee access)
 */
export function hasEmployeeAccess(roles: string[]): boolean {
  return roles.length > 0;
}

/**
 * Check if user can access a specific resource based on data ownership
 *
 * Example:
 * - Employee can only access their own data
 * - Manager can access their department's data
 * - Admin can access all data
 */
export function canAccessResource(
  userRoles: string[],
  resourceOwnerId: number,
  currentUserId: number,
  resourceOrgId?: number,
  userOrgId?: number
): boolean {
  // Admins can access everything
  if (isAdminLevel(userRoles)) {
    return true;
  }

  // Organization check - user must be in same org
  if (resourceOrgId && userOrgId && resourceOrgId !== userOrgId) {
    logUnauthorizedAccess(
      `resource:${resourceOwnerId}`,
      'Organization mismatch',
      ['organization_admin']
    );
    return false;
  }

  // Ownership check - user can access own data
  if (resourceOwnerId === currentUserId) {
    return true;
  }

  // Manager can access subordinate data (implement based on hierarchy)
  if (isManagerLevel(userRoles)) {
    // TODO: Check if resourceOwnerId is in current user's department
    return true;
  }

  logUnauthorizedAccess(
    `resource:${resourceOwnerId}`,
    'Insufficient access level',
    ['organization_admin']
  );
  return false;
}

/**
 * Hook for authorization context (replaces useRbac for more features)
 */
export function useAuthorization() {
  const { user, isAuthenticated } = useAuthStore();
  const roles = user?.roles || [];
  const permissions = user?.permissions || [];

  return {
    user,
    isAuthenticated,
    roles,
    permissions,

    // Role checks
    isAdmin: isAdminLevel(roles),
    isManager: isManagerLevel(roles),
    isTeamLead: isTeamLeadLevel(roles),
    hasEmployeeAccess: hasEmployeeAccess(roles),

    // Resource access
    canAccessResource: (
      resourceOwnerId: number,
      resourceOrgId?: number
    ) =>
      canAccessResource(
        roles,
        resourceOwnerId,
        user?.id || 0,
        resourceOrgId,
        user?.organizationId
      ),

    // Role hierarchy
    hasHigherOrEqualPrivilege: (compareToRole: Role): boolean =>
      roles.some((userRole) =>
        hasHigherOrEqualRole(userRole as Role, compareToRole)
      ),

    // Logging
    logAccess: (resource: string, reason: string) => {
      logUnauthorizedAccess(resource, reason);
    },
  };
}

/**
 * Advanced role check with hierarchy
 * Returns true if user has equal or higher privilege than required role
 */
export function hasPrivilegeLevel(
  userRoles: string[],
  requiredRole: Role
): boolean {
  return userRoles.some((userRole) =>
    hasHigherOrEqualRole(userRole as Role, requiredRole)
  );
}

/**
 * Check if all required roles are present (strict check)
 */
export function hasAllRoles(userRoles: string[], requiredRoles: Role[]): boolean {
  return requiredRoles.every((required) =>
    userRoles.includes(required as string)
  );
}

/**
 * Check if any required role is present
 */
export function hasAnyRole(userRoles: string[], requiredRoles: Role[]): boolean {
  return requiredRoles.some((required) =>
    userRoles.includes(required as string)
  );
}

/**
 * Verify token validity before making API calls
 */
export function isTokenValid(): boolean {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;

  try {
    // Basic JWT validation (decode without verification)
    // For production, backend should validate JWT signature
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds

    return Date.now() < expirationTime;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Get time until token expiration in seconds
 */
export function getTokenExpirationTime(): number {
  const token = localStorage.getItem('accessToken');
  if (!token) return 0;

  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    const expirationTime = payload.exp * 1000;
    const now = Date.now();

    return Math.max(0, Math.floor((expirationTime - now) / 1000));
  } catch (error) {
    return 0;
  }
}

/**
 * Check if token is about to expire (within 5 minutes)
 */
export function isTokenExpiringSoon(): boolean {
  const secondsUntilExpiry = getTokenExpirationTime();
  return secondsUntilExpiry < 300; // 5 minutes
}

/**
 * Safe API call — checks auth before making request
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  requiredRoles?: string[],
  requiredPermissions?: string[]
): Promise<T | null> {
  const { user } = useAuthStore.getState();

  // Check authentication
  if (!user) {
    console.warn('[Security] API call rejected: User not authenticated');
    return null;
  }

  // Check roles
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasAnyRole(user.roles, requiredRoles as Role[])) {
      logUnauthorizedAccess('api_call', 'Insufficient role', requiredRoles);
      return null;
    }
  }

  // Check permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPerms = requiredPermissions.every(
      (perm) =>
        user.permissions.includes(perm) || user.permissions.includes('*')
    );
    if (!hasAllPerms) {
      logUnauthorizedAccess('api_call', 'Insufficient permissions', requiredPermissions);
      return null;
    }
  }

  // Make the API call
  try {
    return await apiCall();
  } catch (error) {
    console.error('[Security] API call failed:', error);
    throw error;
  }
}

/**
 * Role-based feature flags
 * Use to conditionally enable/disable features based on role
 */
export function isFeatureAvailable(
  feature: 'payroll' | 'recruitment' | 'performance' | 'assets' | 'analytics',
  userRoles: string[]
): boolean {
  const featureRoles: Record<string, string[]> = {
    payroll: [
      SYSTEM_ROLES.ORGANIZATION_ADMIN,
      SYSTEM_ROLES.CEO,
      SYSTEM_ROLES.HR_ADMIN,
      SYSTEM_ROLES.HR,
      SYSTEM_ROLES.HR_MANAGER,
      SYSTEM_ROLES.SUPER_ADMIN,
    ],
    recruitment: [
      SYSTEM_ROLES.ORGANIZATION_ADMIN,
      SYSTEM_ROLES.CEO,
      SYSTEM_ROLES.HR_ADMIN,
      SYSTEM_ROLES.HR,
      SYSTEM_ROLES.HR_MANAGER,
      SYSTEM_ROLES.SUPER_ADMIN,
    ],
    performance: [
      SYSTEM_ROLES.ORGANIZATION_ADMIN,
      SYSTEM_ROLES.CEO,
      SYSTEM_ROLES.HR_ADMIN,
      SYSTEM_ROLES.HR,
      SYSTEM_ROLES.HR_MANAGER,
      SYSTEM_ROLES.MANAGER,
      SYSTEM_ROLES.DEPARTMENT_HEAD,
      SYSTEM_ROLES.TEAM_LEAD,
      SYSTEM_ROLES.SUPER_ADMIN,
    ],
    assets: [
      SYSTEM_ROLES.ORGANIZATION_ADMIN,
      SYSTEM_ROLES.CEO,
      SYSTEM_ROLES.HR_ADMIN,
      SYSTEM_ROLES.HR,
      SYSTEM_ROLES.HR_MANAGER,
      SYSTEM_ROLES.SUPER_ADMIN,
    ],
    analytics: [
      SYSTEM_ROLES.ORGANIZATION_ADMIN,
      SYSTEM_ROLES.CEO,
      SYSTEM_ROLES.HR_ADMIN,
      SYSTEM_ROLES.HR,
      SYSTEM_ROLES.HR_MANAGER,
      SYSTEM_ROLES.SUPER_ADMIN,
    ],
  };

  const allowedRoles = featureRoles[feature] || [];
  return userRoles.some((role) => allowedRoles.includes(role));
}
