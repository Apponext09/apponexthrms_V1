import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import type { OrganizationProfileCreate, OrganizationProfileUpdate } from '@/types';

const QUERY_KEY = ['company-profile'];

export function useCompanyProfile() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get('/settings/company-profile');
      return response.data;
    },
  });
}

export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OrganizationProfileUpdate) => {
      const response = await apiClient.patch('/settings/company-profile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useCreateCompanyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OrganizationProfileCreate) => {
      const response = await apiClient.post('/settings/company-profile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}


