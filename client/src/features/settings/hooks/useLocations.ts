import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import type { LocationCreate, LocationUpdate } from '@/types';

export function useLocations(page = 1, pageSize = 500, search = '', type = '', status = 'active') {
  const { selectedCompanyId } = useCompanyStore();

  return useQuery({
    queryKey: ['locations', selectedCompanyId, { page, pageSize, search, type, status }],
    queryFn: async () => {
      const response = await apiClient.get('/settings/locations', {
        params: { page, pageSize, search, type: type || undefined, status: status || 'active' },
      });
      const raw = response.data?.data || response.data?.items || [];
      const filtered = (status === 'all' || status === 'All')
        ? raw
        : (status === 'inactive' || status === 'Inactive')
        ? raw.filter((l: any) => l.status === 'inactive' || l.status === 'Inactive' || l.is_active === 'No' || l.isActive === 'No')
        : raw.filter((l: any) => l.status !== 'inactive' && l.status !== 'Inactive' && l.is_active !== 'No' && l.isActive !== 'No');

      return {
        items: filtered,
        meta: response.data?.meta,
        data: filtered,
      };
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


