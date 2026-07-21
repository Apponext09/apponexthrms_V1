import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export interface Recognition {
  id: number;
  awardeeId: number;
  awardeeeName: string;
  awardeeAvatar?: string;
  givenById: number;
  giverName: string;
  title: string;
  description: string;
  category: string;
  points: number;
  badge?: string;
  visibility: 'public' | 'team' | 'private';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: number;
}

export interface Reward {
  id: number;
  recognitionId?: number;
  employeeId: number;
  employeeName: string;
  employeeAvatar?: string;
  rewardType: 'monetary' | 'badge' | 'certificate' | 'gift' | 'bonus';
  amount?: number;
  description: string;
  status: 'pending' | 'approved' | 'distributed' | 'cancelled';
  awardDate: string;
  distributionDate?: string;
  notes?: string;
  createdAt: string;
}

export interface Leaderboard {
  rank: number;
  employeeId: number;
  employeeName: string;
  employeeAvatar?: string;
  department: string;
  totalPoints: number;
  recognitions: number;
  badges: string[];
  thisMonth: number;
  thisQuarter: number;
  thisYear: number;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  criteria: string;
  points: number;
  earnedBy: number[];
  createdAt: string;
}

export interface CreateRecognitionInput {
  awardeeId: number;
  givenById: number;
  title: string;
  description: string;
  category: string;
  points: number;
  visibility: 'public' | 'team' | 'private';
  badge?: string;
}

export interface CreateRewardInput {
  employeeId: number;
  recognitionId?: number;
  rewardType: 'monetary' | 'badge' | 'certificate' | 'gift' | 'bonus';
  amount?: number;
  description: string;
  awardDate: string;
  notes?: string;
}

export const useRecognitions = (employeeId?: number, filters?: any) => {
  const recognitionsQuery = useQuery({
    queryKey: ['recognitions', employeeId, filters],
    queryFn: () =>
      apiClient.get('/performance/recognitions', {
        params: { employeeId, ...filters }
      })
  });

  const createRecognitionMutation = useMutation({
    mutationFn: (data: CreateRecognitionInput) =>
      apiClient.post('/performance/recognitions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognitions'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  });

  const approveRecognitionMutation = useMutation({
    mutationFn: (recognitionId: number) =>
      apiClient.post(
        `/performance/recognitions/${recognitionId}/approve`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognitions'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  });

  const deleteRecognitionMutation = useMutation({
    mutationFn: (recognitionId: number) =>
      apiClient.delete(`/performance/recognitions/${recognitionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognitions'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  });

  return {
    recognitions: recognitionsQuery.data?.data || [],
    isLoading: recognitionsQuery.isLoading,
    error: recognitionsQuery.error,
    createRecognition: createRecognitionMutation.mutate,
    approveRecognition: approveRecognitionMutation.mutate,
    deleteRecognition: deleteRecognitionMutation.mutate,
    refetch: recognitionsQuery.refetch,
    isCreating: createRecognitionMutation.isPending,
    isApproving: approveRecognitionMutation.isPending
  };
};

export const useRewards = (employeeId?: number) => {
  const rewardsQuery = useQuery({
    queryKey: ['rewards', employeeId],
    queryFn: () =>
      apiClient.get('/performance/rewards', {
        params: { employeeId }
      })
  });

  const createRewardMutation = useMutation({
    mutationFn: (data: CreateRewardInput) =>
      apiClient.post('/performance/rewards', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    }
  });

  const distributeRewardMutation = useMutation({
    mutationFn: (rewardId: number) =>
      apiClient.post(`/performance/rewards/${rewardId}/distribute`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    }
  });

  return {
    rewards: rewardsQuery.data?.data || [],
    isLoading: rewardsQuery.isLoading,
    error: rewardsQuery.error,
    createReward: createRewardMutation.mutate,
    distributeReward: distributeRewardMutation.mutate,
    refetch: rewardsQuery.refetch,
    isCreating: createRewardMutation.isPending
  };
};

export const useLeaderboard = (
  period: 'month' | 'quarter' | 'year' = 'month',
  departmentId?: number
) => {
  return useQuery({
    queryKey: ['leaderboard', period, departmentId],
    queryFn: () =>
      apiClient.get('/performance/leaderboard', {
        params: { period, departmentId }
      })
  });
};

export const useBadges = () => {
  return useQuery({
    queryKey: ['badges'],
    queryFn: () => apiClient.get('/performance/badges')
  });
};

export const useEmployeeBadges = (employeeId: number) => {
  return useQuery({
    queryKey: ['employee-badges', employeeId],
    queryFn: () =>
      apiClient.get(`/performance/employees/${employeeId}/badges`),
    enabled: !!employeeId
  });
};

