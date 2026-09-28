import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { AccessPortal } from '../components/roleAccessTabs';

export interface AccessRole {
  id: number;
  name: string;
  code: string;
  portal?: AccessPortal;
  description?: string | null;
  isSystem?: boolean;
  isPlatformRole?: boolean;
  isDefault?: boolean;
}

export function useAccessRoles() {
  return useQuery({
    queryKey: ['access-roles'],
    queryFn: async (): Promise<AccessRole[]> => {
      const response = await apiClient.get('/rbac/roles');
      return response.data?.data?.items ?? [];
    },
  });
}
