import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface Company {
  id: number;
  companyId?: number;
  name: string;
  code?: string;
  logo?: string | null;
  status?: string;
  isParent?: boolean;
}

/**
 * Fetches companies from /settings/companies (CompanyController).
 * Maps companyId -> id for dropdown compatibility.
 */
export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/settings/companies');
        const records = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
          ? response.data
          : [];
        return records.map((c: any) => ({
          id: Number(c.company_id ?? c.companyId ?? c.id),
          company_id: Number(c.company_id ?? c.companyId ?? c.id),
          companyId: Number(c.company_id ?? c.companyId ?? c.id),
          name: c.name || c.company_name || c.companyName || 'Unnamed Company',
          code: c.code || c.company_code || '',
          logo: c.logo || null,
          status: c.status || 'Active',
          isParent: Boolean(c.is_parent ?? c.isParent),
        }));
      } catch (err) {
        console.error('useCompanies fetch error:', err);
        return [];
      }
    },
    staleTime: 0,
  });
}
