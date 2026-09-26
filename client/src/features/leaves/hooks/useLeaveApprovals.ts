import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCompanyStore } from '@/features/settings/store/companyStore';

interface ApprovalApplication {
  id: number;
  employee_id: number;
  leave_type_id: number;
  application_start_date: string;
  application_end_date: string;
  total_days: number;
  reason_description?: string;
  status: string;
  created_at: string;
}

/**
 * Normalize approval queue response to array
 */
function normalizeApprovals(responseData: any): ApprovalApplication[] {
  if (!responseData) return [];
  const inner = responseData.data ?? responseData;
  if (Array.isArray(inner)) return inner;
  if (inner?.items && Array.isArray(inner.items)) return inner.items;
  if (Array.isArray(inner?.data)) return inner.data;
  return [];
}

/**
 * Hook to fetch pending approvals
 */
export function useLeaveApprovals(options = {}) {
  const { page = 1, pageSize = 20 } = options as any;
  const { user } = useAuthStore();
  const { selectedCompanyId } = useCompanyStore();
  const userId = user?.id || 'unknown';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leave-approvals', userId, selectedCompanyId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      const response = await apiClient.get(`/leaves/approvals/pending?${params}`);
      return response.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const applications = normalizeApprovals(data);

  return {
    applications,
    isLoading,
    error: error ? (error as any).response?.data?.error?.message ?? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to fetch processed approvals history
 */
export function useProcessedApprovals(options = {}) {
  const { page = 1, pageSize = 20 } = options as any;
  const { user } = useAuthStore();
  const { selectedCompanyId } = useCompanyStore();
  const userId = user?.id || 'unknown';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['processed-leave-approvals', userId, selectedCompanyId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      const response = await apiClient.get(`/leaves/approvals/processed?${params}`);
      return response.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const applications = normalizeApprovals(data);

  return {
    applications,
    isLoading,
    error: error ? (error as any).response?.data?.error?.message ?? (error as Error).message : null,
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
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to approve leave';
      setError(msg);
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
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to reject leave';
      setError(msg);
    },
  });

  return {
    rejectLeave: mutateAsync,
    isLoading: isPending,
    error,
  };
}
