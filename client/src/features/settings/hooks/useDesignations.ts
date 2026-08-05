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
      const res = await apiClient.get('/settings/designations?limit=1000');
      const data = res.data;
      if (Array.isArray(data)) return data as Designation[];
      if (Array.isArray(data?.data)) return data.data as Designation[];
      if (Array.isArray(data?.data?.items)) return data.data.items as Designation[];
      if (Array.isArray(data?.items)) return data.items as Designation[];
      return [];
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
    queryKey: ['mapping_companies'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/companies');
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.data?.items)) return data.data.items;
      if (Array.isArray(data?.items)) return data.items;
      return [];
    }
  });
  const locationsQuery = useQuery({
    queryKey: ['mapping_locations'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/org-locations');
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.data?.items)) return data.data.items;
      if (Array.isArray(data?.items)) return data.items;
      return [];
    }
  });
  const departmentsQuery = useQuery({
    queryKey: ['mapping_departments'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/departments');
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.data?.items)) return data.data.items;
      if (Array.isArray(data?.items)) return data.items;
      return [];
    }
  });
  const shiftsQuery = useQuery({
    queryKey: ['mapping_shifts'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/attendance/shifts', { params: { pageSize: 100 } });
        const raw = data.data;
        const list = Array.isArray(raw) ? raw : (raw?.items || []);
        if (Array.isArray(list) && list.length > 0) {
          return list.map((s: any) => {
            const shiftTypeStr = (s.shift_type || s.shiftType || '').toLowerCase();
            const nameStr = s.shift_name || s.shiftName || s.name || `Shift #${s.id}`;
            const isRoster = shiftTypeStr === 'roster' || nameStr.toLowerCase().includes('roster') || !!s.roster_pattern || !!s.rosterPattern;
            return {
              id: String(s.id),
              name: nameStr,
              isRoster
            };
          });
        }
      } catch (_) {}

      try {
        const { data } = await apiClient.get('/settings/shifts');
        const raw = data.data;
        const list = Array.isArray(raw) ? raw : (raw?.items || []);
        return list.map((s: any) => {
          if (typeof s === 'string') return { id: s, name: s, isRoster: false };
          const shiftTypeStr = (s.shift_type || s.shiftType || '').toLowerCase();
          const nameStr = s.shift_name || s.shiftName || s.name || `Shift #${s.id}`;
          const isRoster = shiftTypeStr === 'roster' || nameStr.toLowerCase().includes('roster') || !!s.roster_pattern || !!s.rosterPattern;
          return {
            id: String(s.id),
            name: s.name || nameStr,
            isRoster
          };
        });
      } catch (_) {
        return [];
      }
    }
  });
  const gradesQuery = useQuery({
    queryKey: ['mapping_grades'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/grades');
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.data?.items)) return data.data.items;
      if (Array.isArray(data?.items)) return data.items;
      return [];
    }
  });

  const generalShifts = (shiftsQuery.data || []).filter((s: any) => !s.isRoster);
  const rosterShifts = (shiftsQuery.data || []).filter((s: any) => s.isRoster);

  return {
    companies: companiesQuery.data || [],
    locations: locationsQuery.data || [],
    departments: departmentsQuery.data || [],
    shifts: shiftsQuery.data || [],
    generalShifts,
    rosterShifts,
    grades: gradesQuery.data || [],
  };
}
