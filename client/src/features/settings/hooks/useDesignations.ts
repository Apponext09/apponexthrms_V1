import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface Designation {
  id: string | number;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
  mapped_companies?: string[];
  mapped_locations?: string[];
  mapped_departments?: string[];
  mapped_shifts?: string[];
  mapped_grades?: string[];
}

export function useDesignations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['designations'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/designations?limit=1000');
      return data.data as Designation[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Designation>) => {
      const { data } = await apiClient.post('/settings/designations', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<Designation> }) => {
      const res = await apiClient.put(`/settings/designations/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await apiClient.delete(`/settings/designations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
  });

  return {
    designations: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createDesignation: createMutation.mutateAsync,
    updateDesignation: updateMutation.mutateAsync,
    deleteDesignation: deleteMutation.mutateAsync,
  };
}

export function useDummyMappings() {
  const companiesQuery = useQuery({
    queryKey: ['dummy_companies'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/companies');
      return data.data;
    }
  });
  const locationsQuery = useQuery({
    queryKey: ['dummy_locations'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/org-locations');
      return data.data;
    }
  });
  const departmentsQuery = useQuery({
    queryKey: ['dummy_departments'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/departments');
      return data.data;
    }
  });
  const shiftsQuery = useQuery({
    queryKey: ['dummy_shifts'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/shifts');
      return data.data;
    }
  });
  const gradesQuery = useQuery({
    queryKey: ['dummy_grades'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/grades');
      return data.data;
    }
  });

  return {
    companies: companiesQuery.data || [],
    locations: locationsQuery.data || [],
    departments: departmentsQuery.data || [],
    shifts: shiftsQuery.data || [],
    grades: gradesQuery.data || [],
  };
}
