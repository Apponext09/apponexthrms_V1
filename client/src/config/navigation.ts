/**
 * HRMS-first navigation structure
 * Defines sections, items, role requirements, and licensing gates
 */

import type { Role } from './roles';
import type { LicensedFeaturesResponse } from '@/features/licensing/api/useLicensing';
import { isFeatureLicensed } from '@/features/licensing/api/useLicensing';

export interface NavItem {
  name: string;
  href: string;
  icon: string; // lucide-react icon name (without angle brackets)
  requiresAuth?: boolean;
  minRoles?: Role[]; // If set, only these roles see it; if empty, all authenticated users see it
  excludeRoles?: Role[]; // If set, these roles will NOT see it
  attendanceModeRequired?: string[]; // If set, only visible when org attendance mode matches one of these
  requiresLiveTracking?: boolean; // If set, only visible when live_tracking_enabled is true
  license?: { module: string; feature: string }; // Optional licensing gate
  badge?: string; // Optional badge text (e.g., "New", "Beta")
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  label: string;
  icon?: string; // Optional icon for the section header
  items: NavItem[];
  minRoles?: Role[]; // If set, entire section gated to these roles
  collapsible?: boolean; // If true, section can be collapsed (default: true for subsections)
}

const NAVIGATION_SECTIONS: NavSection[] = [
  // Dashboard - always first, role-aware content inside
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: 'BarChart3',
      },
    ],
    collapsible: false,
  },

  // Core HR
  {
    id: 'core_hr',
    label: 'CORE HR',
    minRoles: ['organization_admin', 'hr_manager', 'department_head'],
    items: [
      {
        name: 'Employees',
        href: '/employees',
        icon: 'Users',
      },
      {
        name: 'Departments',
        href: '/settings/departments',
        icon: 'Building2',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Organization Structure',
        href: '/org-structure',
        icon: 'Building2',
      },
    ],
  },

  // Employee Lifecycle
  {
    id: 'employee_lifecycle',
    label: 'EMPLOYEE LIFECYCLE',
    minRoles: ['organization_admin', 'hr_manager'],
    items: [
      {
        name: 'Employee Directory & Lifecycle',
        href: '/employee-lifecycle',
        icon: 'Users',
      },
      {
        name: 'Onboarding Records',
        href: '/employee-lifecycle/onboarding',
        icon: 'UserPlus',
      },
      {
        name: 'Transfers History',
        href: '/employee-lifecycle/transfers',
        icon: 'ArrowLeftRight',
      },
      {
        name: 'Offboarding & Exits',
        href: '/employee-lifecycle/offboarding',
        icon: 'UserMinus',
      },
    ],
  },

  // Recruitment - independent top-level module
  {
    id: 'recruitment',
    label: 'RECRUITMENT',
    minRoles: ['organization_admin', 'hr_manager'],
    items: [
      {
        name: 'Dashboard',
        href: '/recruitment',
        icon: 'Target',
      },
      {
        name: 'Jobs',
        href: '/recruitment/jobs',
        icon: 'Briefcase',
      },
      {
        name: 'Candidates',
        href: '/recruitment/candidates',
        icon: 'UserCheck',
      },
    ],
  },

  // Attendance & Time
  {
    id: 'attendance',
    label: 'ATTENDANCE & TIME',
    items: [
      {
        name: 'Dashboard',
        href: '/attendance',
        icon: 'Clock',
        minRoles: ['organization_admin', 'hr_manager', 'department_head'],
      },
      {
        name: 'Live Employee Tracking',
        href: '/live-tracking',
        icon: 'Navigation',
        minRoles: ['organization_admin', 'hr_manager', 'department_head'],
        requiresLiveTracking: true,
      },
      {
        name: 'My Attendance',
        href: '/attendance/my-attendance',
        icon: 'ClipboardList',
        excludeRoles: ['organization_admin', 'hr_manager'],
        attendanceModeRequired: ['gps', 'both', 'wifi_ip'],
      },
      {
        name: 'Face Attendance',
        href: '/attendance/face-attendance',
        icon: 'Scan',
        excludeRoles: ['organization_admin', 'hr_manager'],
        attendanceModeRequired: ['face', 'both'],
      },
      {
        name: 'Location Management',
        href: '/attendance/locations',
        icon: 'MapPin',
        minRoles: ['organization_admin', 'hr_manager'],
      },
    ],
  },

  // Shift Management
  {
    id: 'shift_management',
    label: 'SHIFT MANAGEMENT',
    minRoles: ['organization_admin', 'hr_manager', 'department_head'],
    items: [
      {
        name: 'General Shifts',
        href: '/attendance/shifts',
        icon: 'Clock',
        minRoles: ['organization_admin', 'hr_manager', 'department_head'],
      },
      {
        name: 'Roster Shifts',
        href: '/attendance/roster-shifts',
        icon: 'CalendarClock',
        minRoles: ['organization_admin', 'hr_manager', 'department_head'],
      },
    ],
  },

  // Leave
  {
    id: 'leave',
    label: 'LEAVE',
    items: [
      {
        name: 'My Leave',
        href: '/leaves',
        icon: 'Palmtree',
        excludeRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Apply Leave',
        href: '/leaves/apply',
        icon: 'Plus',
        excludeRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'My Balance',
        href: '/leaves/balance',
        icon: 'BarChart2',
        excludeRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Leave Approvals',
        href: '/leaves/approvals',
        icon: 'CheckCircle',
        minRoles: ['organization_admin', 'hr_manager', 'department_head'],
      },
      {
        name: 'Approvals Dashboard',
        href: '/approvals/dashboard',
        icon: 'BarChart3',
        minRoles: ['organization_admin', 'hr_manager', 'department_head'],
      },
      {
        name: 'Leave Settings',
        href: '/settings/leave-policies',
        icon: 'Settings',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Comp-Off',
        href: '/leaves/comp-off',
        icon: 'Clock',
      },
      {
        name: 'Holiday Manage',
        href: '/holidays',
        icon: 'Calendar',
        minRoles: ['organization_admin', 'hr_manager'],
      },
    ],
  },

  // Payroll
  {
    id: 'payroll',
    label: 'PAYROLL',
    items: [
      {
        name: 'Dashboard',
        href: '/payroll',
        icon: 'DollarSign',
      },
      {
        name: 'Expense Claims',
        href: '/payroll/expense-claims',
        icon: 'Receipt',
      },
      {
        name: 'Travel Requests',
        href: '/payroll/travel-requests',
        icon: 'Compass',
      },
      {
        name: 'Salary Structure',
        href: '/payroll/salary-structure',
        icon: 'Building2',
      },
      {
        name: 'Salary Revision',
        href: '/payroll/salary-revision',
        icon: 'TrendingUp',
      },
      {
        name: 'Payroll Processing',
        href: '/payroll/processing',
        icon: 'Activity',
      },
      {
        name: 'Payslip Management',
        href: '/payroll/payslip-requests',
        icon: 'FileText',
      },
      {
        name: 'Loan Management',
        href: '/payroll/loans',
        icon: 'Percent',
      },
      {
        name: 'Settlements',
        href: '/payroll/settlements',
        icon: 'UserX',
      },
      {
        name: 'Payroll Policies',
        href: '/payroll/policies',
        icon: 'Shield',
      },
    ],
  },

  // Performance & Development
  {
    id: 'performance',
    label: 'PERFORMANCE & DEVELOPMENT',
    items: [
      {
        name: 'Dashboard',
        href: '/performance',
        icon: 'TrendingUp',
        minRoles: ['organization_admin', 'hr_manager', 'department_head'],
      },
      {
        name: 'Goals & OKRs',
        href: '/performance/goals',
        icon: 'Target',
      },
      {
        name: 'Reviews',
        href: '/performance/reviews',
        icon: 'MessageSquare',
      },
      {
        name: 'Appraisals',
        href: '/performance/appraisals',
        icon: 'Award',
      },
    ],
  },

  // Employee Engagement (NEW)
  {
    id: 'engagement',
    label: 'EMPLOYEE ENGAGEMENT',
    items: [
      {
        name: 'Recognition',
        href: '/engagement/recognition',
        icon: 'Trophy',
      },
      {
        name: 'Wall',
        href: '/engagement/wall',
        icon: 'MessageCircle',
        badge: 'Coming Soon',
      },
      {
        name: 'Surveys',
        href: '/engagement/surveys',
        icon: 'ClipboardCheck',
        badge: 'Coming Soon',
      },
      {
        name: 'eNPS',
        href: '/engagement/enps',
        icon: 'Smile',
        badge: 'Coming Soon',
      },
      {
        name: 'Badges',
        href: '/engagement/badges',
        icon: 'Badge',
        badge: 'Coming Soon',
      },
      {
        name: 'Suggestions',
        href: '/engagement/suggestions',
        icon: 'Lightbulb',
        badge: 'Coming Soon',
      },
    ],
  },

  // Assets
  {
    id: 'assets',
    label: 'ASSETS',
    items: [
      {
        name: 'Dashboard',
        href: '/assets',
        icon: 'Package',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'My Assets',
        href: '/assets/my-assets',
        icon: 'Inbox',
      },
      {
        name: 'All Assets',
        href: '/assets/list',
        icon: 'List',
        minRoles: ['organization_admin', 'hr_manager'],
      },
    ],
  },

  // Reports & Analytics (NEW hub)
  {
    id: 'analytics',
    label: 'REPORTS & ANALYTICS',
    minRoles: ['organization_admin', 'hr_manager', 'department_head'],
    items: [
      {
        name: 'Attendance Reports',
        href: '/analytics/attendance',
        icon: 'BarChart3',
      },
      {
        name: 'Timelog Report',
        href: '/analytics/timelog',
        icon: 'FileText',
      },
    ],
  },

  // HR Operations (admin-focused processes)
  {
    id: 'hr_operations',
    label: 'HR OPERATIONS',
    minRoles: ['organization_admin', 'hr_manager'],
    items: [
      {
        name: 'Workflow Builder',
        href: '/hr-operations/workflows',
        icon: 'GitBranch',
      },
      {
        name: 'Announcements',
        href: '/hr-operations/announcements',
        icon: 'Megaphone',
      },
      {
        name: 'Holiday Calendar',
        href: '/hr-operations/holidays',
        icon: 'Calendar',
        badge: 'Coming Soon',
      },
    ],
  },

  // Platform Administration (Super Admin only - pinned at bottom)
  {
    id: 'platform_admin',
    label: 'PLATFORM ADMINISTRATION',
    minRoles: ['super_admin'],
    items: [
      {
        name: 'Platform Admin',
        href: '/platform-admin',
        icon: 'Shield',
      },
    ],
    collapsible: false,
  },

  // Masters Section
  {
    id: 'masters',
    label: 'MASTERS',
    minRoles: ['organization_admin', 'hr_manager', 'super_admin'],
    items: [
      { name: 'Company', href: '/masters?tab=company', icon: 'Building2' },
      { name: 'Location', href: '/masters?tab=location', icon: 'MapPin' },
      { name: 'Custom Query Cron', href: '/masters?tab=custom-query-cron', icon: 'Zap' },
      { name: 'Department', href: '/masters?tab=department', icon: 'Layers' },
      { name: 'Designation', href: '/masters?tab=designation', icon: 'Briefcase' },
      { name: 'Policy', href: '/masters?tab=policy', icon: 'FileText' },
      { name: 'General Shift', href: '/masters?tab=general-shift', icon: 'Clock' },
      { name: 'Roster Shift', href: '/masters?tab=roster-shift', icon: 'Clock' },
      { name: 'OT Rule', href: '/masters?tab=ot-rule', icon: 'Sliders' },
      { name: 'Grade', href: '/masters?tab=grade', icon: 'Award' },
      { name: 'Holiday', href: '/masters?tab=holiday', icon: 'Calendar' },
      { name: 'Employee Status', href: '/masters?tab=employee-status', icon: 'Users' },
      { name: 'Emp. Type', href: '/masters?tab=emp-type', icon: 'Users' },
      { name: 'Events', href: '/masters?tab=events', icon: 'Calendar' },
      { name: 'Notification Templates', href: '/masters?tab=notification-templates', icon: 'Bell' },
      { name: 'Templates', href: '/masters?tab=templates', icon: 'FileText' },
      { name: 'Break', href: '/masters?tab=break', icon: 'Coffee' },
      { name: 'Roles & Responsibility', href: '/masters?tab=roles-responsibility', icon: 'ShieldCheck' },
      { name: 'Resource Plan', href: '/masters?tab=resource-plan', icon: 'Grid' },
      { name: 'Happiness Index Setting', href: '/masters?tab=happiness-index-setting', icon: 'Smile' },
    ],
    collapsible: true,
  },

  // Module Management (Admin & HR)
  {
    id: 'module_management',
    label: 'MODULE MANAGEMENT',
    minRoles: ['organization_admin', 'hr_manager', 'super_admin'],
    items: [
      {
        name: 'Modules',
        href: '/modules',
        icon: 'Boxes',
      },
      {
        name: 'Attendance Module',
        href: '/settings/attendance-module',
        icon: 'CalendarCheck',
      },
    ],
    collapsible: false,
  },
];

