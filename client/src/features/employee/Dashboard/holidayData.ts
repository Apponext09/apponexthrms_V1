import { apiClient } from '@/lib/api';

export interface EmployeeHoliday {
  id: number | string;
  holidayName: string;
  holidayDate: string;
  holidayType: 'national' | 'regional' | 'company' | 'restricted';
  isOptional: boolean;
}

const asList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.holidays)) return payload.holidays;
  return [];
};

const normalize = (items: any[]): EmployeeHoliday[] => items
  .map((holiday, index) => ({
    id: holiday.id ?? `${holiday.holiday_date || holiday.holidayDate || holiday.date}-${index}`,
    holidayName: holiday.holiday_name || holiday.holidayName || holiday.name || 'Holiday',
    holidayDate: String(holiday.holiday_date || holiday.holidayDate || holiday.date || '').slice(0, 10),
    holidayType: String(
      holiday.holiday_type || holiday.holidayType || (holiday.is_optional || holiday.isOptional ? 'restricted' : 'company'),
    ).toLowerCase() as EmployeeHoliday['holidayType'],
    isOptional: Boolean(holiday.is_optional ?? holiday.isOptional),
  }))
  .filter((holiday) => /^\d{4}-\d{2}-\d{2}$/.test(holiday.holidayDate));

export async function fetchEmployeeHolidays(): Promise<EmployeeHoliday[]> {
  const endpoints = ['/settings/holidays/my-calendar', '/settings/holidays/upcoming?limit=500'];

  for (const endpoint of endpoints) {
    try {
      const response = await apiClient.get(endpoint);
      const holidays = normalize(asList(response.data?.data));
      if (holidays.length) return holidays;
    } catch {
      // Try the next employee-scoped holiday source.
    }
  }

  try {
    const response = await apiClient.get('/leaves/calendar');
    return normalize(asList(response.data?.data));
  } catch {
    return [];
  }
}
