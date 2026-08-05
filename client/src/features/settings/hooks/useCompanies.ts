import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface Company {
  id: number;
  name: string;
  code?: string;
}

/**
 * Fetches companies from /settings/companies (CompanyController).
 * Maps companyId -> id for dropdown compatibility.
 * Gracefully returns an empty list on error.
 */
export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/settings/companies');
        const records = response.data.data || [];
        // CompanyController returns full records with companyId; map to {id, name, code}
        return records.map((c: any) => ({
          id: c.companyId ?? c.company_id ?? c.id,
          name: c.name,
          code: c.code,
        }));
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
