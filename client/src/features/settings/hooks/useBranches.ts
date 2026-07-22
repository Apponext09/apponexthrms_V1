import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import type { BranchCreate, BranchUpdate } from '@/types';

export function useBranches(page = 1, pageSize = 20, search = '', status = '') {
  return useQuery({
    queryKey: ['branches', { page, pageSize, search, status }],
    queryFn: async () => {
      const response = await apiClient.get('/settings/branches', {
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

export function useBranch(id: string | number) {
  return useQuery({
    queryKey: ['branches', id],
    queryFn: async () => {
      const response = await apiClient.get(`/settings/branches/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BranchCreate) => {
      const response = await apiClient.post('/settings/branches', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: BranchUpdate }) => {
      const response = await apiClient.patch(`/settings/branches/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['branches', variables.id] });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await apiClient.delete(`/settings/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useRestoreBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await apiClient.post(`/settings/branches/${id}/restore`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}


