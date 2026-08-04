import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface GradeCreate {
  name: string;
  code: string;
  description?: string;
  color?: string;
  status?: 'active' | 'inactive';
}

export type GradeUpdate = Partial<GradeCreate>;

export function useGrades(page = 1, pageSize = 20, search = '', status = '') {
  return useQuery({
    queryKey: ['grades', { page, pageSize, search, status }],
    queryFn: async () => {
      const response = await apiClient.get('/settings/grades', {
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

export function useGrade(id: string | number) {
  return useQuery({
    queryKey: ['grades', id],
    queryFn: async () => {
      const response = await apiClient.get(`/settings/grades/${id}`);
      return response.data?.data || response.data;
    },
    enabled: !!id,
  });
}

export function useCreateGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GradeCreate) => {
      const response = await apiClient.post('/settings/grades', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
    },
  });
}

export function useUpdateGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: GradeUpdate }) => {
      const response = await apiClient.patch(`/settings/grades/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['grades', variables.id] });
    },
  });
}

export function useDeleteGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      await apiClient.delete(`/settings/grades/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
    },
  });
}
