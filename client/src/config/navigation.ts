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
  // ── 1. Dashboard ──────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: 'Dashboard',
    collapsible: false,
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },

  // ── 2. Core HR ────────────────────────────────────────────────────────────
  {
    id: 'core_hr',
    label: 'CORE HR',
    minRoles: ['organization_admin', 'hr_manager', 'department_head'],
    items: [
      { name: 'Employee', href: '/employees', icon: 'Users' },
      {
        name: 'Employee Lifecycle',
        href: '/employee-lifecycle',
        icon: 'RefreshCw',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      { name: 'Org. Structure', href: '/org-structure', icon: 'GitBranch' },
    ],
  },

  // ── 3. Recruitment ────────────────────────────────────────────────────────
  {
    id: 'recruitment',
    label: 'RECRUITMENT',
    items: [
      { name: 'Dashboard', href: '/recruitment/dashboard', icon: 'BarChart3' },
      { name: 'Interview Schedule', href: '/recruitment/interview-schedule', icon: 'Calendar' },
      { name: 'MRF Request', href: '/recruitment/mrf-request', icon: 'FilePlus' },
      {
        name: 'Job Management',
        href: '/recruitment/jobs',
        icon: 'Briefcase',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Candidate Management',
        href: '/recruitment/candidates',
        icon: 'Users',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Candidate Report',
        href: '/recruitment/candidate-report',
        icon: 'FileText',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Resume Source Screen Bank',
        href: '/recruitment/resume-bank',
        icon: 'Database',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Applicant Tracker',
        href: '/recruitment/applicant-tracker',
        icon: 'LineChart',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Assessment Management',
        href: '/recruitment/assessments',
        icon: 'Code2',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Offer Management',
        href: '/recruitment/offers',
        icon: 'FileCheck',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      { name: 'Interviewer Rating Details', href: '/recruitment/interviewer-rating', icon: 'ListChecks' },
      { name: 'Employee Referrals', href: '/recruitment/referrals', icon: 'UserPlus' },
    ],
  },

  // ── 4. Attendance ─────────────────────────────────────────────────────────
  {
    id: 'attendance',
    label: 'ATTENDANCE',
    items: [
      {
        name: 'Dashboard',
        href: '/attendance',
        icon: 'Clock',
        minRoles: ['organization_admin', 'hr_manager', 'department_head'],
      },
      {
        name: 'Live Tracking',
        href: '/live-tracking',
        icon: 'Navigation',
        minRoles: ['organization_admin', 'hr_manager', 'department_head', 'ceo'],
      },
      {
        name: 'Location Management & Mapping',
        href: '/attendance/locations',
        icon: 'MapPin',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      { name: 'Break Logs', href: '/attendance/break-logs', icon: 'Coffee' },
      {
        name: 'CEO Face Punch',
        href: '/attendance/face-punch',
        icon: 'ScanFace',
        minRoles: ['organization_admin'],
      },
    ],
  },

  // ── 5. Shift Management ───────────────────────────────────────────────────
  {
    id: 'shift_management',
    label: 'SHIFT MANAGEMENT',
    minRoles: ['organization_admin', 'hr_manager', 'department_head'],
    items: [
      { name: 'General Shift', href: '/attendance/shifts', icon: 'Clock' },
      { name: 'Roster Shift', href: '/attendance/roster-shifts', icon: 'CalendarClock' },
    ],
  },

  // ── 6. Leave Management ───────────────────────────────────────────────────
  {
    id: 'leave',
    label: 'LEAVE MANAGEMENT',
    items: [
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
        name: 'Holiday Manage',
        href: '/holidays',
        icon: 'Calendar',
        minRoles: ['organization_admin', 'hr_manager'],
      },
    ],
  },

  // ── 7. Payroll ────────────────────────────────────────────────────────────
  {
    id: 'payroll',
    label: 'PAYROLL',
    items: [
      { name: 'Dashboard', href: '/payroll', icon: 'DollarSign' },
      {
        name: 'Payroll Master Settings',
        href: '/payroll/settings',
        icon: 'Sliders',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      { name: 'Salary Revision', href: '/payroll/salary-revision', icon: 'TrendingUp' },
      {
        name: 'Payroll Processing',
        href: '/payroll/processing',
        icon: 'Activity',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      { name: 'Payslip Management', href: '/payroll/payslips', icon: 'FileText' },
      {
        name: 'Mass Salary Structure Upload',
        href: '/payroll/mass-salary-upload',
        icon: 'UploadCloud',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'Payroll Reports',
        href: '/payroll/reports',
        icon: 'BarChart3',
        minRoles: ['organization_admin', 'hr_manager'],
      },
    ],
  },

  // Standalone Settlement Management Module
  {
    id: 'settlement_management',
    label: 'SETTLEMENT MANAGEMENT',
    items: [
      {
        name: 'Exit Settlements (FnF)',
        href: '/payroll/settlements',
        icon: 'UserX',
      },
      {
        name: 'Gratuity Policy',
        href: '/payroll/gratuity',
        icon: 'Award',
      },
    ],
  },

  // ── 8. Loan Management ────────────────────────────────────────────────────
  {
    id: 'loan_management',
    label: 'LOAN MANAGEMENT',
    items: [
      {
        name: 'Loan Type Settings',
        href: '/payroll/loan-types',
        icon: 'Sliders',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      { name: 'Loan Requests & Disbursal', href: '/payroll/loans', icon: 'Percent' },
    ],
  },

  // ── 9. Expense Management ─────────────────────────────────────────────────
  {
    id: 'expense_management',
    label: 'EXPENSE MANAGEMENT',
    items: [
      { name: 'Dashboard', href: '/expenses/dashboard', icon: 'TrendingUp', minRoles: ['organization_admin', 'super_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager'] },
      { name: 'My Expenses', href: '/expenses/my-expenses', icon: 'Receipt' },
      { name: 'Approvals', href: '/expenses/approvals', icon: 'CheckCircle', minRoles: ['organization_admin', 'super_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager', 'department_head', 'manager', 'team_lead'] },
      { name: 'Finance Verification', href: '/expenses/finance-verification', icon: 'FileCheck', minRoles: ['organization_admin', 'super_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager'] },
      { name: 'Reimbursements', href: '/expenses/reimbursements', icon: 'CreditCard', minRoles: ['organization_admin', 'super_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager'] },
      { name: 'Travel Requests', href: '/expenses/travel-requests', icon: 'Compass' },
      { name: 'Travel Advances', href: '/expenses/travel-advances', icon: 'DollarSign' },
      { name: 'Mileage Claims', href: '/expenses/mileage-claims', icon: 'Car' },
      { name: 'Expense Categories', href: '/expenses/categories', icon: 'Tag', minRoles: ['organization_admin', 'hr_manager', 'super_admin', 'hr_admin', 'hr', 'ceo'] },
      { name: 'Expense Policies', href: '/expenses/policies', icon: 'ShieldCheck', minRoles: ['organization_admin', 'hr_manager', 'super_admin', 'hr_admin', 'hr', 'ceo'] },
      { name: 'Reports & Analytics', href: '/expenses/reports', icon: 'FileSpreadsheet', minRoles: ['organization_admin', 'super_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager', 'department_head', 'manager'] },
      { name: 'Settings', href: '/expenses/settings', icon: 'Sliders', minRoles: ['organization_admin', 'super_admin', 'ceo'] },
    ],
  },

  // ── 11. PMS (Performance Management System) ───────────────────────────────
  {
    id: 'pms',
    label: 'PMS',
    items: [
      {
        name: 'Dashboard',
        href: '/performance',
        icon: 'TrendingUp',
        minRoles: ['organization_admin', 'hr_manager', 'department_head'],
      },
      { name: 'Goals & OKRs', href: '/performance/goals', icon: 'Target' },
      { name: 'Reviews', href: '/performance/reviews', icon: 'MessageSquare' },
      { name: 'Appraisals', href: '/performance/appraisals', icon: 'Award' },
    ],
  },

  // ── 12. Asset Management ──────────────────────────────────────────────────
  {
    id: 'assets',
    label: 'ASSET MANAGEMENT',
    items: [
      {
        name: 'Dashboard',
        href: '/assets',
        icon: 'Package',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      { name: 'My Asset', href: '/assets/my-assets', icon: 'Inbox' },
      {
        name: 'All Asset',
        href: '/assets/list',
        icon: 'List',
        minRoles: ['organization_admin', 'hr_manager'],
      },
    ],
  },

  // ── 13. Reports & Analytics ───────────────────────────────────────────────
  {
    id: 'analytics',
    label: 'REPORTS & ANALYTICS',
    minRoles: ['organization_admin', 'hr_manager', 'department_head'],
    items: [
      { name: 'Attendance Report', href: '/analytics/attendance', icon: 'BarChart3' },
      { name: 'Timelog Report', href: '/analytics/timelog', icon: 'FileText' },
      {
        name: 'CEO Attendance Report',
        href: '/analytics/ceo-attendance',
        icon: 'UserCheck',
        minRoles: ['organization_admin'],
      },
      {
        name: 'Report Engine',
        href: '/analytics/report-engine',
        icon: 'Sparkles',
        badge: 'New',
        minRoles: ['organization_admin', 'hr_manager'],
      },
    ],
  },

  // ── 14. HR Operations ─────────────────────────────────────────────────────
  {
    id: 'hr_operations',
    label: 'HR OPERATIONS',
    minRoles: ['organization_admin', 'hr_manager'],
    items: [
      { name: 'Requests', href: '/hr-operations/requests', icon: 'Inbox' },
      { name: 'Workflow Builder', href: '/workflow', icon: 'GitBranch' },
      { name: 'Configuration', href: '/configuration', icon: 'Sliders' },
      { name: 'Announcements', href: '/hr-operations/announcements', icon: 'Megaphone' },
      { name: 'Holiday Calendar', href: '/holidays', icon: 'Calendar' },
    ],
  },

  // ── 15. Masters ───────────────────────────────────────────────────────────
  {
    id: 'masters',
    label: 'MASTERS',
    minRoles: ['organization_admin', 'hr_manager', 'super_admin'],
    collapsible: true,
    items: [
      { name: 'Company', href: '/masters?tab=company', icon: 'Building2' },
      { name: 'Location', href: '/masters?tab=location', icon: 'MapPin' },
      { name: 'Department', href: '/masters?tab=department', icon: 'Layers' },
      { name: 'Designation', href: '/masters?tab=designation', icon: 'Briefcase' },
      { name: 'General Shift', href: '/masters?tab=general-shift', icon: 'Clock' },
      { name: 'Roster Shift', href: '/masters?tab=roster-shift', icon: 'Clock' },
      { name: 'OT Rule', href: '/masters?tab=ot-rule', icon: 'Sliders' },
      { name: 'Grade', href: '/masters?tab=grade', icon: 'Award' },
      { name: 'Holiday', href: '/masters?tab=holiday', icon: 'Calendar' },
      { name: 'Employee Status', href: '/masters?tab=employee-status', icon: 'Users' },
      { name: 'Emp. Type', href: '/masters?tab=emp-type', icon: 'Users' },
      { name: 'Events', href: '/masters?tab=events', icon: 'CalendarDays' },
      { name: 'Letter & Offer Master', href: '/masters?tab=offer-templates', icon: 'FileText', badge: 'MNC' },
      { name: 'Notification Templates', href: '/masters?tab=notification-templates', icon: 'Bell' },
      { name: 'Notification Merge Codes', href: '/masters?tab=notification-merge-codes', icon: 'Code2' },
      { name: 'Break', href: '/masters?tab=break', icon: 'Coffee' },
      { name: 'Roles & Responsibility', href: '/masters?tab=roles-responsibility', icon: 'ShieldCheck' },
      { name: 'KRA Form', href: '/masters?tab=kra', icon: 'FileText' },
      { name: 'Resource Plan', href: '/masters?tab=resource-plan', icon: 'Grid' },
    ],
  },

  // ── 16. Module Management ─────────────────────────────────────────────────
  {
    id: 'module_management',
    label: 'MODULE MANAGEMENT',
    icon: 'Boxes',
    minRoles: ['organization_admin', 'hr_manager', 'super_admin'],
    collapsible: true,
    items: [
      { name: 'CEO / Admin', href: '/modules?module=ceo', icon: 'ShieldCheck' },
      { name: 'HR', href: '/modules?module=hr', icon: 'Users' },
      { name: 'Manager', href: '/modules?module=manager', icon: 'UserCheck' },
      { name: 'Team Lead', href: '/modules?module=team-lead', icon: 'UserCog' },
      { name: 'Employee', href: '/modules?module=employee', icon: 'User' },
      { name: 'Intern', href: '/modules?module=intern', icon: 'GraduationCap', badge: 'Coming Soon' },
    ],
  },

  // ── 17. Settings ──────────────────────────────────────────────────────────
  {
    id: 'settings',
    label: 'SETTINGS',
    icon: 'Settings',
    minRoles: ['organization_admin', 'hr_manager', 'super_admin'],
    collapsible: true,
    items: [
      { name: 'General Settings', href: '/settings/general', icon: 'Sliders' },
      { name: 'Attendance Module', href: '/settings/attendance-module', icon: 'Clock' },
      {
        name: 'Workflow Settings',
        href: '/settings/workflows',
        icon: 'GitBranch',
        minRoles: ['organization_admin', 'hr_manager'],
      },
      {
        name: 'ID Card Designer',
        href: '/settings/id-card-designer',
        icon: 'CreditCard',
        minRoles: ['organization_admin', 'hr_manager', 'super_admin'],
      },
      {
        name: 'Career Portal Customization',
        href: '/settings/career-customization',
        icon: 'Palette',
        minRoles: ['organization_admin', 'hr_manager'],
      },
    ],
  },
];


function matchesRole(userRoles: string[], targetRoles: Role[]): boolean {
  const normUser = userRoles.map((r) => r.toLowerCase().trim());
  return targetRoles.some((req) => {
    const normReq = (req as string).toLowerCase().trim();
    if (normReq === 'organization_admin' || normReq === 'ceo' || normReq === 'super_admin' || normReq === 'admin') {
      return (
        normUser.includes('organization_admin') ||
        normUser.includes('ceo') ||
        normUser.includes('super_admin') ||
        normUser.includes('admin')
      );
    }
    if (normReq === 'hr' || normReq === 'hr_admin' || normReq === 'hr_manager') {
      return (
        normUser.includes('hr') ||
        normUser.includes('hr_admin') ||
        normUser.includes('hr_manager')
      );
    }
    return normUser.includes(normReq);
  });
}

function getPersona(userRoles: string[]): 'ceo' | 'hr' | 'manager' | 'tl' | 'emp' {
  const norm = userRoles.map((r) => r.toLowerCase().trim());
  if (norm.includes('organization_admin') || norm.includes('ceo') || norm.includes('admin')) {
    return 'ceo';
  }
  if (norm.includes('hr') || norm.includes('hr_admin') || norm.includes('hr_manager')) {
    return 'hr';
  }
  if (norm.includes('department_head') || norm.includes('manager')) {
    return 'manager';
  }
  if (norm.includes('team_lead')) {
    return 'tl';
  }
  return 'emp';
}

function getSavedModulesState(): Record<string, Record<string, boolean>> {
  try {
    const raw = localStorage.getItem('apponext_module_management_state_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {};
}

// Section ID to Module ID mappings by persona
const SECTION_MODULE_MAP: Record<string, Partial<Record<'ceo' | 'hr' | 'manager' | 'tl' | 'emp', string>>> = {
  dashboard: { ceo: 'ceo_dashboard', hr: 'hr_dashboard', manager: 'mgr_dashboard', tl: 'tl_dashboard', emp: 'emp_dashboard' },
  core_hr: { ceo: 'ceo_core_hr', hr: 'hr_employee_management', manager: 'mgr_team_management', tl: 'tl_member_management', emp: 'emp_profile_management' },
  recruitment: { ceo: 'ceo_recruitment', hr: 'hr_recruitment_platform', manager: 'mgr_recruitment', tl: 'tl_recruitment', emp: 'emp_referrals' },
  attendance: { ceo: 'ceo_attendance', hr: 'hr_attendance_management', manager: 'mgr_attendance', tl: 'tl_attendance', emp: 'emp_attendance' },
  shift_management: { ceo: 'ceo_shift_management', hr: 'hr_shift_management', manager: 'mgr_shifts', tl: 'tl_shifts', emp: 'emp_shifts' },
  leave: { ceo: 'ceo_leave_management', hr: 'hr_leave_management', manager: 'mgr_leaves', tl: 'tl_leaves', emp: 'emp_leaves' },
  payroll: { ceo: 'ceo_payroll', hr: 'hr_payroll_management', manager: 'mgr_payroll', tl: 'tl_payroll', emp: 'emp_payslips' },
  loan_management: { ceo: 'ceo_loan_management', hr: 'hr_loan_management', manager: 'mgr_loans', tl: 'tl_loans', emp: 'emp_loans' },
  expense_management: { ceo: 'ceo_expense_management', hr: 'hr_expense_management', manager: 'mgr_expenses', tl: 'tl_expenses', emp: 'emp_expenses' },
  travel_management: { ceo: 'ceo_travel_management', hr: 'hr_travel_management', manager: 'mgr_travel', tl: 'tl_travel', emp: 'emp_travel' },
  pms: { ceo: 'ceo_pms', hr: 'hr_performance_appraisal', manager: 'mgr_pms', tl: 'tl_pms', emp: 'emp_pms' },
  assets: { ceo: 'ceo_asset_management', hr: 'hr_asset_management', manager: 'mgr_assets', tl: 'tl_assets', emp: 'emp_assets' },
  analytics: { ceo: 'ceo_reports_analytics', hr: 'hr_reports_analytics', manager: 'mgr_reports', tl: 'tl_reports', emp: 'emp_reports' },
  hr_operations: { ceo: 'ceo_hr_operations', hr: 'hr_operations_automation', manager: 'mgr_operations', tl: 'tl_operations', emp: 'emp_operations' },
  masters: { ceo: 'ceo_masters', hr: 'hr_masters_hub', manager: 'mgr_masters', tl: 'tl_masters', emp: 'emp_masters' },
};

// Item href to sub-feature ID mappings for granular sub-item hiding
const ITEM_FEATURE_MAP: Record<string, Partial<Record<'ceo' | 'hr', string>>> = {
  '/employees': { ceo: 'ceo_employee_directory' },
  '/employee-lifecycle': { ceo: 'ceo_employee_lifecycle' },
  '/settings/departments': { ceo: 'ceo_departments_governance' },
  '/settings/designations': { ceo: 'ceo_designations_matrix' },
  '/org-structure': { ceo: 'ceo_org_structure' },
  '/recruitment/dashboard': { ceo: 'ceo_recruitment_dashboard' },
  '/recruitment/interview-schedule': { ceo: 'ceo_interview_schedule' },
  '/recruitment/mrf-request': { ceo: 'ceo_mrf_approvals' },
  '/recruitment/jobs': { ceo: 'ceo_job_management' },
  '/recruitment/candidates': { ceo: 'ceo_candidate_pipeline' },
  '/recruitment/candidate-report': { ceo: 'ceo_candidate_report' },
  '/recruitment/resume-bank': { ceo: 'ceo_resume_screening' },
  '/recruitment/applicant-tracker': { ceo: 'ceo_applicant_tracker' },
  '/recruitment/assessments': { ceo: 'ceo_assessment_mgmt' },
  '/recruitment/offers': { ceo: 'ceo_offer_approvals' },
  '/recruitment/interviewer-rating': { ceo: 'ceo_interviewer_ratings' },
  '/recruitment/referrals': { ceo: 'ceo_employee_referrals' },
  '/attendance': { ceo: 'ceo_attendance_dashboard' },
  '/live-tracking': { ceo: 'ceo_live_tracking' },
  '/attendance/locations': { ceo: 'ceo_location_management' },
  '/attendance/break-logs': { ceo: 'ceo_break_logs' },
  '/attendance/shifts': { ceo: 'ceo_general_shifts' },
  '/attendance/roster-shifts': { ceo: 'ceo_roster_shifts' },
  '/leaves/approvals': { ceo: 'ceo_leave_approvals_inbox' },
  '/approvals/dashboard': { ceo: 'ceo_approvals_dashboard' },
  '/settings/leave-policies': { ceo: 'ceo_leave_policies' },
  '/holidays': { ceo: 'ceo_holiday_calendar' },
  '/payroll': { ceo: 'ceo_payroll_dashboard' },
  '/payroll/settings': { ceo: 'ceo_payroll_master_settings' },
  '/payroll/salary-revision': { ceo: 'ceo_salary_revisions' },
  '/payroll/processing': { ceo: 'ceo_payroll_processing' },
  '/payroll/payslips': { ceo: 'ceo_payslip_management' },
  '/payroll/mass-salary-upload': { ceo: 'ceo_mass_salary_upload' },
  '/payroll/reports': { ceo: 'ceo_payroll_reports' },
  '/payroll/settlements': { ceo: 'ceo_fnf_settlements' },
  '/payroll/loan-types': { ceo: 'ceo_loan_types' },
  '/payroll/loans': { ceo: 'ceo_loan_requests' },
  '/expense-claims': { ceo: 'ceo_expense_claims' },
  '/travel-requests': { ceo: 'ceo_travel_requests' },
  '/performance': { ceo: 'ceo_pms_dashboard' },
  '/performance/goals': { ceo: 'ceo_goals_okrs' },
  '/performance/reviews': { ceo: 'ceo_performance_reviews' },
  '/performance/appraisals': { ceo: 'ceo_appraisals_rewards' },
  '/assets': { ceo: 'ceo_asset_dashboard' },
  '/assets/list': { ceo: 'ceo_asset_inventory' },
  '/assets/licenses': { ceo: 'ceo_software_licenses' },
  '/analytics/attendance': { ceo: 'ceo_attendance_reports' },
  '/analytics/timelog': { ceo: 'ceo_timelog_analytics' },
  '/hr-operations/requests': { ceo: 'ceo_employee_requests' },
  '/workflow': { ceo: 'ceo_workflow_builder' },
  '/hr-operations/announcements': { ceo: 'ceo_announcements_hub' },
};

/**
 * Get visible sections filtered by role, licensing, and module toggle states
 */
export function getVisibleSections(
  userRoles: string[],
  licensedFeatures?: LicensedFeaturesResponse,
  attendanceMode?: string,
  liveTrackingEnabled?: boolean
): NavSection[] {
  const persona = getPersona(userRoles);
  const savedState = getSavedModulesState();
  const personaModules = savedState[persona] || {};

  return NAVIGATION_SECTIONS.map((section) => {
    // Check if entire section is gated to specific roles
    if (section.minRoles && section.minRoles.length > 0) {
      if (!matchesRole(userRoles, section.minRoles)) {
        return null; // Hide entire section
      }
    }

    // Check if entire section is disabled in Module Management
    const sectionModuleId = SECTION_MODULE_MAP[section.id]?.[persona];
    if (sectionModuleId && personaModules[sectionModuleId] === false) {
      return null; // Hide disabled section
    }

    // Filter items within the section
    const visibleItems = section.items
      .map((item) => {
        // Check if item is gated to specific roles
        if (item.minRoles && item.minRoles.length > 0) {
          if (!matchesRole(userRoles, item.minRoles)) {
            return null; // Hide this item
          }
        }

        // Check if item is excluded for specific roles
        if (item.excludeRoles && item.excludeRoles.length > 0) {
          if (matchesRole(userRoles, item.excludeRoles)) {
            return null; // Hide this item
          }
        }

        // Check if item is disabled in Module Management sub-features
        const itemFeatureId = ITEM_FEATURE_MAP[item.href]?.[persona as 'ceo' | 'hr'];
        if (itemFeatureId && personaModules[itemFeatureId] === false) {
          return null; // Hide this disabled feature item
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
                if (!matchesRole(userRoles, child.minRoles)) {
                  return null;
                }
              }
              if (child.excludeRoles && child.excludeRoles.length > 0) {
                if (matchesRole(userRoles, child.excludeRoles)) {
                  return null;
                }
              }
              const childFeatureId = ITEM_FEATURE_MAP[child.href]?.[persona as 'ceo' | 'hr'];
              if (childFeatureId && personaModules[childFeatureId] === false) {
                return null;
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
