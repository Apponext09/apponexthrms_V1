import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

const BASE = '/attendance/ot-rules';

// ── List all OT rules ──────────────────────────────────────────────────────
export const useOTRules = (filters?: { isActive?: boolean; search?: string; page?: number }) =>
  useQuery({
    queryKey: ['ot-rules', filters],
    queryFn: () =>
      apiClient
        .get(BASE, { params: filters })
        .then((r) => r.data),
    staleTime: 30_000,
  });

// ── Get a single OT rule (with eligibility) for edit mode ──────────────────
export const useOTRule = (id?: number | null) =>
  useQuery({
    queryKey: ['ot-rule', id],
    queryFn: () =>
      apiClient.get(`${BASE}/${id}`).then((r) => r.data?.data),
    enabled: !!id,
    staleTime: 30_000,
  });

// ── Create ─────────────────────────────────────────────────────────────────
export const useCreateOTRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiClient.post(BASE, data).then((r) => r.data?.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ot-rules'] }),
  });
};

// ── Update ─────────────────────────────────────────────────────────────────
export const useUpdateOTRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, any> }) =>
      apiClient.put(`${BASE}/${id}`, data).then((r) => r.data?.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['ot-rules'] });
      qc.invalidateQueries({ queryKey: ['ot-rule', id] });
    },
  });
};

// ── Delete ─────────────────────────────────────────────────────────────────
export const useDeleteOTRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`${BASE}/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ot-rules'] }),
  });
};

// ── Set eligibility ────────────────────────────────────────────────────────
export const useSetOTRuleEligibility = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      eligibility,
    }: {
      id: number;
      eligibility: { entityType: string; entityId: number }[];
    }) =>
      apiClient
        .put(`${BASE}/${id}/eligibility`, { eligibility })
        .then((r) => r.data),
    onSuccess: (_, { id }) =>
      qc.invalidateQueries({ queryKey: ['ot-rule', id] }),
  });
};

// ── Audit logs for OT rule ──────────────────────────────────────────────────
export const useOTRuleAuditLogs = (ruleId?: number | null) =>
  useQuery({
    queryKey: ['ot-rule-audit-logs', ruleId],
    queryFn: () =>
      apiClient
        .get(`/audit-logs`, { params: { entityType: 'OT_RULE', entityId: ruleId } })
        .then((r) => r.data)
        .catch(() => ({ items: [] })),
    enabled: !!ruleId,
    staleTime: 30_000,
  });

// ── Master data for eligibility panels (real DB entities with IDs) ──────────
export const useOTEligibilityMasters = () => {
  const query = useQuery({
    queryKey: ['ot-eligibility-masters'],
    queryFn: async () => {
      const safe = (p: Promise<any>) => p.catch(() => ({ data: null }));
      const [depts, grades, shifts, empTypes, locations] = await Promise.all([
        safe(apiClient.get('/settings/departments?pageSize=500')),
        safe(apiClient.get('/settings/grades?pageSize=500')),
        safe(apiClient.get('/attendance/shifts')),
        safe(apiClient.get('/settings/employment-types?limit=500')),
        safe(apiClient.get('/settings/locations?pageSize=500')),
      ]);

      const extract = (r: any) =>
        r?.data?.data || r?.data?.items || r?.data || [];

      const rawShifts = extract(shifts);
      const formattedShifts = Array.isArray(rawShifts)
        ? rawShifts.map((s: any) => ({
            id: Number(s.id),
            name: s.shiftName || s.shift_name || s.name || `Shift #${s.id}`,
          }))
        : [];

      const rawTypes = extract(empTypes);
      const formattedTypes = Array.isArray(rawTypes)
        ? rawTypes.map((t: any) => ({
            id: Number(t.id),
            name: t.name || t.typeName || `Type #${t.id}`,
          }))
        : [];

      const rawLocs = extract(locations);
      const formattedLocs = Array.isArray(rawLocs)
        ? rawLocs.map((l: any) => ({
            id: Number(l.id),
            name: l.name || l.locationName || `Location #${l.id}`,
          }))
        : [];

      return {
        departments: extract(depts) as { id: number; name: string }[],
        grades:      extract(grades) as { id: number; name: string }[],
        shifts:      formattedShifts,
        employeeTypes: formattedTypes,
        statuses:     [] as { id: number; name: string }[],
        locations:   formattedLocs,
      };
    },
    staleTime: 60_000,
  });

  const res = query.data ?? {
    departments: [],
    grades: [],
    shifts: [],
    employeeTypes: [],
    statuses: [],
    locations: [],
  };

  return {
    ...query,
    departments: res.departments,
    grades: res.grades,
    shifts: res.shifts,
    employeeTypes: res.employeeTypes,
    statuses: res.statuses,
    locations: res.locations,
  };
};
