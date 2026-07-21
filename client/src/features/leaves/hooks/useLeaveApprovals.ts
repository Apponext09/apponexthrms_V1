import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

interface ApprovalApplication {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  applicationStartDate: string;
  applicationEndDate: string;
  totalDays: number;
  reasonDescription?: string;
  createdAt: string;
}

/**
 * Hook to fetch pending approvals
 */
export function useLeaveApprovals(options = {}) {
  const { page = 1, pageSize = 20 } = options as any;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leave-approvals', page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      const response = await apiClient.get(`/leaves/approvals/pending?${params}`);
      return response.data.data;
    },
  });

  return {
    applications: (data as ApprovalApplication[]) || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to approve leave
 */
export function useApproveLeave() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ applicationId, comment }: { applicationId: number; comment?: string }) => {
      setError(null);
      const response = await apiClient.post(`/leaves/approvals/${applicationId}/approve`, { comment });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-approvals'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to approve leave');
    },
  });

  return {
    approveLeave: mutateAsync,
    isLoading: isPending,
    error,
  };
}

/**
 * Hook to reject leave
 */
export function useRejectLeave() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: number; reason: string }) => {
      setError(null);
      const response = await apiClient.post(`/leaves/approvals/${applicationId}/reject`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-approvals'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to reject leave');
    },
  });

  return {
    rejectLeave: mutateAsync,
    isLoading: isPending,
    error,
  };
}

