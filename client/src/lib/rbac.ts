/**
 * RBAC utilities and hooks for role/permission checking
 */

import { useAuthStore } from '@/features/auth/store/authStore';
import type { Role } from '@/config/roles';

/**
 * Check if the given roles array includes a required role
 */
export function hasRole(roles: string[], requiredRole: Role): boolean {
  return roles.includes(requiredRole);
}

/**
 * Check if the given roles array includes any of the required roles
 */
export function hasAnyRole(roles: string[], requiredRoles: Role[]): boolean {
  return requiredRoles.some((role) => roles.includes(role));
}

/**
 * Check if the given roles array includes all of the required roles
 */
export function hasAllRoles(roles: string[], requiredRoles: Role[]): boolean {
  return requiredRoles.every((role) => roles.includes(role));
}

/**
 * Check if the given permissions array includes a required permission
 */
export function hasPermission(permissions: string[], requiredPermission: string): boolean {
  return permissions.includes(requiredPermission);
}

/**
 * Check if the given permissions array includes any of the required permissions
 */
export function hasAnyPermission(permissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some((perm) => permissions.includes(perm));
}

/**
 * Hook to get RBAC utilities for the current user
 */
export function useRbac() {
  const { user } = useAuthStore();

  const userRoles = user?.roles || [];
  const userPermissions = user?.permissions || [];

  return {
    user,
    roles: userRoles,
    permissions: userPermissions,
    hasRole: (role: Role) => hasRole(userRoles, role),
    hasAnyRole: (roles: Role[]) => hasAnyRole(userRoles, roles),
    hasAllRoles: (roles: Role[]) => hasAllRoles(userRoles, roles),
    hasPermission: (permission: string) => hasPermission(userPermissions, permission),
    hasAnyPermission: (permissions: string[]) => hasAnyPermission(userPermissions, permissions),
  };
}

/**
 * Hook to check if user has any admin-level role
 */
export function useIsAdmin() {
  const { hasAnyRole } = useRbac();
  return hasAnyRole(['super_admin', 'organization_admin', 'hr_manager', 'hr_admin']);
}

/**
 * Hook to check if user is a super admin
 */
export function useIsSuperAdmin() {
  const { hasRole } = useRbac();
  return hasRole('super_admin');
}
