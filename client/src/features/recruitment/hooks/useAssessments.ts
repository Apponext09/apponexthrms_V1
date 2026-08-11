import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export const useAssessments = (filters?: any) => {
  return useQuery({
    queryKey: ['assessments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page);
      if (filters?.pageSize) params.append('pageSize', filters.pageSize);

      const response = await api.get(`/recruitment/assessments?${params.toString()}`);
      return response.data;
    },
  });
};

export const useCreateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.post('/recruitment/assessments', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
};

export const useAssignAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.post('/recruitment/assessments/assign', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
};

export const useAssessmentAttempts = (applicationId: number) => {
  return useQuery({
    queryKey: ['assessment-attempts', applicationId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/applications/${applicationId}/assessment-attempts`);
      return response.data.data;
    },
    enabled: !!applicationId,
  });
};

export const useAssessmentQuestions = (assessmentId: number) => {
  return useQuery({
    queryKey: ['assessment-questions', assessmentId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/assessments/${assessmentId}/questions`);
      return response.data.data;
    },
    enabled: !!assessmentId,
  });
};

export const useAddAssessmentQuestion = (assessmentId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { questionText: string; questionType: string; optionsJson?: any[]; correctAnswer?: string; marks?: number; explanation?: string; questionNumber?: number }) => {
      const response = await api.post(`/recruitment/assessments/${assessmentId}/questions`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-questions', assessmentId] });
    },
  });
};

export const useUpdateAssessmentQuestion = (assessmentId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, input }: { questionId: number; input: any }) => {
      const response = await api.patch(`/recruitment/assessments/${assessmentId}/questions/${questionId}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-questions', assessmentId] });
    },
  });
};

export const useDeleteAssessmentQuestion = (assessmentId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionId: number) => {
      const response = await api.delete(`/recruitment/assessments/${assessmentId}/questions/${questionId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-questions', assessmentId] });
    },
  });
};


