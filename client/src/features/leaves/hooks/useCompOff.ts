import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

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
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['comp-off-balance'],
    queryFn: async () => {
      const response = await apiClient.get('/leaves/comp-off');
      return response.data.data;
    },
  });

  return {
    balance: (data?.balance as CompOffBalance[]) || [],
    totalHours: data?.totalHours || 0,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
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

