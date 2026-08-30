import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export const useOffers = (filters?: any) => {
  return useQuery({
    queryKey: ['offers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page);
      if (filters?.pageSize) params.append('pageSize', filters.pageSize);
      if (filters?.status) params.append('status', filters.status);

      const response = await api.get(`/recruitment/offers?${params.toString()}`);
      return response.data;
    },
  });
};

export const useCreateOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.post('/recruitment/offers', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
  });
};

export const useAcceptOffer = (offerId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post(`/recruitment/offers/${offerId}/accept`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
  });
};

export const useRejectOffer = (offerId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post(`/recruitment/offers/${offerId}/reject`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
  });
};

export const useSendOffer = (offerId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post(`/recruitment/offers/${offerId}/send`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
  });
};

/**
 * Fetch only hired candidates who have NOT been converted to employees yet.
 * Powers the "New Candidate (Hired)" dropdown in offer creation.
 */
export const useHiredCandidates = (filters?: { search?: string }) => {
  return useQuery({
    queryKey: ['hired-candidates', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      const response = await api.get(`/recruitment/applications/hired?${params.toString()}`);
      return response.data;
    },
  });
};

/**
 * Fetch generated letters (employee letters like Increment, Promotion, etc.)
 * for the unified Offer Management page view.
 */
export const useEmployeeLetters = (filters?: { letter_category?: string; status?: string }) => {
  return useQuery({
    queryKey: ['employee-letters', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.letter_category) params.append('letter_category', filters.letter_category);
      if (filters?.status) params.append('status', filters.status);
      const response = await api.get(`/letters?${params.toString()}`);
      return response.data;
    },
  });
};

/**
 * Mutation to generate a letter for an existing employee
 * (Increment, Promotion, Confirmation, etc.) via the Letters module.
 */
export const useCreateEmployeeLetter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { templateId: number; employeeId: number; overrides?: Record<string, string> }) => {
      const response = await api.post('/letters/generate', {
        template_id: input.templateId,
        employee_id: input.employeeId,
        overrides: input.overrides || {},
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['employee-letters'] });
    },
  });
};
