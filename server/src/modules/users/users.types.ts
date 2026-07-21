import type { User } from '@apponexthrms/shared';

export interface UserWithRoles extends User {
  roles: string[];
  permissions: string[];
}

export interface UpdateUserInput {
  email?: string;
  mobile?: string;
  mobileCountryCode?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'locked';
}
