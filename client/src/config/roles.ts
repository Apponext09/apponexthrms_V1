/**
 * Role definitions — mirrors SYSTEM_ROLES from server config
 * Used for RBAC throughout the client application
 */

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORGANIZATION_ADMIN: 'organization_admin',
  CEO: 'ceo',
  HR_ADMIN: 'hr_admin',
  HR: 'hr',
  HR_MANAGER: 'hr_manager', // Display: "Support" — uses /hr/* portal
  SUPPORT: 'support',
  DEPARTMENT_HEAD: 'department_head',
  TEAM_LEAD: 'team_lead',
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  INTERN: 'intern',          // Internship portal — /intern/*
  CONSULTANT: 'consultant',  // Consultant portal — /consultant/*
  FINANCE: 'finance',        // Finance portal — /finance/*
} as const;

export type Role = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];


export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrator',
  organization_admin: 'CEO',
  ceo: 'CEO',
  hr_admin: 'HR',
  hr: 'HR',
  hr_manager: 'HR',           // HR persona — uses /dashboard Admin portal
  support: 'Support',         // Support persona — uses /hr/* portal
  department_head: 'Manager',
  manager: 'Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
  intern: 'Intern',
  consultant: 'Consultant',
  finance: 'Finance',
};

export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 5,
  organization_admin: 4,
  ceo: 4,
  hr_admin: 4,
  hr: 4,
  hr_manager: 3,  // Support
  support: 3,
  finance: 3,
  department_head: 2,
  manager: 2,
  team_lead: 2,
  employee: 1,
  consultant: 1,  // same tier as employee
  intern: 0,      // lowest tier
};

/**
 * Determine if roleA has higher or equal privilege level than roleB
 */
export function hasHigherOrEqualRole(roleA: Role, roleB: Role): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}
