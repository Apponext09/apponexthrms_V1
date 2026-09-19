/**
 * Subscription Store — Zustand persisted store for subscription plan module gating.
 *
 * Holds the list of modules enabled by the organization's active subscription plan.
 * When enabledModules is null (no plan assigned), gating is disabled -> full access.
 *
 * Usage:
 *   const { hasModule } = useSubscriptionStore();
 *   if (!hasModule('Attendance & Time Tracking')) return <UpgradePrompt />;
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SubscriptionState {
  /** Modules enabled by the org's active subscription plan. null = no plan assigned = full access. */
  enabledModules: string[] | null;

  /**
   * Whether module gating is active.
   * true  -> only modules in enabledModules are accessible
   * false -> enabledModules is null/empty -> full access (no plan assigned)
   */
  isGatingEnabled: boolean;

  /** Set the enabled modules after login/me response */
  setEnabledModules: (modules: string[] | null) => void;

  /**
   * Check if a specific module is accessible.
   * Returns true if:
   *   - gating is disabled (no plan assigned), OR
   *   - the module name is in enabledModules
   */
  hasModule: (moduleName: string) => boolean;

  /** Reset store on logout */
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      enabledModules: null,
      isGatingEnabled: false,

      setEnabledModules: (modules: string[] | null) => {
        set({
          enabledModules: modules,
          isGatingEnabled: Array.isArray(modules) && modules.length > 0,
        });
      },

      hasModule: (moduleName: string): boolean => {
        const { enabledModules, isGatingEnabled } = get();
        if (!isGatingEnabled || !enabledModules || enabledModules.length === 0) {
          // No plan assigned -> full access
          return true;
        }

        const normQuery = moduleName.toLowerCase().trim();

        // Direct match or partial match
        if (enabledModules.some((m) => m.toLowerCase().trim() === normQuery)) {
          return true;
        }

        // Check alias mapping
        const ALIAS_MAP: Record<string, string[]> = {
          'Core HR & Directory': ['core_hr', 'core', 'employee', 'employees', 'directory', 'lifecycle', 'org_structure', 'id_card'],
          'Attendance & Time Tracking': ['attendance', 'time_tracking', 'attendance_tracking', 'shifts', 'shift_management', 'tracking', 'punches'],
          'Leave Management & Approvals': ['leave', 'leaves', 'leave_management', 'holidays', 'approvals'],
          'Automated Payroll Processing': ['payroll', 'loans', 'loan_management', 'salary', 'payslips', 'settlement', 'settlement_management'],
          'Performance & OKRs': ['performance', 'pms', 'okrs', 'goals', 'appraisals', 'reviews'],
          'Recruitment & ATS': ['recruitment', 'ats', 'jobs', 'mrf', 'candidates', 'interview'],
          'Asset Lifecycle Management': ['assets', 'asset_management', 'asset'],
          'Expense Management': ['expense', 'expenses', 'expense_management', 'travel', 'claims', 'mileage', 'travel_advances'],
          'Learning Management System': ['lms', 'learning', 'courses', 'academy', 'learning_management'],
          'Custom Workflow Builder': ['workflow', 'workflow_builder'],
          'Audit & Security Logs': ['audit', 'security_logs', 'logs'],
          'Settings & RBAC': ['settings', 'rbac', 'roles', 'permissions'],
          'Marketplace & Add-ons': ['marketplace', 'addons'],
        };

        for (const [standardName, aliases] of Object.entries(ALIAS_MAP)) {
          if (enabledModules.includes(standardName)) {
            if (aliases.includes(normQuery) || standardName.toLowerCase() === normQuery) {
              return true;
            }
          }
        }

        return false;
      },

      reset: () => {
        set({ enabledModules: null, isGatingEnabled: false });
      },
    }),
    {
      name: 'hrms-subscription-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabledModules: state.enabledModules,
        isGatingEnabled: state.isGatingEnabled,
      }),
    }
  )
);
