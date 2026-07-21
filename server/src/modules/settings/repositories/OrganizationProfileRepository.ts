import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface OrganizationProfile {
  id: number;
  uuid: string;
  organization_id: number;
  company_name: string;
  legal_name: string | null;
  website: string | null;
  gst_number: string | null;
  pan_number: string | null;
  cin_number: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class OrganizationProfileRepository extends BaseRepository<OrganizationProfile> {
  constructor() {
    super('organization_profiles');
  }

  /**
   * Get profile by organization ID (1:1 relationship)
   */
  async getByOrganizationId(ctx: TenantContext): Promise<OrganizationProfile | null> {
    return this.query(ctx).first() as Promise<OrganizationProfile | null>;
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['company_name', 'legal_name', 'gst_number', 'pan_number'];
  }
}
