import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ModuleType = 'all' | 'attendance' | 'payroll' | 'leave' | 'employee' | 'recruitment';

export interface FieldDef {
  key: string;
  label: string;
  group: string;
  type: string;
  module: ModuleType;
  isSensitive?: boolean;
}

export interface CustomCondition {
  fieldKey: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'starts_with'
    | 'greater_than'
    | 'less_than'
    | 'greater_than_or_equal'
    | 'less_than_or_equal'
    | 'is_empty'
    | 'is_not_empty';
  value?: any;
}

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  departments?: (string | number)[];
  employees?: (string | number)[];
  locations?: (string | number)[];
  leaveTypes?: (string | number)[];
  status?: string;
  minSalary?: number | string;
  maxSalary?: number | string;
  employmentType?: string;
  gender?: string;
  customConditions?: CustomCondition[];
  [key: string]: any;
}

export interface ReportMetadata {
  companies: { id: number; name: string }[];
  departments: { id: number; name: string }[];
  locations: { id: number; name: string }[];
  leaveTypes: { id: number; name: string }[];
  employees: { id: number; name: string }[];
}

export interface ReportColumn {
  key: string;
  label: string;
  type: string;
  isSensitive?: boolean;
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, any>[];
  total: number;
}

export interface SavedTemplate {
  id: number;
  uuid?: string;
  name: string;
  description?: string;
  module: ModuleType;
  is_shared?: boolean;
  isShared?: boolean;
  created_by?: number;
  createdBy?: number;
  updated_at?: string;
  updatedAt?: string;
  selected_fields?: string[];
  selectedFields?: string[];
  filters?: ReportFilters;
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

/** Fetch all field definitions grouped by module */
export function useReportFields() {
  return useQuery<Record<ModuleType, FieldDef[]>>({
    queryKey: ['reportFields'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/fields');
      return res.data?.data || {};
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Fetch metadata for report filters (departments, locations, leave types, employees) */
export function useReportMetadata() {
  return useQuery<ReportMetadata>({
    queryKey: ['reportMetadata'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/meta');
      return res.data?.data || { departments: [], locations: [], leaveTypes: [], employees: [] };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Run a dynamic report */
export function useRunReport() {
  return useMutation<
    ReportResult,
    Error,
    { module: ModuleType; fields: string[]; filters: ReportFilters; limit?: number }
  >({
    mutationFn: async (params) => {
      const res = await apiClient.post('/reports/run', params);
      if (!res.data?.success) throw new Error(res.data?.error || 'Report failed');
      return res.data.data as ReportResult;
    },
  });
}

/** Fetch all saved templates */
export function useReportTemplates() {
  return useQuery<SavedTemplate[]>({
    queryKey: ['reportTemplates'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/templates');
      return res.data?.data || [];
    },
  });
}

/** Save a new template */
export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation<
    SavedTemplate,
    Error,
    { name: string; description?: string; module: ModuleType; selectedFields: string[]; filters: ReportFilters; isShared?: boolean }
  >({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/reports/templates', payload);
      if (!res.data?.success) throw new Error(res.data?.error || 'Save failed');
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportTemplates'] });
    },
  });
}

/** Update an existing template */
export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation<
    SavedTemplate,
    Error,
    { id: number; name?: string; description?: string; module?: ModuleType; selectedFields?: string[]; filters?: ReportFilters; isShared?: boolean }
  >({
    mutationFn: async ({ id, ...payload }) => {
      const res = await apiClient.put(`/reports/templates/${id}`, payload);
      if (!res.data?.success) throw new Error(res.data?.error || 'Update failed');
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportTemplates'] });
    },
  });
}

/** Delete a template */
export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation<boolean, Error, number>({
    mutationFn: async (id) => {
      const res = await apiClient.delete(`/reports/templates/${id}`);
      if (!res.data?.success) throw new Error(res.data?.error || 'Delete failed');
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportTemplates'] });
    },
  });
}
