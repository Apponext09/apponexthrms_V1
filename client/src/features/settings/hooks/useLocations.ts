import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import type { LocationCreate, LocationUpdate } from '@/types';

export function useLocations(page = 1, pageSize = 20, search = '', type = '', status = '') {
  return useQuery({
    queryKey: ['locations', { page, pageSize, search, type, status }],
    queryFn: async () => {
      const response = await apiClient.get('/settings/locations', {
        params: { page, pageSize, search, type: type || undefined, status: status || undefined },
      });
      return response.data;
    },
  });
}

export function useLocation(id: string | number) {
  return useQuery({
    queryKey: ['locations', id],
    queryFn: async () => {
      const response = await apiClient.get(`/settings/locations/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LocationCreate) => {
      const response = await apiClient.post('/settings/locations', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: LocationUpdate }) => {
      const response = await apiClient.patch(`/settings/locations/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations', variables.id] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      await apiClient.delete(`/settings/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useRestoreLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await apiClient.post(`/settings/locations/${id}/restore`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}


