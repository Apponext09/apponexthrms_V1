import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export interface ApplicabilityFilters {
  companyIds?: number[];
  companyLocationIds?: number[];
  departmentIds?: number[];
  gradeIds?: number[];
  employeeTypes?: string[];
  employeeIds?: number[];
}

export interface StepFormPermissions {
  isClearanceForm?: boolean;
  allowAddExtraAmount?: boolean;
  allowViewPreviousExtraAmount?: boolean;
  canSeeAssets?: boolean;
  canChangeResignationDate?: boolean;
  showNoticePeriodDetail?: boolean;
  allowEditNoticePeriodInfo?: boolean;
  showApprovalForm?: boolean;
  includeFnfTemplate?: boolean;
  recoveryAmount?: boolean;
}

export interface EscalationRecipient {
  type: 'employee' | 'reporting_officer' | 'self' | 'custom_email';
  userIds?: number[];
  departmentIds?: number[];
  customEmail?: string;
}

export interface EscalationConfig {
  ifNotApprovedWithinDays?: number;
  remindEveryDays?: number;
  scheduledDayOfMonth?: number;
  approvalMode?: 'manual' | 'auto';
  recipients?: EscalationRecipient[];
}

export interface NotificationEventConfig {
  recipients?: EscalationRecipient[];
}

export interface NotificationConfig {
  application?: NotificationEventConfig;
  approve?: NotificationEventConfig;
  reject?: NotificationEventConfig;
  cancel?: NotificationEventConfig;
}

export interface WorkflowStep {
  id: number;
  workflow_id: number;
  step_number: number;
  step_name: string;
  approver_type: 'reporting_officer' | 'employee' | 'department' | 'role';
  approver_id: number | null;
  approver_role_id: number | null;
  approver_department_id: number | null;
  formPermissions: StepFormPermissions;
  escalationConfig: EscalationConfig;
  notificationConfig: NotificationConfig;
}

export interface WorkflowSetting {
  id: number;
  workflow_name: string;
  type: string;
  approval_type: 'manual' | 'auto';
  is_active: number | boolean;
  status: string;
  applicabilityFilters: ApplicabilityFilters;
  steps: WorkflowStep[];
  created_at: string;
}

export const WORKFLOW_TYPES = [
  { value: 'leave_request', label: 'Leave Request' },
  { value: 'attendance_regularization', label: 'Attendance Regularization' },
  { value: 'full_final', label: 'Full & Final' },
  { value: 'payroll_processing', label: 'Payroll Processing' },
  { value: 'recruitment_offer', label: 'Recruitment Offer' },
  { value: 'asset_request', label: 'Asset Request' },
  { value: 'expense_claim', label: 'Expense Claim' },
  { value: 'travel_request', label: 'Travel Request' },
  { value: 'loan_request', label: 'Loan Request' },
  { value: 'profile_edit', label: 'Profile Edit' },
  { value: 'performance_review', label: 'Performance Review' },
  { value: 'shift_change', label: 'Shift Change' },
];

// --- Workflow Settings List/CRUD -----------------------------------------------

export function useWorkflowSettings(options: { type?: string; search?: string; page?: number } = {}) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['workflow-settings', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.type) params.append('type', options.type);
      if (options.search) params.append('search', options.search);
      if (options.page) params.append('page', String(options.page));
      const res = await api.get(`/workflow/settings?${params.toString()}`);
      return res.data?.data ?? res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: { workflowName: string; workflowType: string; approvalType: 'manual' | 'auto'; isActive: boolean; applicabilityFilters?: ApplicabilityFilters }) =>
      api.post('/workflow/settings', input).then(r => r.data?.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-settings'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: number; workflowName?: string; workflowType?: string; approvalType?: 'manual' | 'auto'; isActive?: boolean; applicabilityFilters?: ApplicabilityFilters }) =>
      api.patch(`/workflow/settings/${id}`, input).then(r => r.data?.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-settings'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/workflow/settings/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-settings'] }),
  });

  const fetchSetting = async (id: number): Promise<WorkflowSetting> => {
    const res = await api.get(`/workflow/settings/${id}`);
    return res.data?.data;
  };

  return { listQuery, createMutation, updateMutation, deleteMutation, fetchSetting };
}

