import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export interface PIP {
  id: number;
  employeeId: number;
  managerId: number;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'review' | 'completed' | 'failed' | 'archived';
  reason: string;
  startDate: string;
  endDate: string;
  frequency: 'weekly' | 'bi_weekly' | 'monthly';
  goals: Array<{
    id: number;
    title: string;
    description: string;
    targetValue?: number;
    currentValue?: number;
    status: string;
  }>;
  checkInSchedule: Array<{
    date: string;
    type: string;
  }>;
  progressRating?: number;
  expectedOutcome?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PIPGoal {
  id: number;
  pipId: number;
  title: string;
  description: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  status: 'active' | 'completed' | 'failed';
  weight: number;
  createdAt: string;
}

export interface PIPReview {
  id: number;
  pipId: number;
  reviewDate: string;
  reviewType: 'check_in' | 'formal_review' | 'final_review';
  reviewer: number;
  progressRating: number;
  comments: string;
  recommendations: string;
  status: 'draft' | 'submitted' | 'completed';
  createdAt: string;
}

export interface PIPProgress {
  pipId: number;
  employeeId: number;
  overallProgress: number;
  goalProgress: Array<{
    goalId: number;
    progress: number;
    status: string;
  }>;
  lastCheckInDate?: string;
  nextCheckInDate?: string;
  isOnTrack: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CreatePIPInput {
  employeeId: number;
  managerId: number;
  title: string;
  description: string;
  reason: string;
  startDate: string;
  endDate: string;
  frequency: 'weekly' | 'bi_weekly' | 'monthly';
  goals: Array<{
    title: string;
    description: string;
    targetValue?: number;
    weight: number;
  }>;
  checkInSchedule: Array<{
    date: string;
    type: string;
  }>;
}

export interface CreatePIPReviewInput {
  pipId: number;
  reviewDate: string;
  reviewType: 'check_in' | 'formal_review' | 'final_review';
  progressRating: number;
  comments: string;
  recommendations: string;
}

export const usePIPs = (employeeId?: number, status?: string) => {
  const pipsQuery = useQuery({
    queryKey: ['pips', employeeId, status],
    queryFn: () =>
      apiClient.get('/performance/pips', {
        params: { employeeId, status }
      })
  });

  const createPIPMutation = useMutation({
    mutationFn: (data: CreatePIPInput) =>
      apiClient.post('/performance/pips', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pips'] });
    }
  });

  const updatePIPMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & any) =>
      apiClient.patch(`/performance/pips/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pips'] });
    }
  });

  const completePIPMutation = useMutation({
    mutationFn: (pipId: number) =>
      apiClient.post(`/performance/pips/${pipId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pips'] });
    }
  });

  return {
    pips: pipsQuery.data?.data || [],
    isLoading: pipsQuery.isLoading,
    error: pipsQuery.error,
    createPIP: createPIPMutation.mutate,
    updatePIP: updatePIPMutation.mutate,
    completePIP: completePIPMutation.mutate,
    refetch: pipsQuery.refetch,
    isCreating: createPIPMutation.isPending,
    isUpdating: updatePIPMutation.isPending
  };
};

export const usePIPReviews = (pipId?: number) => {
  const reviewsQuery = useQuery({
    queryKey: ['pip-reviews', pipId],
    queryFn: () =>
      apiClient.get(`/performance/pips/${pipId}/reviews`),
    enabled: !!pipId
  });

  const createReviewMutation = useMutation({
    mutationFn: (data: CreatePIPReviewInput) =>
      apiClient.post(`/performance/pip-reviews`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pip-reviews'] });
    }
  });

  return {
    reviews: reviewsQuery.data?.data || [],
    isLoading: reviewsQuery.isLoading,
    error: reviewsQuery.error,
    createReview: createReviewMutation.mutate,
    refetch: reviewsQuery.refetch,
    isCreating: createReviewMutation.isPending
  };
};

export const usePIPProgress = (pipId: number) => {
  return useQuery({
    queryKey: ['pip-progress', pipId],
    queryFn: () =>
      apiClient.get(`/performance/pips/${pipId}/progress`),
    enabled: !!pipId
  });
};

export const usePIPRiskAssessment = (pipId: number) => {
  return useQuery({
    queryKey: ['pip-risk', pipId],
    queryFn: () =>
      apiClient.get(`/performance/pips/${pipId}/risk-assessment`),
    enabled: !!pipId
  });
};

