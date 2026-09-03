import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LifecycleKpiItem {
  id: string;
  label: string;
  category: 'workforce' | 'onboarding' | 'movement' | 'offboarding';
  enabled: boolean;
}

export interface CustomAuditField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  category: 'onboarding' | 'transfers' | 'offboarding' | 'directory';
}

export interface LifecycleCustomizationConfig {
  // ── 1. KPI Cards ──
  kpis: Record<string, boolean>;

  // ── 2. Filters ──
  filters: {
    searchBar: boolean;
    companyFilter: boolean;
    stageFilter: boolean;
    departmentFilter: boolean;
    designationFilter: boolean;
    locationFilter: boolean;
    employmentTypeFilter: boolean;
  };

  // ── 3. Org Employee Directory Table Columns ──
  tableColumns: {
    employeeNameAvatar: boolean;
    employeeCode: boolean;
    designation: boolean;
    department: boolean;
    company: boolean;
    location: boolean;
    lifecycleStage: boolean;
    transfersCount: boolean;
    joiningDate: boolean;
    reportingManager: boolean;
    actions: boolean;
    actionViewLifecycle: boolean;
    actionTransfer: boolean;
  };

  // ── 4. Onboarding & Interview Audit Table Columns ──
  onboardingColumns: {
    employeeNameAvatar: boolean;
    employeeCode: boolean;
    interviewer: boolean;
    hrOnboarder: boolean;
    joiningDate: boolean;
    probationEndDate: boolean;
    orientationStatus: boolean;
    welcomeKitStatus: boolean;
    documentsStatus: boolean;
    interviewScore: boolean;
    lifecycleStage: boolean;
    actions: boolean;
    actionEditOnboarding: boolean;
  };

  // ── 5. Transfer Audit History Table Columns ──
  transferColumns: {
    employeeNameAvatar: boolean;
    employeeCode: boolean;
    department: boolean;
    designation: boolean;
    location: boolean;
    reportingManager: boolean;
    transfersCount: boolean;
    lastTransferDate: boolean;
    transferReason: boolean;
    actions: boolean;
    actionViewLog: boolean;
    actionExecuteTransfer: boolean;
  };

  // ── 6. Offboarding & Exit Records Table Columns ──
  offboardingColumns: {
    employeeNameAvatar: boolean;
    employeeCode: boolean;
    department: boolean;
    exitType: boolean;
    resignationDate: boolean;
    lastWorkingDay: boolean;
    noticePeriodDays: boolean;
    exitReason: boolean;
    exitInterviewer: boolean;
    assetsReturned: boolean;
    fnfStatus: boolean;
    lifecycleStage: boolean;
    actions: boolean;
    actionEditOffboarding: boolean;
  };

  // ── 7. Custom Fields per Section ──
  customFields: {
    directory: CustomAuditField[];
    onboarding: CustomAuditField[];
    transfers: CustomAuditField[];
    offboarding: CustomAuditField[];
  };

  // ── 8. Main View Tabs ──
  tabs: {
    directory: boolean;
    onboarding: boolean;
    transfers: boolean;
    offboarding: boolean;
  };
}

export const AVAILABLE_LIFECYCLE_KPIS = [
  // Primary
  { id: 'total_workforce', label: 'Total Workforce', description: 'Total headcount across all lifecycle stages', icon: 'Users', color: 'indigo' },
  { id: 'in_onboarding', label: 'In Onboarding', description: 'Employees undergoing onboarding & probation', icon: 'UserPlus', color: 'sky' },
  { id: 'transferred_events', label: 'Transferred Events', description: 'Total internal department & branch movements', icon: 'ArrowLeftRight', color: 'emerald' },
  { id: 'notice_exits', label: 'Notice & Exits', description: 'Employees serving notice or recently exited', icon: 'UserMinus', color: 'rose' },

  // Additional customizable KPIs
  { id: 'active_workforce', label: 'Active Regular Staff', description: 'Confirmed full-time staff actively working', icon: 'UserCheck', color: 'emerald' },
  { id: 'in_probation', label: 'In Probation Period', description: 'Employees in initial probation review window', icon: 'Clock', color: 'amber' },
  { id: 'confirmed_staff', label: 'Confirmed Employees', description: 'Completed probation successfully', icon: 'ShieldCheck', color: 'teal' },
  { id: 'exits_completed', label: 'Completed Exits (Alumni)', description: 'Full and final settled offboarded staff', icon: 'FileCheck', color: 'slate' },
  { id: 'dept_movements', label: 'Dept Transfer Actions', description: 'Cross-functional department realignment', icon: 'Building2', color: 'violet' },
  { id: 'location_transfers', label: 'Branch / City Transfers', description: 'Relocated between office branches', icon: 'MapPin', color: 'blue' },
  { id: 'promotion_upgrades', label: 'Promotion Upgrades', description: 'Designation & role progression events', icon: 'Briefcase', color: 'purple' },
] as const;

