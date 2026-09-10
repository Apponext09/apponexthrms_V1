import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export interface ReviewCycle {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  reviewDeadline: string;
  status: 'planning' | 'active' | 'in_review' | 'completed' | 'archived';
  cycleType: 'annual' | 'mid_year' | 'quarterly' | 'custom';
  reviewTemplate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewTemplate {
  id: number;
  name: string;
  description: string;
  categories: string[];
  sections: Array<{
    name: string;
    questions: string[];
  }>;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface PerformanceReview {
  id: number;
  reviewCycleId: number;
  employeeId: number;
  managerId: number;
  status: 'draft' | 'submitted' | 'in_review' | 'completed' | 'acknowledged';
  rating?: number;
  overallComments?: string;
  strengths?: string;
  areasForImprovement?: string;
  goals?: string;
  dueDate: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewResponse {
  id: number;
  reviewId: number;
  sectionId: number;
  questionId: number;
  response: string;
  rating?: number;
  evidence?: string;
  createdAt: string;
}

export interface CreateReviewCycleInput {
  name: string;
  cycleType: 'annual' | 'mid_year' | 'quarterly' | 'custom';
  startDate: string;
  endDate: string;
  reviewDeadline: string;
  reviewTemplate?: number;
}

export interface UpdateReviewCycleInput {
  name?: string;
  status?: 'planning' | 'active' | 'in_review' | 'completed' | 'archived';
  reviewDeadline?: string;
  reviewTemplate?: number;
}

export const useReviewCycles = () => {
  const cyclesQuery = useQuery({
    queryKey: ['review-cycles'],
    queryFn: () => apiClient.get('/performance/review-cycles')
  });

  const createCycleMutation = useMutation({
    mutationFn: (data: CreateReviewCycleInput) =>
      apiClient.post('/performance/review-cycles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles'] });
    }
  });

  const updateCycleMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UpdateReviewCycleInput) =>
      apiClient.patch(`/performance/review-cycles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles'] });
    }
  });

  const rawCycles = cyclesQuery.data?.data;
  const cyclesList: ReviewCycle[] = Array.isArray(rawCycles?.data)
    ? rawCycles.data
    : Array.isArray(rawCycles)
    ? rawCycles
    : [];

  return {
    cycles: cyclesList,
    isLoading: cyclesQuery.isLoading,
    error: cyclesQuery.error,
    createCycle: createCycleMutation.mutate,
    updateCycle: updateCycleMutation.mutate,
    refetch: cyclesQuery.refetch
  };
};

export const useReviews = (cycleId?: number, employeeId?: number) => {
  const reviewsQuery = useQuery({
    queryKey: ['reviews', cycleId, employeeId],
    queryFn: () =>
      apiClient.get('/performance/reviews', {
        params: { cycleId, employeeId }
      }),
    enabled: !!cycleId
  });

  const rawReviews = reviewsQuery.data?.data;
  const reviewsList = Array.isArray(rawReviews?.data)
    ? rawReviews.data
    : Array.isArray(rawReviews)
    ? rawReviews
    : [];

  const createReviewMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post('/performance/reviews', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    }
  });

  const submitReviewMutation = useMutation({
    mutationFn: (reviewId: number) =>
      apiClient.post(`/performance/reviews/${reviewId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    }
  });

  const completeReviewMutation = useMutation({
    mutationFn: (reviewId: number) =>
      apiClient.post(`/performance/reviews/${reviewId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    }
  });

  return {
    reviews: reviewsQuery.data?.data || [],
    isLoading: reviewsQuery.isLoading,
    error: reviewsQuery.error,
    createReview: createReviewMutation.mutate,
    submitReview: submitReviewMutation.mutate,
    completeReview: completeReviewMutation.mutate,
    refetch: reviewsQuery.refetch,
    isCreating: createReviewMutation.isPending,
    isSubmitting: submitReviewMutation.isPending
  };
};

export const useReviewTemplates = () => {
  return useQuery({
    queryKey: ['review-templates'],
    queryFn: () => apiClient.get('/performance/review-templates')
  });
};

export const useReviewProgress = (cycleId: number) => {
  return useQuery({
    queryKey: ['review-progress', cycleId],
    queryFn: () =>
      apiClient.get(`/performance/review-cycles/${cycleId}/progress`),
    enabled: !!cycleId
  });
};

export const useReviewerAssignments = (cycleId: number) => {
  return useQuery({
    queryKey: ['reviewer-assignments', cycleId],
    queryFn: () =>
      apiClient.get(`/performance/review-cycles/${cycleId}/assignments`),
    enabled: !!cycleId
  });
};

