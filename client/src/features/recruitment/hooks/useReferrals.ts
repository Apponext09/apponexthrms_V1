import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export const useReferrals = (filters?: any) => {
  return useQuery({
    queryKey: ['referrals', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page);
      if (filters?.pageSize) params.append('pageSize', filters.pageSize);

      const response = await api.get(`/recruitment/referrals?${params.toString()}`);
      return response.data;
    },
  });
};

export const useCreateReferral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { employeeId: number; candidateId: number; referralRewardAmount?: number }) => {
      const response = await api.post('/recruitment/referrals', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
};

export const useRewardReferral = (referralId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { rewardAmount: number; rewardType?: string; newStatus?: string }) => {
      const response = await api.post(`/recruitment/referrals/${referralId}/reward`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
};

export const useReferralProgress = (referralId: number) => {
  return useQuery({
    queryKey: ['referral-progress', referralId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/referrals/${referralId}/progress`);
      return response.data.data;
    },
    enabled: !!referralId,
  });
};

export const useDeleteReferral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (referralId: number) => {
      const response = await api.delete(`/recruitment/referrals/${referralId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });
};
