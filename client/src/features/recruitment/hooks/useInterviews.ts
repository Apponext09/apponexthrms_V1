import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export const useInterviews = (applicationId: number) => {
  return useQuery({
    queryKey: ['interviews', applicationId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/applications/${applicationId}/interviews`);
      return response.data;
    },
    enabled: !!applicationId,
  });
};

export const useScheduleInterview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.post('/recruitment/interviews', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    },
  });
};

export const useSubmitInterviewFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.post('/recruitment/interviews/feedback', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    },
  });
};

export const useInterviewFeedback = (interviewId: number) => {
  return useQuery({
    queryKey: ['interview-feedback', interviewId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/interviews/${interviewId}/feedback`);
      return response.data.data;
    },
    enabled: !!interviewId,
  });
};

