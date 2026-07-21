import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

interface ApprovalListOptions {
  page?: number;
  pageSize?: number;
  status?: string;
}

export function useApprovals(options: ApprovalListOptions) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['approvals', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.pageSize) params.append('pageSize', options.pageSize.toString());
      if (options.status) params.append('status', options.status);

      const res = await api.get(`/approvals/pending?${params.toString()}`);
      return res.data;
    },
  });

  const approveStep = useMutation({
    mutationFn: ({ stepId, comment }: { stepId: number; comment?: string }) =>
      api.post(`/approvals/${stepId}/approve`, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  const rejectStep = useMutation({
    mutationFn: ({ stepId, reason }: { stepId: number; reason: string }) =>
      api.post(`/approvals/${stepId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  const delegateStep = useMutation({
    mutationFn: ({
      stepId,
      toUserId,
      reason,
      endDate,
    }: {
      stepId: number;
      toUserId: number;
      reason?: string;
      endDate?: string;
    }) =>
      api.post(`/approvals/${stepId}/delegate`, {
        toUserId,
        reason,
        endDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  const escalateStep = useMutation({
    mutationFn: ({
      stepId,
      toUserId,
      reason,
    }: {
      stepId: number;
      toUserId: number;
      reason?: string;
    }) =>
      api.post(`/approvals/${stepId}/escalate`, {
        toUserId,
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });

  return {
    data,
    isLoading,
    error,
    approveStep: (stepId: number, comment?: string) =>
      approveStep.mutateAsync({ stepId, comment }),
    rejectStep: (stepId: number, reason: string) =>
      rejectStep.mutateAsync({ stepId, reason }),
    delegateStep: (stepId: number, toUserId: number, reason?: string, endDate?: string) =>
      delegateStep.mutateAsync({ stepId, toUserId, reason, endDate }),
    escalateStep: (stepId: number, toUserId: number, reason?: string) =>
      escalateStep.mutateAsync({ stepId, toUserId, reason }),
  };
}