const DEFAULT_CONFIG: LifecycleCustomizationConfig = {
  kpis: {
    total_workforce: true,
    in_onboarding: true,
    transferred_events: true,
    notice_exits: true,
    active_workforce: false,
    in_probation: false,
    confirmed_staff: false,
    exits_completed: false,
    dept_movements: false,
    location_transfers: false,
    promotion_upgrades: false,
  },
  filters: {
    searchBar: true,
    companyFilter: true,
    stageFilter: true,
    departmentFilter: true,
    designationFilter: true,
    locationFilter: true,
    employmentTypeFilter: true,
  },
  tableColumns: {
    employeeNameAvatar: true,
    employeeCode: true,
    designation: true,
    department: true,
    company: true,
    location: true,
    lifecycleStage: true,
    transfersCount: true,
    joiningDate: true,
    reportingManager: true,
    actions: true,
    actionViewLifecycle: true,
    actionTransfer: true,
  },
  onboardingColumns: {
    employeeNameAvatar: true,
    employeeCode: true,
    interviewer: true,
    hrOnboarder: true,
    joiningDate: true,
    probationEndDate: true,
    orientationStatus: true,
    welcomeKitStatus: true,
    documentsStatus: true,
    interviewScore: true,
    lifecycleStage: true,
    actions: true,
    actionEditOnboarding: true,
  },
  transferColumns: {
    employeeNameAvatar: true,
    employeeCode: true,
    department: true,
    designation: true,
    location: true,
    reportingManager: true,
    transfersCount: true,
    lastTransferDate: true,
    transferReason: true,
    actions: true,
    actionViewLog: true,
    actionExecuteTransfer: true,
  },
  offboardingColumns: {
    employeeNameAvatar: true,
    employeeCode: true,
    department: true,
    exitType: true,
    resignationDate: true,
    lastWorkingDay: true,
    noticePeriodDays: true,
    exitReason: true,
    exitInterviewer: true,
    assetsReturned: true,
    fnfStatus: true,
    lifecycleStage: true,
    actions: true,
    actionEditOffboarding: true,
  },
  customFields: {
    directory: [],
    onboarding: [
      { id: 'candidate_ref_id', name: 'Candidate Ref ID', type: 'text', category: 'onboarding' },
      { id: 'training_buddy', name: 'Assigned Training Buddy', type: 'text', category: 'onboarding' },
    ],
    transfers: [
      { id: 'transfer_approver', name: 'Transfer Approving Officer', type: 'text', category: 'transfers' },
      { id: 'relocation_allowance', name: 'Relocation Allowance', type: 'text', category: 'transfers' },
    ],
    offboarding: [
      { id: 'exit_clearance_code', name: 'Exit Clearance Ref Code', type: 'text', category: 'offboarding' },
      { id: 'nda_acknowledged', name: 'NDA Acknowledgment', type: 'select', options: ['Yes', 'No', 'Pending'], category: 'offboarding' },
    ],
  },
  tabs: {
    directory: true,
    onboarding: true,
    transfers: true,
    offboarding: true,
  },
};

