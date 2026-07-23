import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import type { DepartmentCreate, DepartmentUpdate } from '@/types';

interface DepartmentManagerAssignment {
  id: number;
  employeeId: number;
  firstName: string;
  lastName: string;
  managerType: 'department_manager' | 'team_lead' | 'hr_contact';
  isPrimary: boolean;
  directReports: number;
}

export function useDepartments(page = 1, pageSize = 20, search = '', status = '') {
  return useQuery({
    queryKey: ['departments', { page, pageSize, search, status }],
    queryFn: async () => {
      const response = await apiClient.get('/settings/departments', {
        params: { page, pageSize, search, status: status || undefined },
      });
      return {
        items: response.data.data || [],
        meta: response.data.meta,
        data: response.data.data || [],
      };
    },
  });
}

export function useDepartment(id: string | number) {
  return useQuery({
    queryKey: ['departments', id],
    queryFn: async () => {
      const response = await apiClient.get(`/settings/departments/${id}`);
      return response.data?.data || response.data;
    },
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: DepartmentCreate) => {
      const response = await apiClient.post('/settings/departments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: DepartmentUpdate }) => {
      const response = await apiClient.patch(`/settings/departments/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['departments', variables.id] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      await apiClient.delete(`/settings/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useDepartmentManagers(departmentId: string | number) {
  return useQuery({
    queryKey: ['department-managers', departmentId],
    queryFn: async () => {
      const response = await apiClient.get(`/settings/departments/${departmentId}/managers`);
      return (response.data?.data || []) as DepartmentManagerAssignment[];
    },
    enabled: !!departmentId,
  });
}

export function useAssignDepartmentManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ departmentId, employeeId, managerType, isPrimary = false }: { departmentId: string | number; employeeId: number; managerType: DepartmentManagerAssignment['managerType']; isPrimary?: boolean; }) => {
      const response = await apiClient.post(`/settings/departments/${departmentId}/managers`, {
        employeeId,
        managerType,
        isPrimary,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['department-managers', variables.departmentId] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useRestoreDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await apiClient.post(`/settings/departments/${id}/restore`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}


