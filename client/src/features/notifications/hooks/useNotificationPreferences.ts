import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export const useNotificationPreferences = () => {
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/preferences');
      return response.data;
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (input: any) => {
      const response = await apiClient.patch('/notifications/preferences', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });

  return {
    preferences: preferencesQuery.data,
    isLoading: preferencesQuery.isLoading,
    error: preferencesQuery.error,

    updatePreferences: updatePreferencesMutation.mutate,
    updatePreferencesLoading: updatePreferencesMutation.isPending,

    refetch: preferencesQuery.refetch,
  };
};
