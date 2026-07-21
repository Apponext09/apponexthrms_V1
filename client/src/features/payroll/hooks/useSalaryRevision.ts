import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export const useSalaryRevision = () => {
  const requestRevisionMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post('/payroll/revisions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
    }
  });

  const submitRevisionMutation = useMutation({
    mutationFn: (revisionId: number) =>
      apiClient.post(`/payroll/revisions/${revisionId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
    }
  });

  const approveRevisionMutation = useMutation({
    mutationFn: ({ revisionId, approverId }: { revisionId: number; approverId: number }) =>
      apiClient.post(`/payroll/revisions/${revisionId}/approve`, { approverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
    }
  });

  const rejectRevisionMutation = useMutation({
    mutationFn: ({ revisionId, reason }: { revisionId: number; reason?: string }) =>
      apiClient.post(`/payroll/revisions/${revisionId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
    }
  });

  const getRevisionQuery = (revisionId: number) =>
    useQuery({
      queryKey: ['revision', revisionId],
      queryFn: () => apiClient.get(`/payroll/revisions/${revisionId}`),
      enabled: !!revisionId
    });

  return {
    requestRevision: requestRevisionMutation.mutate,
    submitRevision: submitRevisionMutation.mutate,
    approveRevision: approveRevisionMutation.mutate,
    rejectRevision: rejectRevisionMutation.mutate,
    getRevision: getRevisionQuery,
    isLoading:
      requestRevisionMutation.isPending ||
      submitRevisionMutation.isPending ||
      approveRevisionMutation.isPending ||
      rejectRevisionMutation.isPending
  };
};

