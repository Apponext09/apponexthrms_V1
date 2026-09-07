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

  // Finance role
  if (normRequired === 'finance' || normRequired === 'finance_manager') {
    return (
      normRoles.includes('finance') ||
      normRoles.includes('finance_manager')
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

/**
 * Hook to check if user can manage a specific role
 * Ensures users cannot grant roles higher than their own
 */
export function useCanManageRole() {
  const { user, roles: userRoles } = useRbac();

  return (targetRole: Role | string): boolean => {
    if (!user) return false;

    // Super admin can manage all roles
    if (userRoles.includes('super_admin')) return true;

    // Organization admin can manage all roles except super_admin
    if (userRoles.includes('organization_admin') || userRoles.includes('ceo')) {
      return targetRole !== 'super_admin';
    }

    // HR admin can only manage lower roles
    const ROLE_HIERARCHY: Record<string, number> = {
      super_admin: 5,
      organization_admin: 4,
      ceo: 4,
      hr_admin: 4,
      hr: 4,
      hr_manager: 3,
      support: 3,
      finance: 3,
      finance_manager: 3,
      department_head: 2,
      manager: 2,
      team_lead: 2,
      employee: 1,
      consultant: 1,
      intern: 0,
    };

    const userMaxLevel = Math.max(...userRoles.map((r) => ROLE_HIERARCHY[r] || 0));
    const targetLevel = ROLE_HIERARCHY[targetRole as string] || 0;

    return userMaxLevel > targetLevel;
  };
}

/**
 * Check if user can access resource based on organization
 */
export function useCanAccessOrganization() {
  const { user, roles: userRoles } = useRbac();

  return (organizationId: number | string): boolean => {
    if (!user) return false;

    // Super admin can access any organization
    if (userRoles.includes('super_admin')) return true;

    // Other users can only access their own organization
    return user.organizationId === Number(organizationId);
  };
}

/**
 * Check if user can access employee data
 */
export function useCanAccessEmployee() {
  const { user, roles: userRoles } = useRbac();

  return (employeeId: number | string, employeeOrgId?: number): boolean => {
    if (!user) return false;

    // Admin can access any employee in their org
    if (userRoles.includes('organization_admin') ||
        userRoles.includes('ceo') ||
        userRoles.includes('hr_admin') ||
        userRoles.includes('hr') ||
        userRoles.includes('hr_manager') ||
        userRoles.includes('super_admin')) {
      // Check org match
      if (employeeOrgId && employeeOrgId !== user.organizationId && !userRoles.includes('super_admin')) {
        return false;
      }
      return true;
    }

    // Manager can access team members
    if (userRoles.includes('manager') || userRoles.includes('department_head')) {
      // TODO: Implement department hierarchy check
      return true;
    }

    // Team lead can access team members
    if (userRoles.includes('team_lead')) {
      // TODO: Implement team hierarchy check
      return true;
    }

    // Employee can only access their own data
    return user.employeeId === Number(employeeId);
  };
}