// --- Workflow Steps -----------------------------------------------------------

export function useWorkflowSteps(workflowId: number | null) {
  const queryClient = useQueryClient();

  const stepsQuery = useQuery({
    queryKey: ['workflow-steps', workflowId],
    queryFn: async () => {
      if (!workflowId) return [];
      const res = await api.get(`/workflow/settings/${workflowId}/steps`);
      return (res.data?.data ?? []) as WorkflowStep[];
    },
    enabled: !!workflowId,
  });

  const addStepMutation = useMutation({
    mutationFn: (input: { stepType: string; stepName?: string; approverId?: number; approverRoleId?: number; approverDepartmentId?: number }) =>
      api.post(`/workflow/settings/${workflowId}/steps`, input).then(r => r.data?.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-steps', workflowId] }),
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ stepId, ...input }: { stepId: number; stepName?: string; stepType?: string; approverId?: number; approverRoleId?: number; formPermissions?: StepFormPermissions; escalationConfig?: EscalationConfig; notificationConfig?: NotificationConfig }) =>
      api.patch(`/workflow/settings/steps/${stepId}`, { workflowId, ...input }).then(r => r.data?.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-steps', workflowId] }),
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: number) => api.delete(`/workflow/settings/${workflowId}/steps/${stepId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-steps', workflowId] }),
  });

  const reorderStepsMutation = useMutation({
    mutationFn: (stepIds: number[]) =>
      api.post(`/workflow/settings/${workflowId}/steps/reorder`, { stepIds }).then(r => r.data?.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-steps', workflowId] }),
  });

  return { stepsQuery, addStepMutation, updateStepMutation, deleteStepMutation, reorderStepsMutation };
}

// --- Recipient Options --------------------------------------------------------

export function useWorkflowRecipients(query?: string) {
  return useQuery({
    queryKey: ['workflow-recipients', query],
    queryFn: async () => {
      const params = query ? `?query=${encodeURIComponent(query)}` : '';
      const res = await api.get(`/workflow/settings/recipients/options${params}`);
      const data = res.data?.data ?? { users: [], departments: [], roles: [] };

      // If roles list is sparse, fetch full access roles from RBAC service as fallback
      if (!data.roles || data.roles.length === 0) {
        try {
          const rbacRes = await api.get('/rbac/roles');
          const rbacRoles = (rbacRes.data?.data ?? rbacRes.data ?? []).map((r: any) => ({
            id: r.id,
            name: r.name,
            display_name: r.name || r.code,
            code: r.code,
          }));
          if (rbacRoles.length > 0) {
            data.roles = rbacRoles;
          }
        } catch {
          // ignore fallback error
        }
      }

      return data as {
        users: Array<{ id: number; name: string; email?: string }>;
        departments: Array<{ id: number; name: string }>;
        roles: Array<{ id: number; name: string; display_name?: string; code?: string }>;
      };
    },
    staleTime: 30000,
  });
}

// --- Applicability Options ---------------------------------------------------

export function useWorkflowApplicabilityOptions() {
  return useQuery({
    queryKey: ['workflow-applicability-options'],
    queryFn: async () => {
      const res = await api.get('/workflow/settings/applicability/options');
      return (res.data?.data ?? { companies: [], departments: [], grades: [], employeeTypes: [], employees: [] }) as {
        companies: Array<{ id: number; name: string; code?: string }>;
        departments: Array<{ id: number; name: string; code?: string }>;
        grades: Array<{ id: number; name: string; code?: string }>;
        employeeTypes: string[];
        employees: Array<{ id: number; fullName?: string; full_name?: string; employeeCode?: string; employee_code?: string }>;
      };
    },
    staleTime: 30000,
  });
}