/**
 * Get visible sections filtered by role and licensing
 */
export function getVisibleSections(
  userRoles: string[],
  licensedFeatures?: LicensedFeaturesResponse,
  attendanceMode?: string,
  liveTrackingEnabled?: boolean
): NavSection[] {
  return NAVIGATION_SECTIONS.map((section) => {
    // Check if entire section is gated to specific roles
    if (section.minRoles && section.minRoles.length > 0) {
      if (!userRoles.some((role) => section.minRoles!.includes(role as Role))) {
        return null; // Hide entire section
      }
    }

    // Filter items within the section
    const visibleItems = section.items
      .map((item) => {
        // Check if item is gated to specific roles
        if (item.minRoles && item.minRoles.length > 0) {
          if (!userRoles.some((role) => item.minRoles!.includes(role as Role))) {
            return null; // Hide this item
          }
        }

        // Check if item is excluded for specific roles
        if (item.excludeRoles && item.excludeRoles.length > 0) {
          if (userRoles.some((role) => item.excludeRoles!.includes(role as Role))) {
            return null; // Hide this item
          }
        }

        // Check if item is gated by org attendance mode setting
        if (item.attendanceModeRequired && item.attendanceModeRequired.length > 0 && attendanceMode) {
          if (!item.attendanceModeRequired.includes(attendanceMode)) {
            return null; // Hide this item based on attendance mode
          }
        }

        // Check if item is gated by live tracking setting
        if (item.requiresLiveTracking && liveTrackingEnabled === false) {
          return null; // Hide Live Tracking tab if disabled in settings
        }

        // Check if item is gated by licensing
        if (item.license && licensedFeatures) {
          const isLicensed = isFeatureLicensed(
            licensedFeatures,
            item.license.module,
            item.license.feature
          );
          if (!isLicensed) {
            return {
              ...item,
              isLocked: true,
            };
          }
        }

        if (item.children && item.children.length > 0) {
          const visibleChildren = item.children
            .map((child) => {
              if (child.minRoles && child.minRoles.length > 0) {
                if (!userRoles.some((role) => child.minRoles!.includes(role as Role))) {
                  return null;
                }
              }
              if (child.excludeRoles && child.excludeRoles.length > 0) {
                if (userRoles.some((role) => child.excludeRoles!.includes(role as Role))) {
                  return null;
                }
              }
              return child;
            })
            .filter(Boolean);
          return { ...item, children: visibleChildren as NavItem[] };
        }

        return item;
      })
      .filter(Boolean);

    // Only include section if it has visible items
    if (visibleItems.length === 0) {
      return null;
    }

    return {
      ...section,
      items: visibleItems as NavItem[],
    };
  }).filter(Boolean) as NavSection[];
}

