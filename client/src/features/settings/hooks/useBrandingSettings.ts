import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import type { BrandingSettingsUpdate } from '@/types';

export function useBrandingSettings() {
  return useQuery({
    queryKey: ['branding-settings'],
    queryFn: async () => {
      const response = await apiClient.get('/settings/branding');
      return response.data;
    },
  });
}

export function useUpdateBrandingSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BrandingSettingsUpdate) => {
      const response = await apiClient.patch('/settings/branding', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
    },
  });
}


