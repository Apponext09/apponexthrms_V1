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
  license?: { module: string; feature: string }; // Optional licensing gate
  badge?: string; // Optional badge text (e.g., "New", "Beta")
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
        name: 'Onboarding',
        href: '/employee-lifecycle/onboarding',
        icon: 'UserPlus',
      },
      {
        name: 'Transfers',
        href: '/employee-lifecycle/transfers',
        icon: 'Share2',
        badge: 'Coming Soon',
      },
      {
        name: 'Offboarding',
        href: '/employee-lifecycle/offboarding',
        icon: 'UserMinus',
        badge: 'Coming Soon',
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
        name: 'My Attendance',
        href: '/attendance/my-attendance',
        icon: 'ClipboardList',
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
      },
      {
        name: 'Apply Leave',
        href: '/leaves/apply',
        icon: 'Plus',
      },
      {
        name: 'My Balance',
        href: '/leaves/balance',
        icon: 'BarChart2',
      },
      {
        name: 'Leave Approvals',
        href: '/leaves/approvals',
        icon: 'CheckCircle',
        minRoles: ['organization_admin', 'hr_manager', 'department_head'],
      },
      {
        name: 'Comp-Off',
        href: '/leaves/comp-off',
        icon: 'Clock',
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
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Admin Dashboard',
        href: '/payroll/admin-dashboard',
        icon: 'BarChart3',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Payroll Processing',
        href: '/payroll/processing',
        icon: 'Activity',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'My Payslips',
        href: '/payroll/payslips',
        icon: 'FileText',
      },
      {
        name: 'Salary Structure',
        href: '/payroll/salary-structure',
        icon: 'Layers',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Salary Revisions',
        href: '/payroll/revisions',
        icon: 'RefreshCw',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Loan Management',
        href: '/payroll/loans',
        icon: 'Percent',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Tax Declaration',
        href: '/payroll/tax-declaration',
        icon: 'FileCheck',
      },
      {
        name: 'Settlements',
        href: '/payroll/settlements',
        icon: 'UserX',
        minRoles: ['organization_admin', 'hr_manager'],
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

  // Approvals (cross-module workflow inbox)
  {
    id: 'approvals',
    label: 'APPROVALS',
    items: [
      {
        name: 'My Approvals',
        href: '/approvals',
        icon: 'CheckCircle2',
      },
      {
        name: 'Approvals Dashboard',
        href: '/approvals/dashboard',
        icon: 'BarChart3',
        minRoles: ['organization_admin', 'hr_manager', 'department_head'],
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

  // Department Head / Manager Workspace
  {
    id: 'manager-portal',
    label: 'Manager Portal',
    minRoles: ['department_head', 'hr_manager', 'organization_admin'],
    items: [
      {
        name: 'Department Dashboard',
        href: '/manager/dashboard',
        icon: 'Building2',
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
  licensedFeatures?: LicensedFeaturesResponse
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
    const item = section.items.find((i) => i.href === href);
    if (item) return item;
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
    const item = section.items.find((i) => i.href === href);
    if (item) {
      if (item.href !== '/dashboard' && section.id !== 'dashboard') {
        breadcrumbs.push({ label: section.label, href: section.items[0]?.href || '#' });
        breadcrumbs.push({ label: item.name, href: item.href });
      }
      break;
    }
  }

  return breadcrumbs;
}
