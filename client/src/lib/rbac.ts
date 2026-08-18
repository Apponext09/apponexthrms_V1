/**
 * RBAC utilities and hooks for role/permission checking
 */

import { useAuthStore } from '@/features/auth/store/authStore';
import type { Role } from '@/config/roles';

/**
 * Check if the given roles array includes a required role
 * Harmonizes 'organization_admin' and 'ceo' so both have full admin/CEO privileges
 */
export function hasRole(roles: string[], requiredRole: Role | string): boolean {
  const normRoles = roles.map((r) => r.toLowerCase().trim());
  const normRequired = (requiredRole as string).toLowerCase().trim();

  // CEO and Organization Admin are synonymous
  if (normRequired === 'organization_admin' || normRequired === 'ceo') {
    return (
      normRoles.includes('organization_admin') ||
      normRoles.includes('ceo') ||
      normRoles.includes('admin')
    );
  }

  // HR Admin, HR, and HR Manager on dashboard
  if (normRequired === 'hr' || normRequired === 'hr_admin') {
    return (
      normRoles.includes('hr') ||
      normRoles.includes('hr_admin') ||
      normRoles.includes('hr_manager')
    );
  }

  return normRoles.includes(normRequired);
}

/**
 * Check if the given roles array includes any of the required roles
 */
export function hasAnyRole(roles: string[], requiredRoles: (Role | string)[]): boolean {
  return requiredRoles.some((role) => hasRole(roles, role));
}

/**
 * Check if the given roles array includes all of the required roles
 */
export function hasAllRoles(roles: string[], requiredRoles: (Role | string)[]): boolean {
  return requiredRoles.every((role) => hasRole(roles, role));
}

/**
 * Check if the given permissions array includes a required permission
 */
export function hasPermission(permissions: string[], requiredPermission: string): boolean {
  return permissions.includes(requiredPermission) || permissions.includes('*');
}

/**
 * Check if the given permissions array includes any of the required permissions
 */
export function hasAnyPermission(permissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some((perm) => hasPermission(permissions, perm));
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
    hasRole: (role: Role | string) => hasRole(userRoles, role),
    hasAnyRole: (roles: (Role | string)[]) => hasAnyRole(userRoles, roles),
    hasAllRoles: (roles: (Role | string)[]) => hasAllRoles(userRoles, roles),
    hasPermission: (permission: string) => hasPermission(userPermissions, permission),
    hasAnyPermission: (permissions: string[]) => hasAnyPermission(userPermissions, permissions),
  };
}

/**
 * Hook to check if user has any admin-level role
 */
export function useIsAdmin() {
  const { hasAnyRole } = useRbac();
  return hasAnyRole(['super_admin', 'organization_admin', 'ceo', 'hr_manager', 'hr_admin', 'hr']);
}

/**
 * Hook to check if user is a super admin
 */
export function useIsSuperAdmin() {
  const { hasRole } = useRbac();
  return hasRole('super_admin');
}
