import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';

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
  mappedCompanies?: string[];
  mappedLocations?: string[];
  mappedDepartments?: string[];
  mappedShifts?: string[];
  mappedGrades?: string[];
}

export function normalizeDesignation(d: any): Designation {
  const parseArr = (val: any) => {
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string' && val.trim()) {
      try {
        const p = JSON.parse(val);
        return Array.isArray(p) ? p.map(String) : [String(val)];
      } catch {
        return [String(val)];
      }
    }
    return [];
  };

  const companies = parseArr(d.mapped_companies ?? d.mappedCompanies);
  const locations = parseArr(d.mapped_locations ?? d.mappedLocations);
  const departments = parseArr(d.mapped_departments ?? d.mappedDepartments);
  const shifts = parseArr(d.mapped_shifts ?? d.mappedShifts);
  const grades = parseArr(d.mapped_grades ?? d.mappedGrades);

  return {
    ...d,
    mapped_companies: companies,
    mappedCompanies: companies,
    mapped_locations: locations,
    mappedLocations: locations,
    mapped_departments: departments,
    mappedDepartments: departments,
    mapped_shifts: shifts,
    mappedShifts: shifts,
    mapped_grades: grades,
    mappedGrades: grades,
  };
}

/** Mapping pickers must never offer an inactive master record. */
function isActiveMappingOption(item: any): boolean {
  const value = item?.status ?? item?.is_active ?? item?.isActive ?? item?.active;
  if (value === undefined || value === null || value === '') return true;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  return !['inactive', 'no', 'false', '0', 'disabled', 'archived', 'deleted']
    .includes(String(value).trim().toLowerCase());
}

export function useDesignations() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompanyStore();

  const query = useQuery({
    queryKey: ['designations', selectedCompanyId],
    queryFn: async () => {
      const res = await apiClient.get('/settings/designations?limit=1000');
      const data = res.data;
      let rawList: any[] = [];
      if (Array.isArray(data)) rawList = data;
      else if (Array.isArray(data?.data)) rawList = data.data;
      else if (Array.isArray(data?.data?.items)) rawList = data.data.items;
      else if (Array.isArray(data?.items)) rawList = data.items;

      return rawList.map(normalizeDesignation);
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
        const raw = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (data?.data?.items || []));
        return raw.filter(isActiveMappingOption).map((c: any) => ({
          id: String(c.id ?? c.companyId ?? c.company_id ?? c.uuid ?? c.code ?? c.name),
          name: c.name || c.company_name || c.companyName || `Company #${c.id || c.companyId || ''}`,
          code: c.code || c.company_code || '',
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
        const { data } = await apiClient.get('/settings/locations', { params: { pageSize: 200 } });
        const raw = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (data?.data?.items || []));
        return raw.filter(isActiveMappingOption).map((l: any) => ({
          id: String(l.id ?? l.locationId ?? l.location_id ?? l.uuid ?? l.name),
          name: l.locationName || l.location_name || l.name || l.title || `Location #${l.id || ''}`,
          code: l.officeType || l.office_type || l.city || '',
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
        const { data } = await apiClient.get('/settings/departments', { params: { pageSize: 200 } });
        const raw = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (data?.data?.items || []));
        return raw.filter(isActiveMappingOption).map((d: any) => ({
          id: String(d.id ?? d.departmentId ?? d.department_id ?? d.uuid ?? d.name),
          name: d.departmentName || d.department_name || d.name || `Department #${d.id || ''}`,
          code: d.code || d.departmentCode || d.department_code || '',
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
        if (!s) return;
        if (typeof s !== 'string' && !isActiveMappingOption(s)) return;
        if (typeof s === 'string') {
          if (!seenIds.has(s)) {
            seenIds.add(s);
            allShifts.push({ id: s, name: s, isRoster: false, code: '' });
          }
          return;
        }
        const sid = String(s.id ?? s.shiftId ?? s.shift_id ?? s.uuid ?? (s.name || s.shift_name || ''));
        if (!sid || seenIds.has(sid)) return;
        seenIds.add(sid);

        const shiftTypeStr = (s.shift_type || s.shiftType || s.type || '').toLowerCase();
        const nameStr = s.shift_name || s.shiftName || s.name || s.title || `Shift #${sid}`;
        const isRoster = shiftTypeStr === 'roster' || nameStr.toLowerCase().includes('roster') || !!s.roster_pattern || !!s.rosterPattern;

        allShifts.push({
          id: sid,
          name: nameStr,
          isRoster,
          code: s.code || s.shift_code || ''
        });
      };

      try {
        const { data } = await apiClient.get('/settings/shifts', { params: { pageSize: 200 } });
        const raw = data?.data;
        const list = Array.isArray(raw) ? raw : (raw?.items || (Array.isArray(data) ? data : []));
        list.forEach(processShiftItem);
      } catch (_) {}

      try {
        const { data } = await apiClient.get('/attendance/shifts', { params: { pageSize: 200 } });
        const raw = data?.data;
        const list = Array.isArray(raw) ? raw : (raw?.items || (Array.isArray(data) ? data : []));
        list.forEach(processShiftItem);
      } catch (_) {}

      return allShifts;
    },
    // Shift administration happens on a separate page. Poll while the
    // designation form is open so new or changed shifts appear without a
    // browser refresh.
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });

  const gradesQuery = useQuery({
    queryKey: ['mapping_grades'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/settings/grades', { params: { pageSize: 200 } });
        const raw = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (data?.data?.items || []));
        return raw.filter(isActiveMappingOption).map((g: any) => ({
          id: String(g.id ?? g.gradeId ?? g.grade_id ?? g.uuid ?? g.code ?? g.name),
          name: g.name || g.grade_name || g.gradeName || g.code || `Grade #${g.id || ''}`,
          code: g.code || '',
        }));
      } catch {
        return [];
      }
    }
  });

  const fetchedGeneral = (shiftsQuery.data || []).filter((s: any) => !s.isRoster);
  const fetchedRoster = (shiftsQuery.data || []).filter((s: any) => s.isRoster);

  return {
    companies: companiesQuery.data || [],
    locations: locationsQuery.data || [],
    departments: departmentsQuery.data || [],
    shifts: shiftsQuery.data || [],
    generalShifts: fetchedGeneral,
    rosterShifts: fetchedRoster,
    grades: gradesQuery.data || [],
    isLoading: companiesQuery.isLoading || locationsQuery.isLoading || departmentsQuery.isLoading || shiftsQuery.isLoading || gradesQuery.isLoading,
  };
}
