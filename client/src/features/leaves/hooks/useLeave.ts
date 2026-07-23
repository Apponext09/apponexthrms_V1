import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

interface LeaveApplication {
  id: number;
  uuid: string;
  employee_id: number;
  leave_type_id: number;
  application_start_date: string;
  application_end_date: string;
  total_days: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';
  reason_description?: string;
  created_at: string;
}

interface ApplyLeaveInput {
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: 'first_half' | 'second_half';
}

/**
 * Normalize response — handles paginated {items, total} or plain array
 */
function normalizeApplications(responseData: any): LeaveApplication[] {
  if (!responseData) return [];
  const inner = responseData.data ?? responseData;
  if (Array.isArray(inner)) return inner;
  if (inner?.items && Array.isArray(inner.items)) return inner.items;
  if (Array.isArray(inner?.data)) return inner.data;
  return [];
}

/**
 * Hook to apply for leave
 */
export function useApplyLeave() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: ApplyLeaveInput) => {
      setError(null);
      const response = await apiClient.post('/leaves/applications', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to apply for leave';
      setError(msg);
    },
  });

  return {
    applyLeave: mutateAsync,
    isLoading: isPending,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook to fetch leave applications
 */
export function useLeaveApplications(options = {}) {
  const { page = 1, pageSize = 20, status } = options as any;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaves', page, pageSize, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(status && { status }),
      });
      const response = await apiClient.get(`/leaves/applications?${params}`);
      return response.data;
    },
  });

  const applications = normalizeApplications(data);

  return {
    applications,
    total: data?.data?.total ?? data?.total ?? applications.length,
    isLoading,
    error: error ? (error as any).response?.data?.error?.message ?? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to fetch single leave application
 */
export function useLeaveApplication(applicationId: number | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leave', applicationId],
    queryFn: async () => {
      const response = await apiClient.get(`/leaves/applications/${applicationId}`);
      return response.data?.data ?? response.data;
    },
    enabled: applicationId !== null && applicationId > 0,
  });

  return {
    application: data || null,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

/**
 * Hook to cancel leave
 */
export function useCancelLeave() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: number; reason: string }) => {
      setError(null);
      const response = await apiClient.post(`/leaves/applications/${applicationId}/cancel`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to cancel leave';
      setError(msg);
    },
  });

  return {
    cancelLeave: mutateAsync,
    isLoading: isPending,
    error,
  };
}

/**
 * Hook to withdraw leave
 */
export function useWithdrawLeave() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: number; reason: string }) => {
      const response = await apiClient.post(`/leaves/applications/${applicationId}/withdraw`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });

  return {
    withdrawLeave: mutateAsync,
    isLoading: isPending,
  };
}
