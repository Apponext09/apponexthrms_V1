import { BaseRepository } from '../../db/BaseRepository';
import type { Organization } from '@apponexthrms/shared';
import type { TenantContext } from '../../db/types';

export class OrganizationsRepository extends BaseRepository<Organization> {
  constructor() {
    super('organizations');
  }

  /**
   * Get organization by ID (used by verify tenancy)
   * Note: no organization_id filter since we're looking up the org itself
   */
  async getOrgById(id: number): Promise<Organization | null> {
    return this.db('organizations').where('id', id).first() as Promise<Organization | null>;
  }

  /**
   * Get organization by slug (public lookup)
   */
  async getBySlug(slug: string): Promise<Organization | null> {
    return this.db('organizations')
      .where('slug', slug)
      .whereNull('deleted_at')
      .first() as Promise<Organization | null>;
  }

  /**
   * Get current organization for tenant
   * Override: Don't use query() since organizations table has no organization_id column
   */
  async getCurrent(ctx: TenantContext): Promise<Organization> {
    const org = await this.db('organizations')
      .where('id', ctx.organizationId)
      .first() as Promise<Organization | null>;

    if (!org) {
      throw new Error('Organization not found');
    }

    return org;
  }

  /**
   * Update organization (only core fields - extended profile in Phase 2)
   * Override: Don't use update() since organizations table has no organization_id column
   */
  async updateCore(ctx: TenantContext, data: Partial<Organization>): Promise<Organization> {
    const allowedFields = ['name', 'domain', 'timezone', 'locale'];
    const filtered: any = {};

    for (const field of allowedFields) {
      if (field in data) {
        filtered[field] = (data as any)[field];
      }
    }

    await this.db('organizations')
      .where('id', ctx.organizationId)
      .update({
        ...filtered,
        updated_at: new Date(),
      });

    const org = await this.db('organizations')
      .where('id', ctx.organizationId)
      .first() as Promise<Organization>;

    if (!org) {
      throw new Error('Organization not found after update');
    }

    return org;
  }

  /**
   * Get searchable fields
   */
  protected getSearchableFields(): string[] {
    return ['name', 'slug', 'domain'];
  }
}
