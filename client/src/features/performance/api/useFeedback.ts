import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export interface FeedbackRequest {
  id: number;
  employeeId: number;
  requestedFrom: number;
  feedbackType: '360' | 'peer' | 'manager' | 'skip_level' | 'custom';
  status: 'pending' | 'submitted' | 'expired' | 'cancelled';
  dueDate: string;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackResponse {
  id: number;
  requestId: number;
  respondentId: number;
  rating: number;
  comment: string;
  strengths?: string;
  areasForImprovement?: string;
  submittedAt: string;
  createdAt: string;
}

export interface FeedbackSummary {
  employeeId: number;
  feedbackType: string;
  averageRating: number;
  totalResponses: number;
  responseRate: number;
  themes: Array<{
    theme: string;
    count: number;
    percentage: number;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  createdAt: string;
}

export interface CreateFeedbackRequestInput {
  employeeId: number;
  requestedFromIds: number[];
  feedbackType: '360' | 'peer' | 'manager' | 'skip_level' | 'custom';
  dueDate: string;
  isAnonymous: boolean;
  customQuestions?: string[];
}

export interface Submit360FeedbackInput {
  requestId: number;
  rating: number;
  comment: string;
  strengths?: string;
  areasForImprovement?: string;
}

export const useFeedbackRequests = (employeeId?: number) => {
  const requestsQuery = useQuery({
    queryKey: ['feedback-requests', employeeId],
    queryFn: () =>
      apiClient.get('/performance/feedback/requests', {
        params: { employeeId }
      }),
    enabled: !!employeeId
  });

  const createRequestMutation = useMutation({
    mutationFn: (data: CreateFeedbackRequestInput) =>
      apiClient.post('/performance/feedback/requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-requests'] });
    }
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (requestId: number) =>
      apiClient.post(`/performance/feedback/requests/${requestId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-requests'] });
    }
  });

  return {
    requests: requestsQuery.data?.data || [],
    isLoading: requestsQuery.isLoading,
    error: requestsQuery.error,
    createRequest: createRequestMutation.mutate,
    cancelRequest: cancelRequestMutation.mutate,
    refetch: requestsQuery.refetch,
    isCreating: createRequestMutation.isPending
  };
};

export const usePendingFeedback = (currentUserId: number) => {
  return useQuery({
    queryKey: ['pending-feedback', currentUserId],
    queryFn: () =>
      apiClient.get('/performance/feedback/pending', {
        params: { userId: currentUserId }
      }),
    enabled: !!currentUserId
  });
};

export const useSubmitFeedback = () => {
  return useMutation({
    mutationFn: (data: Submit360FeedbackInput) =>
      apiClient.post('/performance/feedback/submit', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-requests'] });
    }
  });
};

export const useFeedbackSummary = (employeeId: number) => {
  return useQuery({
    queryKey: ['feedback-summary', employeeId],
    queryFn: () =>
      apiClient.get(
        `/performance/feedback/${employeeId}/summary`
      ),
    enabled: !!employeeId
  });
};

export const useFeedbackHistory = (employeeId: number) => {
  return useQuery({
    queryKey: ['feedback-history', employeeId],
    queryFn: () =>
      apiClient.get(
        `/performance/feedback/${employeeId}/history`
      ),
    enabled: !!employeeId
  });
};

export const useFeedbackAnalytics = (employeeId: number, timeframe: string = '12m') => {
  return useQuery({
    queryKey: ['feedback-analytics', employeeId, timeframe],
    queryFn: () =>
      apiClient.get(
        `/performance/feedback/${employeeId}/analytics`,
        { params: { timeframe } }
      ),
    enabled: !!employeeId
  });
};

