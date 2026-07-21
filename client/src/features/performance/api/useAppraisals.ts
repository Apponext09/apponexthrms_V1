import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export interface Appraisal {
  id: number;
  employeeId: number;
  managerId: number;
  appraisalCycleId: number;
  status: 'draft' | 'submitted' | 'approved' | 'finalized' | 'archived';
  rating: number;
  overallRating?: number;
  performanceGrade?: string;
  recommendations?: string;
  strengths?: string;
  areasForImprovement?: string;
  competencyRatings: Array<{
    competencyId: number;
    rating: number;
    evidence: string;
  }>;
  calibrationScore?: number;
  percentile?: number;
  distributionBucket?: 'high_performer' | 'solid_performer' | 'needs_improvement' | 'unsatisfactory';
  potentialRating?: string;
  successionReadiness?: 'ready' | 'ready_with_development' | 'needs_development' | 'not_ready';
  createdAt: string;
  updatedAt: string;
}

export interface AppraisalCycle {
  id: number;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  submissionDeadline: string;
  approvalDeadline: string;
  status: 'planning' | 'active' | 'review' | 'approval' | 'finalized' | 'archived';
  createdAt: string;
}

export interface CompetencyRating {
  competencyId: number;
  name: string;
  rating: number;
  proficiency: string;
  evidence: string;
}

export interface CreateAppraisalInput {
  employeeId: number;
  managerId: number;
  appraisalCycleId: number;
  rating: number;
  overallComments?: string;
  strengths?: string;
  areasForImprovement?: string;
  competencyRatings: Array<{
    competencyId: number;
    rating: number;
    evidence: string;
  }>;
}

export interface FinalizAppraisalInput {
  appraisalId: number;
  performanceGrade: string;
  recommendations: string;
  potentialRating?: string;
  successionReadiness?: 'ready' | 'ready_with_development' | 'needs_development' | 'not_ready';
}

export const useAppraisals = (cycleId?: number, employeeId?: number) => {
  const appraisalsQuery = useQuery({
    queryKey: ['appraisals', cycleId, employeeId],
    queryFn: () =>
      apiClient.get('/performance/appraisals', {
        params: { cycleId, employeeId }
      }),
    enabled: !!cycleId
  });

  const createAppraisalMutation = useMutation({
    mutationFn: (data: CreateAppraisalInput) =>
      apiClient.post('/performance/appraisals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisals'] });
    }
  });

  const updateAppraisalMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & any) =>
      apiClient.patch(`/performance/appraisals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisals'] });
    }
  });

  const finalizeAppraisalMutation = useMutation({
    mutationFn: (data: FinalizAppraisalInput) =>
      apiClient.post(
        `/performance/appraisals/${data.appraisalId}/finalize`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisals'] });
    }
  });

  const submitAppraisalMutation = useMutation({
    mutationFn: (appraisalId: number) =>
      apiClient.post(`/performance/appraisals/${appraisalId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisals'] });
    }
  });

  return {
    appraisals: appraisalsQuery.data?.data || [],
    isLoading: appraisalsQuery.isLoading,
    error: appraisalsQuery.error,
    createAppraisal: createAppraisalMutation.mutate,
    updateAppraisal: updateAppraisalMutation.mutate,
    finalizeAppraisal: finalizeAppraisalMutation.mutate,
    submitAppraisal: submitAppraisalMutation.mutate,
    refetch: appraisalsQuery.refetch,
    isCreating: createAppraisalMutation.isPending,
    isSubmitting: submitAppraisalMutation.isPending
  };
};

export const useAppraisalCycles = () => {
  return useQuery({
    queryKey: ['appraisal-cycles'],
    queryFn: () => apiClient.get('/performance/appraisal-cycles')
  });
};

export const useCalibrationMatrix = (cycleId: number) => {
  return useQuery({
    queryKey: ['calibration-matrix', cycleId],
    queryFn: () =>
      apiClient.get(
        `/performance/appraisal-cycles/${cycleId}/calibration`,
        { params: { cycleId } }
      ),
    enabled: !!cycleId
  });
};

export const useAppraisalProgress = (cycleId: number) => {
  return useQuery({
    queryKey: ['appraisal-progress', cycleId],
    queryFn: () =>
      apiClient.get(
        `/performance/appraisal-cycles/${cycleId}/progress`
      ),
    enabled: !!cycleId
  });
};