/**
 * Find a navigation item by href
 */
export function findNavItemByHref(href: string): NavItem | null {
  for (const section of NAVIGATION_SECTIONS) {
    for (const item of section.items) {
      if (item.href === href) return item;
      if (item.children) {
        const child = item.children.find((c) => c.href === href);
        if (child) return child;
      }
    }
  }
  return null;
}

/**
 * Get breadcrumb path for a given href
 */
export function getBreadcrumbsForHref(href: string): Array<{ label: string; href: string }> {
  const breadcrumbs: Array<{ label: string; href: string }> = [
    { label: 'Dashboard', href: '/dashboard' },
  ];

  for (const section of NAVIGATION_SECTIONS) {
    for (const item of section.items) {
      if (item.href === href) {
        if (item.href !== '/dashboard' && section.id !== 'dashboard') {
          breadcrumbs.push({ label: section.label, href: section.items[0]?.href || '#' });
          breadcrumbs.push({ label: item.name, href: item.href });
        }
        return breadcrumbs;
      }
      if (item.children) {
        const child = item.children.find((c) => c.href === href);
        if (child) {
          breadcrumbs.push({ label: section.label, href: section.items[0]?.href || '#' });
          breadcrumbs.push({ label: item.name, href: item.href });
          breadcrumbs.push({ label: child.name, href: child.href });
          return breadcrumbs;
        }
      }
    }
  }

  return breadcrumbs;
}
