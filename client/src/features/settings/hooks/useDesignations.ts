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
    queryKey: ['mapping_companies'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/settings/companies');
        const raw = data.data || [];
        return raw.map((c: any) => ({
          id: String(c.id ?? c.companyId ?? c.company_id ?? c.uuid ?? c.code ?? c.name),
          name: c.name || c.company_name || c.companyName || `Company #${c.id || c.companyId}`
        }));
      } catch {
        return [];
      }
    }
  });
  const locationsQuery = useQuery({
    queryKey: ['mapping_locations'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/settings/org-locations');
        const raw = data.data || [];
        return raw.map((l: any) => ({
          id: String(l.id ?? l.locationId ?? l.location_id ?? l.uuid ?? l.name),
          name: l.name || l.location_name || l.locationName || `Location #${l.id}`
        }));
      } catch {
        return [];
      }
    }
  });
  const departmentsQuery = useQuery({
    queryKey: ['mapping_departments'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/settings/departments');
        const raw = data.data || [];
        return raw.map((d: any) => ({
          id: String(d.id ?? d.departmentId ?? d.department_id ?? d.uuid ?? d.name),
          name: d.name || d.department_name || d.departmentName || `Department #${d.id}`
        }));
      } catch {
        return [];
      }
    }
  });
  const shiftsQuery = useQuery({
    queryKey: ['mapping_shifts'],
    queryFn: async () => {
      const allShifts: any[] = [];
      const seenIds = new Set<string>();

      const processShiftItem = (s: any) => {
        if (typeof s === 'string') {
          if (!seenIds.has(s)) {
            seenIds.add(s);
            allShifts.push({ id: s, name: s, isRoster: false });
          }
          return;
        }
        const sid = String(s.id ?? s.shiftId ?? s.shift_id ?? (s.name || ''));
        if (!sid || seenIds.has(sid)) return;
        seenIds.add(sid);

        const shiftTypeStr = (s.shift_type || s.shiftType || s.type || '').toLowerCase();
        const nameStr = s.shift_name || s.shiftName || s.name || `Shift #${sid}`;
        const isRoster = shiftTypeStr === 'roster' || nameStr.toLowerCase().includes('roster') || !!s.roster_pattern || !!s.rosterPattern;

        allShifts.push({
          id: sid,
          name: nameStr,
          isRoster
        });
      };

      try {
        const { data } = await apiClient.get('/settings/shifts');
        const raw = data?.data;
        const list = Array.isArray(raw) ? raw : (raw?.items || []);
        list.forEach(processShiftItem);
      } catch (_) {}

      try {
        const { data } = await apiClient.get('/attendance/shifts', { params: { pageSize: 100 } });
        const raw = data?.data;
        const list = Array.isArray(raw) ? raw : (raw?.items || []);
        list.forEach(processShiftItem);
      } catch (_) {}

      return allShifts;
    }
  });
  const gradesQuery = useQuery({
    queryKey: ['mapping_grades'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/settings/grades');
        const raw = data.data || [];
        return raw.map((g: any) => ({
          id: String(g.id ?? g.gradeId ?? g.grade_id ?? g.grade_code ?? g.code ?? g.name),
          name: g.name || g.grade_name || g.grade_code || g.code || `Grade #${g.id}`
        }));
      } catch {
        return [];
      }
    }
  });

  const defaultGeneral = [
    { id: 'gen-1', name: 'General Shift (09:00 AM - 06:00 PM)', isRoster: false },
    { id: 'gen-2', name: 'Morning General Shift (08:00 AM - 05:00 PM)', isRoster: false },
    { id: 'gen-3', name: 'Evening General Shift (02:00 PM - 11:00 PM)', isRoster: false },
    { id: 'gen-4', name: 'Night / Flexible General Shift (10:00 PM - 07:00 AM)', isRoster: false },
  ];

  const defaultRoster = [
    { id: 'ros-1', name: 'Rotational 3-Tier Roster', isRoster: true },
    { id: 'ros-2', name: 'Night Support Roster', isRoster: true },
  ];

  const fetchedGeneral = (shiftsQuery.data || []).filter((s: any) => !s.isRoster);
  const fetchedRoster = (shiftsQuery.data || []).filter((s: any) => s.isRoster);

  const generalShifts = fetchedGeneral.length > 0 ? fetchedGeneral : defaultGeneral;
  const rosterShifts = fetchedRoster.length > 0 ? fetchedRoster : defaultRoster;

  return {
    companies: (companiesQuery.data && companiesQuery.data.length > 0) ? companiesQuery.data : [
      { id: '1', name: 'Main Organization / Corporate' }
    ],
    locations: (locationsQuery.data && locationsQuery.data.length > 0) ? locationsQuery.data : [
      { id: 'loc-1', name: 'Headquarters - Tech Park' },
      { id: 'loc-2', name: 'Regional Office - Delhi' }
    ],
    departments: (departmentsQuery.data && departmentsQuery.data.length > 0) ? departmentsQuery.data : [
      { id: 'dept-1', name: 'Engineering & IT' },
      { id: 'dept-2', name: 'Sales & Business Development' },
      { id: 'dept-3', name: 'HR & Operations' },
      { id: 'dept-4', name: 'Finance & Accounts' }
    ],
    shifts: shiftsQuery.data || [],
    generalShifts,
    rosterShifts,
    grades: (gradesQuery.data && gradesQuery.data.length > 0) ? gradesQuery.data : [
      { id: 'grd-1', name: 'Grade A - Executive Level' },
      { id: 'grd-2', name: 'Grade B - Senior Level' },
      { id: 'grd-3', name: 'Grade C - Junior Level' }
    ],
  };
}
