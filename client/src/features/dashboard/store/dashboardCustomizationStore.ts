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

export const ALL_AVAILABLE_KPIS: KPIOption[] = [
  { id: 'totalHeadcount', label: 'Total Headcount', category: 'Core HR', iconName: 'Users', defaultEnabled: true, color: 'text-primary' },
  { id: 'activeDepartments', label: 'Active Departments', category: 'Core HR', iconName: 'Building2', defaultEnabled: true, color: 'text-blue-500' },
  { id: 'officeLocations', label: 'Office Locations', category: 'Core HR', iconName: 'MapPin', defaultEnabled: true, color: 'text-emerald-500' },
  { id: 'reportingOfficers', label: 'Reporting Officers', category: 'Core HR', iconName: 'ShieldCheck', defaultEnabled: true, color: 'text-violet-500' },
  { id: 'presentToday', label: 'Present Today', category: 'Attendance', iconName: 'UserCheck', defaultEnabled: true, color: 'text-emerald-600' },
  { id: 'onLeaveToday', label: 'On Leave Today', category: 'Leaves', iconName: 'Palmtree', defaultEnabled: false, color: 'text-amber-500' },
  { id: 'pendingApprovals', label: 'Pending Approvals', category: 'Governance', iconName: 'Clock', defaultEnabled: true, color: 'text-rose-500' },
  { id: 'openJobs', label: 'Open Job Postings', category: 'Recruitment', iconName: 'Briefcase', defaultEnabled: false, color: 'text-indigo-500' },
  { id: 'newHiresThisMonth', label: 'New Hires (This Month)', category: 'Recruitment', iconName: 'UserPlus', defaultEnabled: false, color: 'text-cyan-500' },
  { id: 'activeAssets', label: 'Assigned Assets', category: 'Assets', iconName: 'Package', defaultEnabled: false, color: 'text-teal-500' },
  { id: 'monthlyPayrollCost', label: 'Est. Monthly Payroll', category: 'Finance', iconName: 'Wallet', defaultEnabled: false, color: 'text-emerald-600' },
];

export const ALL_AVAILABLE_REPORTS: ReportOption[] = [
  { id: 'attendance_reports', title: 'Daily Attendance Report', path: '/analytics/attendance', description: 'Real-time punch ins, attendance percentage & biometric logs', iconName: 'FileBarChart' },
  { id: 'timelog_report', title: 'Timelog & Productivity Report', path: '/analytics/timelog', description: 'Working hours, effective time & break analysis', iconName: 'Clock' },
  { id: 'break_logs_report', title: 'Break Logs Report', path: '/attendance/break-logs', description: 'Break duration, exceedances and activity timeline', iconName: 'Coffee' },
  { id: 'live_tracking_report', title: 'Live Field Geotracking', path: '/live-tracking', description: 'GPS coordinates and live route tracking for field staff', iconName: 'Navigation' },
  { id: 'payroll_reports', title: 'Payroll & Salary Report', path: '/payroll/reports', description: 'Statutory calculations, gross/net distribution & tax deductions', iconName: 'DollarSign' },
  { id: 'leave_burnout_report', title: 'Leave & Burnout Risk Analysis', path: '/leaves/reports/burnout-risk', description: 'Employee fatigue indicators and leave balance utilization', iconName: 'Flame' },
];

export const ALL_AVAILABLE_QUICK_ACTIONS: QuickActionOption[] = [
  { id: 'add_employee', label: 'Add Employee', path: '/employees', iconName: 'UserPlus', category: 'Core HR' },
  { id: 'departments', label: 'Departments', path: '/settings/departments', iconName: 'Building2', category: 'Core HR' },
  { id: 'designations', label: 'Designations', path: '/settings/designations', iconName: 'Briefcase', category: 'Core HR' },
  { id: 'payroll', label: 'Payroll Management', path: '/payroll', iconName: 'CreditCard', category: 'Finance' },
  { id: 'mrf_request', label: 'Create MRF Request', path: '/recruitment/mrf-request', iconName: 'FilePlus', category: 'Recruitment' },
  { id: 'leave_approvals', label: 'Approvals Inbox', path: '/leaves/approvals', iconName: 'CheckCircle', category: 'Leaves' },
  { id: 'live_tracking', label: 'Live Tracking', path: '/live-tracking', iconName: 'Navigation', category: 'Attendance' },
  { id: 'branding', label: 'Settings & Branding', path: '/settings/branding', iconName: 'Settings', category: 'Settings' },
  { id: 'assets', label: 'Asset Fleet', path: '/assets/list', iconName: 'Package', category: 'Assets' },
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
  enabledKpiIds: ['totalHeadcount', 'activeDepartments', 'officeLocations', 'reportingOfficers'],
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
      name: 'apponext_dashboard_customization_v1',
    }
  )
);
