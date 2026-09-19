/**
 * Route Configuration with RBAC
 *
 * This file documents all protected routes and their required roles.
 * Use this as a reference for:
 * - Understanding route hierarchy
 * - Adding new routes with correct permissions
 * - Auditing access control
 *
 * IMPORTANT: Always sync this file when adding/modifying routes in routes.tsx
 */

import type { Role } from './roles';

interface RouteConfig {
  path: string;
  name: string;
  description: string;
  allowedRoles: Role[];
  isPublic: boolean;
  requiresPermissions?: string[];
}

/**
 * PUBLIC ROUTES — No authentication required
 */
export const PUBLIC_ROUTES: RouteConfig[] = [
  {
    path: '/login',
    name: 'Login',
    description: 'User login page',
    allowedRoles: [],
    isPublic: true,
  },
  {
    path: '/unauthorized',
    name: 'Unauthorized',
    description: '403 Access Denied page',
    allowedRoles: [],
    isPublic: true,
  },
  {
    path: '/liberation/*',
    name: 'Job Reference Portal',
    description: 'Public job reference page (careers portal)',
    allowedRoles: [],
    isPublic: true,
  },
  {
    path: '/public/offers/review/:uuid',
    name: 'Public Offer Review',
    description: 'Public offer letter review page',
    allowedRoles: [],
    isPublic: true,
  },
  {
    path: '/public/assessments/take/:uuid',
    name: 'Public Assessment',
    description: 'Public assessment taking page',
    allowedRoles: [],
    isPublic: true,
  },
  {
    path: '/careers',
    name: 'Careers',
    description: 'Public careers page',
    allowedRoles: [],
    isPublic: true,
  },
];

/**
 * ADMIN PANEL ROUTES — /dashboard, /employees, /payroll, etc.
 * Primary portal for: CEO (organization_admin), HR Admin (hr_admin/hr/hr_manager)
 * Limited access for: Department Heads, Team Leads (restricted sections)
 */
