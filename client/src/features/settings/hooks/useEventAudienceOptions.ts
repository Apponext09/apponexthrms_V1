import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface AudienceOption {
  id: string | number;
  label: string;
  code?: string;
}

export interface EventAudienceOptions {
  companies: AudienceOption[];
  locations: AudienceOption[];
  departments: AudienceOption[];
  shifts: AudienceOption[];
  grades: AudienceOption[];
  employmentTypes: AudienceOption[];
  employeeStatuses: AudienceOption[];
}

export function useEventAudienceOptions() {
  return useQuery<EventAudienceOptions>({
    queryKey: ['event-audience-options'],
    queryFn: async () => {
      const [
        compRes,
        locRes,
        deptRes,
        shiftRes,
        gradeRes,
        empOptRes,
        statusRes,
      ] = await Promise.allSettled([
        apiClient.get('/settings/companies'),
        apiClient.get('/settings/locations'),
        apiClient.get('/settings/departments'),
        apiClient.get('/settings/shifts'),
        apiClient.get('/settings/grades'),
        apiClient.get('/settings/employment-options'),
        apiClient.get('/settings/employee-statuses'),
      ]);

      const mapItems = (settled: PromiseSettledResult<any>, nameKey = 'name', codeKey = 'code', altNameKeys: string[] = []): AudienceOption[] => {
        if (settled.status !== 'fulfilled' || !settled.value?.data) return [];
        const raw = settled.value.data?.data || settled.value.data || [];
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
          id: item.id ?? item.company_id ?? item.location_id ?? item.department_id ?? item.value ?? item.name,
          label: item[nameKey] || altNameKeys.reduce((acc, k) => acc || item[k], '') || item.title || item.name || String(item),
          code: item[codeKey],
        }));
      };

      const companies = mapItems(compRes, 'name', 'code');
      // Locations use location_name in DB (with 'name' as fallback for backward compat)
      const locations = mapItems(locRes, 'location_name', 'code', ['name']);
      const departments = mapItems(deptRes, 'name', 'code');
      const shifts = mapItems(shiftRes, 'name', 'code');
      const grades = mapItems(gradeRes, 'name', 'code');

      // Employment types derived from employment-options or fallback list
      let employmentTypes: AudienceOption[] = [];
      if (empOptRes.status === 'fulfilled' && empOptRes.value?.data) {
        const typesList = empOptRes.value.data?.data?.employeeTypes || empOptRes.value.data?.employeeTypes || [];
        if (Array.isArray(typesList) && typesList.length > 0) {
          employmentTypes = typesList.map((t: string) => ({ id: t, label: t }));
        }
      }
      if (employmentTypes.length === 0) {
        employmentTypes = [
          { id: 'Full-Time', label: 'Full-Time' },
          { id: 'Part-Time', label: 'Part-Time' },
          { id: 'Contract', label: 'Contract' },
          { id: 'Intern', label: 'Intern' },
          { id: 'Probationary', label: 'Probationary' },
          { id: 'Temporary', label: 'Temporary' },
        ];
      }

      // Employee statuses
      let employeeStatuses: AudienceOption[] = mapItems(statusRes, 'name', 'code');
      if (employeeStatuses.length === 0) {
        employeeStatuses = [
          { id: 'Active', label: 'Active' },
          { id: 'Inactive', label: 'Inactive' },
          { id: 'On Leave', label: 'On Leave' },
          { id: 'Probation', label: 'Probation' },
          { id: 'Notice Period', label: 'Notice Period' },
          { id: 'Terminated', label: 'Terminated' },
        ];
      }

      return {
        companies,
        locations,
        departments,
        shifts,
        grades,
        employmentTypes,
        employeeStatuses,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
