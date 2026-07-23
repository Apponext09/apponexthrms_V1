/**
 * Role definitions — mirrors SYSTEM_ROLES from server config
 * Used for RBAC throughout the client application
 */

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORGANIZATION_ADMIN: 'organization_admin',
  HR_MANAGER: 'hr_manager',
  DEPARTMENT_HEAD: 'department_head',
  TEAM_LEAD: 'team_lead',
  EMPLOYEE: 'employee',
} as const;

export type Role = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Administrator',
  organization_admin: 'Organization Administrator',
  hr_manager: 'HR Manager',
  department_head: 'Department Head',
  team_lead: 'Team Lead',
  employee: 'Employee',
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 5,
  organization_admin: 4,
  hr_manager: 3,
  department_head: 2,
  team_lead: 2,
  employee: 1,
};

/**
 * Determine if roleA has higher or equal privilege level than roleB
 */
export function hasHigherOrEqualRole(roleA: Role, roleB: Role): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}
