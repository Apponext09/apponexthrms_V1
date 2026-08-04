import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface Company {
  id: number;
  name: string;
  code?: string;
}

/**
 * Fetches companies from /settings/companies.
 * Gracefully returns an empty list if the companies table doesn't exist yet.
 */
export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/settings/companies');
        return response.data.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
