import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';

interface CompOffBalance {
  id: number;
  compOffEarnedDate: string;
  compOffEarnedHours: number;
  compOffExpiresAt?: string;
  status: 'available' | 'used' | 'expired';
  reason?: string;
}

/**
 * Hook to fetch comp off balance
 */
export function useCompOffBalance() {
  const { selectedCompanyId } = useCompanyStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['comp-off-balance', selectedCompanyId],
    queryFn: async () => {
      const response = await apiClient.get('/leaves/comp-off');
      const resData = response.data;
      if (Array.isArray(resData?.data)) {
        const list = resData.data;
        const available = list.filter((b: any) => b.status === 'available');
        const total = available.reduce(
          (sum: number, b: any) => sum + (parseFloat(b.comp_off_earned_hours || b.compOffEarnedHours) || 8),
          0
        );
        return {
          balance: list,
          totalHours: total,
          pendingRequests: list.filter((b: any) => b.status === 'pending'),
        };
      }
      return resData;
    },
  });

  return {
    balance: (data?.balance as CompOffBalance[]) || [],
    totalHours: data?.totalHours || 0,
    pendingRequests: data?.pendingRequests || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to claim / log extra work on a holiday or weekend to earn comp-off
 */
export function useClaimCompOff() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ workedDate, hoursEarned, reason }: { workedDate: string; hoursEarned: number; reason: string }) => {
      setError(null);
      const response = await apiClient.post('/leaves/comp-off/requests', { workedDate, hoursEarned, reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comp-off-balance'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to claim comp-off');
    },
  });

  return {
    claimCompOff: mutateAsync,
    isLoading: isPending,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook to request comp off
 */
export function useRequestCompOff() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ compOffId, reason }: { compOffId: number; reason?: string }) => {
      setError(null);
      const response = await apiClient.post('/leaves/comp-off/request', { compOffId, reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comp-off-balance'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to request comp off');
    },
  });

  return {
    requestCompOff: mutateAsync,
    isLoading: isPending,
    error,
    clearError: () => setError(null),
  };
}