interface LifecycleCustomizationStore {
  config: LifecycleCustomizationConfig;
  updateConfig: (patch: Partial<LifecycleCustomizationConfig>) => void;
  toggleKpi: (kpiId: string, enabled?: boolean) => void;
  toggleFilter: (filterKey: keyof LifecycleCustomizationConfig['filters'], enabled?: boolean) => void;
  toggleTableColumn: (colKey: keyof LifecycleCustomizationConfig['tableColumns'], enabled?: boolean) => void;
  toggleOnboardingColumn: (colKey: keyof LifecycleCustomizationConfig['onboardingColumns'], enabled?: boolean) => void;
  toggleTransferColumn: (colKey: keyof LifecycleCustomizationConfig['transferColumns'], enabled?: boolean) => void;
  toggleOffboardingColumn: (colKey: keyof LifecycleCustomizationConfig['offboardingColumns'], enabled?: boolean) => void;
  addCustomField: (category: 'directory' | 'onboarding' | 'transfers' | 'offboarding', field: Omit<CustomAuditField, 'id' | 'category'>) => void;
  removeCustomField: (category: 'directory' | 'onboarding' | 'transfers' | 'offboarding', fieldId: string) => void;
  toggleTab: (tabKey: keyof LifecycleCustomizationConfig['tabs'], enabled?: boolean) => void;
  resetToDefaults: () => void;
}

export const useLifecycleCustomizationStore = create<LifecycleCustomizationStore>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      updateConfig: (patch) =>
        set((state) => ({
          config: { ...state.config, ...patch },
        })),
      toggleKpi: (kpiId, enabled) =>
        set((state) => {
          const current = state.config.kpis[kpiId] ?? false;
          const nextVal = enabled !== undefined ? enabled : !current;
          return {
            config: {
              ...state.config,
              kpis: { ...state.config.kpis, [kpiId]: nextVal },
            },
          };
        }),
      toggleFilter: (filterKey, enabled) =>
        set((state) => {
          const current = state.config.filters[filterKey] ?? true;
          const nextVal = enabled !== undefined ? enabled : !current;
          return {
            config: {
              ...state.config,
              filters: { ...state.config.filters, [filterKey]: nextVal },
            },
          };
        }),
      toggleTableColumn: (colKey, enabled) =>
        set((state) => {
          const current = state.config.tableColumns[colKey] ?? true;
          const nextVal = enabled !== undefined ? enabled : !current;
          return {
            config: {
              ...state.config,
              tableColumns: { ...state.config.tableColumns, [colKey]: nextVal },
            },
          };
        }),
      toggleOnboardingColumn: (colKey, enabled) =>
        set((state) => {
          const current = state.config.onboardingColumns[colKey] ?? true;
          const nextVal = enabled !== undefined ? enabled : !current;
          return {
            config: {
              ...state.config,
              onboardingColumns: { ...state.config.onboardingColumns, [colKey]: nextVal },
            },
          };
        }),
      toggleTransferColumn: (colKey, enabled) =>
        set((state) => {
          const current = state.config.transferColumns[colKey] ?? true;
          const nextVal = enabled !== undefined ? enabled : !current;
          return {
            config: {
              ...state.config,
              transferColumns: { ...state.config.transferColumns, [colKey]: nextVal },
            },
          };
        }),
      toggleOffboardingColumn: (colKey, enabled) =>
        set((state) => {
          const current = state.config.offboardingColumns[colKey] ?? true;
          const nextVal = enabled !== undefined ? enabled : !current;
          return {
            config: {
              ...state.config,
              offboardingColumns: { ...state.config.offboardingColumns, [colKey]: nextVal },
            },
          };
        }),
      addCustomField: (category, field) =>
        set((state) => {
          const newId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const newField: CustomAuditField = {
            ...field,
            id: newId,
            category,
          };
          return {
            config: {
              ...state.config,
              customFields: {
                ...state.config.customFields,
                [category]: [...(state.config.customFields[category] || []), newField],
              },
            },
          };
        }),
      removeCustomField: (category, fieldId) =>
        set((state) => ({
          config: {
            ...state.config,
            customFields: {
              ...state.config.customFields,
              [category]: (state.config.customFields[category] || []).filter((f) => f.id !== fieldId),
            },
          },
        })),
      toggleTab: (tabKey, enabled) =>
        set((state) => {
          const current = state.config.tabs[tabKey] ?? true;
          const nextVal = enabled !== undefined ? enabled : !current;
          return {
            config: {
              ...state.config,
              tabs: { ...state.config.tabs, [tabKey]: nextVal },
            },
          };
        }),
      resetToDefaults: () =>
        set(() => ({
          config: DEFAULT_CONFIG,
        })),
    }),
    {
      name: 'apponext_lifecycle_customization_v2',
    }
  )
);
