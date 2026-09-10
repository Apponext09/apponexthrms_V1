import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface KPIOption {
  id: string;
  label: string;
  category: string;
  iconName: string;
  defaultEnabled: boolean;
  color: string;
}

export interface ReportOption {
  id: string;
  title: string;
  path: string;
  description: string;
  iconName: string;
}

export interface QuickActionOption {
  id: string;
  label: string;
  path: string;
  iconName: string;
  category: string;
}

// ─── Fixed KPIs (always shown, not removable) ────────────────────────────────
// These 4 appear in a permanent pinned row on the dashboard.
export const FIXED_KPIS = [
  { id: 'totalHeadcount', label: 'Total Employee Count', iconName: 'Users', path: '/employees' },
  { id: 'activeDepartments', label: 'Active Departments', iconName: 'Building2', path: '/masters?tab=department' },
  { id: 'officeLocations', label: 'Office Branches', iconName: 'MapPin', path: '/masters?tab=company' },
  { id: 'monthlyPayrollCost', label: 'Est. Monthly Payroll', iconName: 'Wallet', path: '/payroll' },
] as const;

// ─── Optional KPIs (toggled from Customization tab) ──────────────────────────
export const ALL_AVAILABLE_KPIS: KPIOption[] = [
  { id: 'openJobs', label: 'Open Job Postings', category: 'Recruitment', iconName: 'Briefcase', defaultEnabled: false, color: 'text-indigo-500' },
  { id: 'pendingApprovals', label: 'Pending Approvals', category: 'Workflow', iconName: 'Clock', defaultEnabled: false, color: 'text-amber-500' },
  { id: 'newHires', label: 'New Hires', category: 'Core HR', iconName: 'UserPlus', defaultEnabled: false, color: 'text-emerald-500' },
  { id: 'onLeaveToday', label: 'On Leave Today', category: 'Leaves', iconName: 'Palmtree', defaultEnabled: false, color: 'text-sky-500' },
  { id: 'reportingOfficers', label: 'Reporting Officer', category: 'Core HR', iconName: 'UserCheck', defaultEnabled: false, color: 'text-violet-500' },
];

export const ALL_AVAILABLE_REPORTS: ReportOption[] = [
  { id: 'attendance_reports', title: 'Daily Attendance Report', path: '/analytics/attendance', description: 'Real-time punch ins, attendance percentage & biometric logs', iconName: 'FileBarChart' },
  { id: 'timelog_report', title: 'Timelog & Productivity Report', path: '/analytics/timelog', description: 'Working hours, effective time & break analysis', iconName: 'Clock' },
  { id: 'break_logs_report', title: 'Break Logs Report', path: '/attendance/break-logs', description: 'Break duration, exceedances and activity timeline', iconName: 'Coffee' },
  { id: 'live_tracking_report', title: 'Live Field Geotracking', path: '/live-tracking', description: 'GPS coordinates and live route tracking for field staff', iconName: 'Navigation' },
  { id: 'payroll_reports', title: 'Payroll & Salary Report', path: '/payroll/reports', description: 'Statutory calculations, gross/net distribution & tax deductions', iconName: 'IndianRupee' },
  { id: 'leave_burnout_report', title: 'Leave & Burnout Risk Analysis', path: '/leaves/reports/burnout-risk', description: 'Employee fatigue indicators and leave balance utilization', iconName: 'Flame' },
  { id: 'policy_acknowledgement_report', title: 'Policy Compliance & Acknowledgement', path: '/policies/reports', description: 'Employee sign-off audit, pending acknowledgements and policy version tracking', iconName: 'ShieldCheck' },
];

export const ALL_AVAILABLE_QUICK_ACTIONS: QuickActionOption[] = [
  { id: 'add_employee', label: 'Add Employee', path: '/employees', iconName: 'UserPlus', category: 'Core HR' },
  { id: 'departments', label: 'Departments', path: '/masters?tab=department', iconName: 'Building2', category: 'Core HR' },
  { id: 'designations', label: 'Designations', path: '/masters?tab=designations', iconName: 'Briefcase', category: 'Core HR' },
  { id: 'payroll', label: 'Payroll Management', path: '/payroll', iconName: 'CreditCard', category: 'Finance' },
  { id: 'policy_governance', label: 'Policy Governance', path: '/policies/manage', iconName: 'ShieldCheck', category: 'Governance' },
  { id: 'mrf_request', label: 'Create MRF Request', path: '/recruitment/mrf-request', iconName: 'FilePlus', category: 'Recruitment' },
  { id: 'leave_approvals', label: 'Approvals Inbox', path: '/leaves/approvals', iconName: 'CheckCircle', category: 'Leaves' },
  { id: 'live_tracking', label: 'Live Tracking', path: '/live-tracking', iconName: 'Navigation', category: 'Attendance' },
  //{ id: 'branding', label: 'Settings & Branding', path: '/settings/branding', iconName: 'Settings', category: 'Settings' },
  //{ id: 'assets', label: 'Asset Fleet', path: '/assets/list', iconName: 'Package', category: 'Assets' },
];

export interface DashboardSectionsConfig {
  showHeaderAddEmployee: boolean;
  showHeaderAttendanceReport: boolean;
  selectedReportId: string; // The primary report linked to the button
  showKpiSection: boolean;
  enabledKpiIds: string[]; // List of KPI IDs displayed in top grid
  showGrowthTrendChart: boolean;
  showEntityDetails: boolean;
  showRecentRoster: boolean;
  recentRosterLimit: number;
  showQuickActions: boolean;
  enabledQuickActionIds: string[];
}

const DEFAULT_CONFIG: DashboardSectionsConfig = {
  showHeaderAddEmployee: true,
  showHeaderAttendanceReport: true,
  selectedReportId: 'attendance_reports',
  showKpiSection: true,
  enabledKpiIds: [], // Optional KPIs — all off by default
  showGrowthTrendChart: true,
  showEntityDetails: true,
  showRecentRoster: true,
  recentRosterLimit: 5,
  showQuickActions: true,
  enabledQuickActionIds: ['departments', 'payroll', 'branding'],
};

interface DashboardCustomizationStore {
  config: DashboardSectionsConfig;
  updateConfig: (patch: Partial<DashboardSectionsConfig>) => void;
  toggleKpi: (kpiId: string) => void;
  toggleQuickAction: (actionId: string) => void;
  setSelectedReport: (reportId: string) => void;
  resetToDefaults: () => void;
}

export const useDashboardCustomizationStore = create<DashboardCustomizationStore>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      updateConfig: (patch) =>
        set((state) => ({
          config: { ...state.config, ...patch },
        })),
      toggleKpi: (kpiId) =>
        set((state) => {
          const current = state.config.enabledKpiIds;
          const exists = current.includes(kpiId);
          const next = exists ? current.filter((id) => id !== kpiId) : [...current, kpiId];
          return {
            config: { ...state.config, enabledKpiIds: next },
          };
        }),
      toggleQuickAction: (actionId) =>
        set((state) => {
          const current = state.config.enabledQuickActionIds;
          const exists = current.includes(actionId);
          const next = exists ? current.filter((id) => id !== actionId) : [...current, actionId];
          return {
            config: { ...state.config, enabledQuickActionIds: next },
          };
        }),
      setSelectedReport: (reportId) =>
        set((state) => ({
          config: { ...state.config, selectedReportId: reportId },
        })),
      resetToDefaults: () =>
        set(() => ({
          config: DEFAULT_CONFIG,
        })),
    }),
    {
      name: 'apponext_dashboard_customization_v2',
    }
  )
);