export const ADMIN_PANEL_ROUTES: RouteConfig[] = [
  {
    path: '/dashboard',
    name: 'Admin Dashboard',
    description: 'Main admin/CEO dashboard with organization overview',
    allowedRoles: ['organization_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/employees',
    name: 'Employee Directory',
    description: 'View and manage all employees',
    allowedRoles: ['organization_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/org-structure',
    name: 'Organization Structure',
    description: 'View organization hierarchy',
    allowedRoles: ['organization_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager', 'super_admin', 'department_head', 'team_lead'],
    isPublic: false,
  },
  {
    path: '/attendance',
    name: 'Attendance Management',
    description: 'View and manage attendance records',
    allowedRoles: ['organization_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/leaves',
    name: 'Leave Management',
    description: 'View and manage leave policies',
    allowedRoles: ['organization_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/payroll',
    name: 'Payroll Management',
    description: 'View and manage payroll',
    allowedRoles: ['organization_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/recruitment',
    name: 'Recruitment',
    description: 'Manage job posts and candidates',
    allowedRoles: ['organization_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/settings',
    name: 'Organization Settings',
    description: 'Configure company settings',
    allowedRoles: ['organization_admin', 'ceo', 'hr_admin', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/analytics',
    name: 'Analytics & Reports',
    description: 'View organization analytics',
    allowedRoles: ['organization_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
];

/**
 * HR MANAGER PORTAL ROUTES — /hr/*
 * Rose-accented sidebar — full HR tool access
 * Allowed: hr_manager, organization_admin, super_admin
 */
export const HR_PORTAL_ROUTES: RouteConfig[] = [
  {
    path: '/hr/dashboard',
    name: 'HR Dashboard',
    description: 'HR-specific dashboard',
    allowedRoles: ['hr_manager', 'organization_admin', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/hr/employees',
    name: 'HR Employee Management',
    description: 'Manage employees from HR perspective',
    allowedRoles: ['hr_manager', 'organization_admin', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/hr/payroll',
    name: 'HR Payroll',
    description: 'Manage payroll from HR perspective',
    allowedRoles: ['hr_manager', 'organization_admin', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/hr/attendance',
    name: 'HR Attendance',
    description: 'Manage attendance from HR perspective',
    allowedRoles: ['hr_manager', 'organization_admin', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/hr/leaves/approvals',
    name: 'HR Leave Approvals',
    description: 'Approve leaves from HR perspective',
    allowedRoles: ['hr_manager', 'organization_admin', 'super_admin'],
    isPublic: false,
  },
];

/**
 * MANAGER PORTAL ROUTES — /manager/*
 * Violet-accented sidebar — department management
 * Allowed: department_head, manager, organization_admin, hr_manager, super_admin
 */
export const MANAGER_PORTAL_ROUTES: RouteConfig[] = [
  {
    path: '/manager/dashboard',
    name: 'Manager Dashboard',
    description: 'Department/team manager dashboard',
    allowedRoles: ['department_head', 'manager', 'organization_admin', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/manager/team',
    name: 'My Team',
    description: 'View team members',
    allowedRoles: ['department_head', 'manager', 'organization_admin', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/manager/attendance',
    name: 'Team Attendance',
    description: 'View team attendance',
    allowedRoles: ['department_head', 'manager', 'organization_admin', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/manager/leave-approvals',
    name: 'Leave Approvals',
    description: 'Approve team member leaves',
    allowedRoles: ['department_head', 'manager', 'organization_admin', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
];

/**
 * TEAM LEAD PORTAL ROUTES — /team-lead/*
 * Emerald-accented sidebar — team management
 * Allowed: team_lead, department_head, manager, organization_admin, hr_manager, super_admin
 */
export const TEAM_LEAD_PORTAL_ROUTES: RouteConfig[] = [
  {
    path: '/team-lead/dashboard',
    name: 'Team Lead Dashboard',
    description: 'Team lead dashboard',
    allowedRoles: ['team_lead', 'department_head', 'manager', 'organization_admin', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/team-lead/members',
    name: 'Team Members',
    description: 'View team members',
    allowedRoles: ['team_lead', 'department_head', 'manager', 'organization_admin', 'hr_manager', 'super_admin'],
    isPublic: false,
  },
];

/**
 * EMPLOYEE PORTAL ROUTES — /employee/*
 * Blue-accented sidebar — employee self-service
 * Allowed: All authenticated users
 */
export const EMPLOYEE_PORTAL_ROUTES: RouteConfig[] = [
  {
    path: '/employee/dashboard',
    name: 'Employee Dashboard',
    description: 'Employee self-service dashboard',
    allowedRoles: ['employee', 'intern', 'consultant', 'team_lead', 'manager', 'department_head', 'hr_manager', 'hr_admin', 'hr', 'organization_admin', 'ceo', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/employee/attendance',
    name: 'My Attendance',
    description: 'View personal attendance',
    allowedRoles: ['employee', 'intern', 'consultant', 'team_lead', 'manager', 'department_head', 'hr_manager', 'hr_admin', 'hr', 'organization_admin', 'ceo', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/employee/leaves',
    name: 'My Leaves',
    description: 'View and apply for leaves',
    allowedRoles: ['employee', 'intern', 'consultant', 'team_lead', 'manager', 'department_head', 'hr_manager', 'hr_admin', 'hr', 'organization_admin', 'ceo', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/employee/payroll',
    name: 'My Payroll',
    description: 'View payslips and salary information',
    allowedRoles: ['employee', 'intern', 'consultant', 'team_lead', 'manager', 'department_head', 'hr_manager', 'hr_admin', 'hr', 'organization_admin', 'ceo', 'super_admin'],
    isPublic: false,
  },
  {
    path: '/employee/profile',
    name: 'My Profile',
    description: 'View and edit personal profile',
    allowedRoles: ['employee', 'intern', 'consultant', 'team_lead', 'manager', 'department_head', 'hr_manager', 'hr_admin', 'hr', 'organization_admin', 'ceo', 'super_admin'],
    isPublic: false,
  },
];

/**
 * SUPER ADMIN ROUTES — /superadmin/*
 * System-wide administration only
 * Allowed: super_admin only
 */
export const SUPER_ADMIN_ROUTES: RouteConfig[] = [
  {
    path: '/superadmin/dashboard',
    name: 'Super Admin Dashboard',
    description: 'System-wide super admin dashboard',
    allowedRoles: ['super_admin'],
    isPublic: false,
  },
  {
    path: '/superadmin/organization',
    name: 'Organization Management',
    description: 'Manage organizations',
    allowedRoles: ['super_admin'],
    isPublic: false,
  },
  {
    path: '/superadmin/subscription',
    name: 'Subscription Management',
    description: 'Manage subscriptions',
    allowedRoles: ['super_admin'],
    isPublic: false,
  },
];

/**
 * INTERN PORTAL ROUTES — /intern/*
 * Amber-accented sidebar — internship self-service
 * Allowed: intern only
 */
export const INTERN_PORTAL_ROUTES: RouteConfig[] = [
  {
    path: '/intern/dashboard',
    name: 'Intern Dashboard',
    description: 'Intern self-service dashboard',
    allowedRoles: ['intern'],
    isPublic: false,
  },
  {
    path: '/intern/expenses',
    name: 'Intern Expense Claims',
    description: 'Submit and track personal expense claims',
    allowedRoles: ['intern'],
    isPublic: false,
  },
  {
    path: '/intern/travel-requests',
    name: 'Intern Travel Requests',
    description: 'Submit and track travel requests',
    allowedRoles: ['intern'],
    isPublic: false,
  },
  {
    path: '/intern/travel-advances',
    name: 'Intern Travel Advances',
    description: 'Submit and track travel advances',
    allowedRoles: ['intern'],
    isPublic: false,
  },
  {
    path: '/intern/mileage-claims',
    name: 'Intern Mileage Claims',
    description: 'Submit and track mileage claims',
    allowedRoles: ['intern'],
    isPublic: false,
  },
];

/**
 * CONSULTANT PORTAL ROUTES — /consultant/*
 * Violet-accented sidebar — consultant self-service
 * Allowed: consultant only
 */
export const CONSULTANT_PORTAL_ROUTES: RouteConfig[] = [
  {
    path: '/consultant/dashboard',
    name: 'Consultant Dashboard',
    description: 'Consultant self-service dashboard',
    allowedRoles: ['consultant'],
    isPublic: false,
  },
  {
    path: '/consultant/expenses',
    name: 'Consultant Expense Claims',
    description: 'Submit and track personal expense claims',
    allowedRoles: ['consultant'],
    isPublic: false,
  },
  {
    path: '/consultant/travel-requests',
    name: 'Consultant Travel Requests',
    description: 'Submit and track travel requests',
    allowedRoles: ['consultant'],
    isPublic: false,
  },
  {
    path: '/consultant/travel-advances',
    name: 'Consultant Travel Advances',
    description: 'Submit and track travel advances',
    allowedRoles: ['consultant'],
    isPublic: false,
  },
  {
    path: '/consultant/mileage-claims',
    name: 'Consultant Mileage Claims',
    description: 'Submit and track mileage claims',
    allowedRoles: ['consultant'],
    isPublic: false,
  },
];

/**
 * Get all configured routes
 */
export const ALL_ROUTES = [
  ...PUBLIC_ROUTES,
  ...ADMIN_PANEL_ROUTES,
  ...HR_PORTAL_ROUTES,
  ...MANAGER_PORTAL_ROUTES,
  ...TEAM_LEAD_PORTAL_ROUTES,
  ...EMPLOYEE_PORTAL_ROUTES,
  ...SUPER_ADMIN_ROUTES,
  ...INTERN_PORTAL_ROUTES,
  ...CONSULTANT_PORTAL_ROUTES,
];

/**
 * Check if a route is protected (requires authentication)
 */
export function isProtectedRoute(path: string): boolean {
  return !ALL_ROUTES.some(route => route.isPublic && pathMatches(path, route.path));
}

/**
 * Get allowed roles for a specific route
 */
export function getAllowedRolesForRoute(path: string): Role[] {
  const route = ALL_ROUTES.find(r => pathMatches(path, r.path));
  return route?.allowedRoles || [];
}

/**
 * Simple path matching (handles wildcards and params)
 */
function pathMatches(pathname: string, pattern: string): boolean {
  if (pattern.includes('*')) {
    const basePath = pattern.replace('/*', '').replace('/*', '');
    return pathname.startsWith(basePath);
  }
  if (pattern.includes(':')) {
    const parts = pattern.split('/').map((p, i) => p.startsWith(':') ? '[^/]+' : p);
    const regex = new RegExp(`^${parts.join('/')}$`);
    return regex.test(pathname);
  }
  return pathname === pattern;
}
