import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface EventRecord {
  id: string;
  uuid: string;
  organizationId?: number;
  title: string;
  description?: string;
  venue?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  displayDaysBefore?: number;
  requireParticipation?: boolean;
  allowComments?: boolean;
  setReminder?: boolean;
  companyIds?: (number | string)[];
  locationIds?: (number | string)[];
  departmentIds?: (number | string)[];
  shiftIds?: (number | string)[];
  gradeIds?: (number | string)[];
  employmentTypes?: string[];
  employeeStatusIds?: (number | string)[];
  gender?: string;
  isActive?: boolean;
  status?: 'Active' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
}

export function useEvents() {
  return useQuery<EventRecord[]>({
    queryKey: ['events'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/settings/events');
        const list = response.data?.data || [];
        return list.map((item: any) => ({
          id: String(item.id),
          uuid: item.uuid,
          organizationId: item.organization_id,
          title: item.title,
          description: item.description || '',
          venue: item.venue || '',
          eventType: item.event_type || 'General',
          startDate: item.start_date || '',
          endDate: item.end_date || '',
          startTime: item.start_time || '09:00',
          endTime: item.end_time || '17:00',
          displayDaysBefore: item.display_days_before ?? 0,
          requireParticipation: Boolean(item.require_participation),
          allowComments: Boolean(item.allow_comments),
          setReminder: Boolean(item.set_reminder),
          companyIds: item.company_ids || [],
          locationIds: item.location_ids || [],
          departmentIds: item.department_ids || [],
          shiftIds: item.shift_ids || [],
          gradeIds: item.grade_ids || [],
          employmentTypes: item.employment_types || [],
          employeeStatusIds: item.employee_status_ids || [],
          gender: item.gender || 'All',
          isActive: item.is_active ?? true,
          status: item.status || 'Active',
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<EventRecord>) => {
      const res = await apiClient.post('/settings/events', payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<EventRecord> & { id: string }) => {
      const res = await apiClient.put(`/settings/events/${id}`, payload);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/settings/events/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
