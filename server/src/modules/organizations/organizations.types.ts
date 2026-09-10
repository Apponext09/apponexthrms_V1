import type { Organization } from '@apponexthrms/shared';

export interface UpdateOrganizationInput {
  name?: string;
  domain?: string;
  timezone?: string;
  locale?: string;
}

export type OrganizationResponse = Organization;
