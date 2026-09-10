import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export interface SuccessionPosition {
  id: number;
  positionId: number;
  positionTitle: string;
  currentHolderId: number;
  criticalityScore: number;
  vacancyRiskDate?: string;
  successors: SuccessionCandidate[];
  developmentNeeds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SuccessionCandidate {
  id: number;
  employeeId: number;
  positionId: number;
  readinessLevel: 'ready' | 'ready_with_development' | 'not_ready';
  readinessPercentage: number;
  developmentGaps: string[];
  developmentPlan?: string;
  potentialRating?: string;
  sequenceOrder: number;
  createdAt: string;
}

export interface SuccessionReadiness {
  employeeId: number;
  currentRole: string;
  readinessLevel: 'ready' | 'ready_with_development' | 'not_ready';
  readinessPercentage: number;
  eligiblePositions: Array<{
    positionId: number;
    positionTitle: number;
    readinessPercentage: number;
  }>;
  developmentPlan?: string;
  assessmentDate: string;
  nextAssessmentDate?: string;
  criticalSkillGaps: string[];
  recentFeedback?: string;
}

export interface SuccessionPlan {
  id: number;
  year: number;
  department?: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  positions: SuccessionPosition[];
  highRiskPositions: number[];
  developmentInitiatives: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSuccessionCandidateInput {
  employeeId: number;
  positionId: number;
  readinessLevel: 'ready' | 'ready_with_development' | 'not_ready';
  developmentGaps: string[];
  developmentPlan?: string;
  sequenceOrder: number;
}

export interface UpdateReadinessInput {
  readinessLevel: 'ready' | 'ready_with_development' | 'not_ready';
  readinessPercentage: number;
  developmentGaps?: string[];
  developmentPlan?: string;
}

export const useSuccessionPositions = (departmentId?: number) => {
  const positionsQuery = useQuery({
    queryKey: ['succession-positions', departmentId],
    queryFn: () =>
      apiClient.get('/performance/succession/positions', {
        params: { departmentId }
      })
  });

  const createCandidateMutation = useMutation({
    mutationFn: (data: CreateSuccessionCandidateInput) =>
      apiClient.post('/performance/succession/candidates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['succession-positions']
      });
    }
  });

  const removeCandidateMutation = useMutation({
    mutationFn: (candidateId: number) =>
      apiClient.delete(
        `/performance/succession/candidates/${candidateId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['succession-positions']
      });
    }
  });

  return {
    positions: positionsQuery.data?.data || [],
    isLoading: positionsQuery.isLoading,
    error: positionsQuery.error,
    createCandidate: createCandidateMutation.mutate,
    removeCandidate: removeCandidateMutation.mutate,
    refetch: positionsQuery.refetch,
    isCreating: createCandidateMutation.isPending
  };
};

export const useSuccessionReadiness = (employeeId?: number) => {
  const readinessQuery = useQuery({
    queryKey: ['succession-readiness', employeeId],
    queryFn: () =>
      apiClient.get(`/performance/succession/readiness/${employeeId}`),
    enabled: !!employeeId
  });

  const updateReadinessMutation = useMutation({
    mutationFn: ({ employeeId, ...data }: { employeeId: number } & UpdateReadinessInput) =>
      apiClient.patch(
        `/performance/succession/readiness/${employeeId}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['succession-readiness']
      });
    }
  });

  return {
    readiness: readinessQuery.data?.data,
    isLoading: readinessQuery.isLoading,
    error: readinessQuery.error,
    updateReadiness: updateReadinessMutation.mutate,
    refetch: readinessQuery.refetch,
    isUpdating: updateReadinessMutation.isPending
  };
};

export const useSuccessionPlans = () => {
  return useQuery({
    queryKey: ['succession-plans'],
    queryFn: () => apiClient.get('/performance/succession/plans')
  });
};

export const useHighRiskPositions = (departmentId?: number) => {
  return useQuery({
    queryKey: ['high-risk-positions', departmentId],
    queryFn: () =>
      apiClient.get('/performance/succession/high-risk-positions', {
        params: { departmentId }
      })
  });
};

export const useSuccessionGaps = (departmentId?: number) => {
  return useQuery({
    queryKey: ['succession-gaps', departmentId],
    queryFn: () =>
      apiClient.get('/performance/succession/gaps', {
        params: { departmentId }
      })
  });
};

