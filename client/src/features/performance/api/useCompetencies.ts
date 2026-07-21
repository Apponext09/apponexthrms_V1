import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export interface Competency {
  id: number;
  name: string;
  category: string;
  description: string;
  levels: Array<{
    level: number;
    name: string;
    description: string;
    behaviors: string[];
  }>;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
}

export interface CompetencyFramework {
  id: number;
  name: string;
  description: string;
  competencies: number[];
  roles: number[];
  departments: number[];
  version: number;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CompetencyAssessment {
  id: number;
  employeeId: number;
  frameworkId: number;
  assessmentDate: string;
  status: 'draft' | 'in_progress' | 'completed' | 'reviewed';
  ratings: Array<{
    competencyId: number;
    currentLevel: number;
    targetLevel: number;
    evidence: string;
  }>;
  overallScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompetencyGap {
  competencyId: number;
  employeeId: number;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  developmentPlan?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CreateCompetencyFrameworkInput {
  name: string;
  description: string;
  competencies: number[];
  roles?: number[];
  departments?: number[];
}

export interface CreateAssessmentInput {
  employeeId: number;
  frameworkId: number;
  assessmentDate: string;
  ratings: Array<{
    competencyId: number;
    currentLevel: number;
    targetLevel: number;
    evidence: string;
  }>;
}

export const useCompetencies = () => {
  return useQuery({
    queryKey: ['competencies'],
    queryFn: () => apiClient.get('/performance/competencies')
  });
};

export const useCompetencyFrameworks = () => {
  const frameworksQuery = useQuery({
    queryKey: ['competency-frameworks'],
    queryFn: () => apiClient.get('/performance/competency-frameworks')
  });

  const createFrameworkMutation = useMutation({
    mutationFn: (data: CreateCompetencyFrameworkInput) =>
      apiClient.post('/performance/competency-frameworks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competency-frameworks'] });
    }
  });

  const updateFrameworkMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & any) =>
      apiClient.patch(`/performance/competency-frameworks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['competency-frameworks']
      });
    }
  });

  return {
    frameworks: frameworksQuery.data?.data || [],
    isLoading: frameworksQuery.isLoading,
    error: frameworksQuery.error,
    createFramework: createFrameworkMutation.mutate,
    updateFramework: updateFrameworkMutation.mutate,
    refetch: frameworksQuery.refetch,
    isCreating: createFrameworkMutation.isPending
  };
};

export const useCompetencyAssessments = (employeeId?: number) => {
  const assessmentsQuery = useQuery({
    queryKey: ['competency-assessments', employeeId],
    queryFn: () =>
      apiClient.get('/performance/competency-assessments', {
        params: { employeeId }
      }),
    enabled: !!employeeId
  });

  const createAssessmentMutation = useMutation({
    mutationFn: (data: CreateAssessmentInput) =>
      apiClient.post('/performance/competency-assessments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['competency-assessments']
      });
      queryClient.invalidateQueries({
        queryKey: ['competency-gaps']
      });
    }
  });

  const completeAssessmentMutation = useMutation({
    mutationFn: (assessmentId: number) =>
      apiClient.post(
        `/performance/competency-assessments/${assessmentId}/complete`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['competency-assessments']
      });
    }
  });

  return {
    assessments: assessmentsQuery.data?.data || [],
    isLoading: assessmentsQuery.isLoading,
    error: assessmentsQuery.error,
    createAssessment: createAssessmentMutation.mutate,
    completeAssessment: completeAssessmentMutation.mutate,
    refetch: assessmentsQuery.refetch,
    isCreating: createAssessmentMutation.isPending
  };
};

export const useCompetencyGaps = (employeeId: number, frameworkId?: number) => {
  return useQuery({
    queryKey: ['competency-gaps', employeeId, frameworkId],
    queryFn: () =>
      apiClient.get(`/performance/competency-gaps/${employeeId}`, {
        params: { frameworkId }
      }),
    enabled: !!employeeId
  });
};

export const useCompetencyAnalytics = (frameworkId: number) => {
  return useQuery({
    queryKey: ['competency-analytics', frameworkId],
    queryFn: () =>
      apiClient.get(
        `/performance/competency-frameworks/${frameworkId}/analytics`
      ),
    enabled: !!frameworkId
  });
};

