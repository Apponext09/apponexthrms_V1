import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import type { DepartmentCreate, DepartmentUpdate } from '@/types';

export function useDepartments(page = 1, pageSize = 20, search = '', status = '') {
  return useQuery({
    queryKey: ['departments', { page, pageSize, search, status }],
    queryFn: async () => {
      const response = await apiClient.get('/settings/departments', {
        params: { page, pageSize, search, status: status || undefined },
      });
      return response.data;
    },
  });
}

export function useDepartment(id: string | number) {
  return useQuery({
    queryKey: ['departments', id],
    queryFn: async () => {
      const response = await apiClient.get(`/settings/departments/${id}`);
      return response.data;
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


