import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

interface InstanceListOptions {
  page?: number;
  pageSize?: number;
  status?: string;
}

export function useInstances(options: InstanceListOptions) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['workflow-instances', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.pageSize) params.append('pageSize', options.pageSize.toString());
      if (options.status) params.append('status', options.status);

      const res = await api.get(`/instances?${params.toString()}`);
      return res.data;
    },
  });

  const startWorkflow = useMutation({
    mutationFn: (input: any) =>
      api.post(`/workflows/${input.workflowCode}/start`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
    },
  });

  const cancelInstance = useMutation({
    mutationFn: ({ instanceId, reason }: { instanceId: number; reason?: string }) =>
      api.post(`/instances/${instanceId}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
    },
  });

  const fetchInstance = async (instanceId: number) => {
    const res = await api.get(`/instances/${instanceId}`);
    return res.data.data;
  };

  const fetchInstanceHistory = async (instanceId: number) => {
    const res = await api.get(`/instances/${instanceId}/history?page=1&pageSize=50`);
    return res.data;
  };

  return {
    data,
    isLoading,
    error,
    startWorkflow,
    cancelInstance,
    fetchInstance,
    fetchInstanceHistory,
  };
}

