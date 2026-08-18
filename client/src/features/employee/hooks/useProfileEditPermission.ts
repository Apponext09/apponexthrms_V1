import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export function useProfileEditPermission(employeeId?: number) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-edit-permission', employeeId],
    queryFn: async () => {
      const params = employeeId ? { employeeId } : {};
      const res = await apiClient.get('/employees/my-edit-permission', { params });
      return res.data?.data as { editUnlocked: boolean; approvedRequestId: number | null; approvedAt?: string; unlockedSection?: string | null };
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  return {
    editUnlocked: data?.editUnlocked ?? false,
    approvedRequestId: data?.approvedRequestId ?? null,
    approvedAt: data?.approvedAt ?? null,
    unlockedSection: data?.unlockedSection ?? null,
    isLoading,
    refetch,
  };
}

export function useConsumeEditPermission() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (requestId: number) => {
      await apiClient.post('/employees/consume-edit-permission/' + String(requestId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-edit-permission'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile-requests'] });
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests'] });
    },
  });

  return { consumePermission: mutateAsync, isConsuming: isPending };
}

