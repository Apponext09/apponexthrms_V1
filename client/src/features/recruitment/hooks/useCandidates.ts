import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export const useCandidates = (filters?: any) => {
  return useQuery({
    queryKey: ['candidates', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page);
      if (filters?.pageSize) params.append('pageSize', filters.pageSize);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.source) params.append('source', filters.source);

      const response = await api.get(`/recruitment/candidates?${params.toString()}`);
      return response.data;
    },
  });
};

export const useCandidate = (id: number) => {
  return useQuery({
    queryKey: ['candidate', id],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
};

export const useCreateCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.post('/recruitment/candidates', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
};

export const useUpdateCandidate = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.patch(`/recruitment/candidates/${candidateId}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
    },
  });
};

export const useDeleteCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/recruitment/candidates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
};

export const useCandidateNotes = (candidateId: number) => {
  return useQuery({
    queryKey: ['candidate-notes', candidateId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${candidateId}/notes`);
      return response.data.data;
    },
    enabled: !!candidateId,
  });
};

export const useAddCandidateNote = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteText: string) => {
      const response = await api.post(`/recruitment/candidates/${candidateId}/notes`, { noteText });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-notes', candidateId] });
    },
  });
};

// Candidate Documents
export const useCandidateDocuments = (candidateId: number) => {
  return useQuery({
    queryKey: ['candidate-documents', candidateId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${candidateId}/documents`);
      return response.data.data;
    },
    enabled: !!candidateId,
  });
};

export const useUploadCandidateDocument = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post(`/recruitment/candidates/${candidateId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-documents', candidateId] });
    },
  });
};

export const useDeleteCandidateDocument = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (docId: number) => {
      const response = await api.delete(`/recruitment/candidates/${candidateId}/documents/${docId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-documents', candidateId] });
    },
  });
};

// Candidate Skills
export const useCandidateSkills = (candidateId: number) => {
  return useQuery({
    queryKey: ['candidate-skills', candidateId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${candidateId}/skills`);
      return response.data.data;
    },
    enabled: !!candidateId,
  });
};

export const useAddCandidateSkill = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { skillName: string; proficiency: string; yearsOfExperience?: number }) => {
      const response = await api.post(`/recruitment/candidates/${candidateId}/skills`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-skills', candidateId] });
    },
  });
};

export const useDeleteCandidateSkill = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skillId: number) => {
      const response = await api.delete(`/recruitment/candidates/${candidateId}/skills/${skillId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-skills', candidateId] });
    },
  });
};

// Candidate Education
export const useCandidateEducation = (candidateId: number) => {
  return useQuery({
    queryKey: ['candidate-education', candidateId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${candidateId}/education`);
      return response.data.data;
    },
    enabled: !!candidateId,
  });
};

export const useAddCandidateEducation = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { degree: string; fieldOfStudy?: string; institution?: string; graduationYear?: number }) => {
      const response = await api.post(`/recruitment/candidates/${candidateId}/education`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-education', candidateId] });
    },
  });
};

export const useDeleteCandidateEducation = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eduId: number) => {
      const response = await api.delete(`/recruitment/candidates/${candidateId}/education/${eduId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-education', candidateId] });
    },
  });
};

// Candidate Experience
export const useCandidateExperience = (candidateId: number) => {
  return useQuery({
    queryKey: ['candidate-experience', candidateId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${candidateId}/experience`);
      return response.data.data;
    },
    enabled: !!candidateId,
  });
};

export const useAddCandidateExperience = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { companyName: string; jobTitle?: string; startDate?: string; endDate?: string; isCurrent?: boolean; description?: string }) => {
      const response = await api.post(`/recruitment/candidates/${candidateId}/experience`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-experience', candidateId] });
    },
  });
};

export const useDeleteCandidateExperience = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expId: number) => {
      const response = await api.delete(`/recruitment/candidates/${candidateId}/experience/${expId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-experience', candidateId] });
    },
  });
};

// Candidate Fitment/Scoring
export const useCandidateFitment = (candidateId: number, jobId: number) => {
  return useQuery({
    queryKey: ['candidate-fitment', candidateId, jobId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${candidateId}/score/${jobId}`);
      return response.data.data;
    },
    enabled: !!candidateId && !!jobId,
  });
};


