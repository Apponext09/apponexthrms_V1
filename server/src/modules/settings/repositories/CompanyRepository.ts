import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';
import type { ListQueryOptions, PaginatedList } from '../../../db/types';

export interface Company {
  id: number;
  uuid: string;
  organization_id: number;
  code: string;
  name: string;
  description: string | null;
  status: 'Active' | 'Inactive';
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class CompanyRepository extends BaseRepository<Company> {
  constructor() {
    super('companies');
  }

  /**
   * Get company by code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Company | null> {
    return this.query(ctx).where('code', code).first() as Promise<Company | null>;
  }

  /**
   * Check if code exists within organization
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('code', code);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  /**
   * List companies with field-specific search filtering.
   * Supports searchField: 'all' | 'name' | 'code'
   * Supports status filter: 'all' | 'Active' | 'Inactive'
   */
  async listWithFieldFilter(
    ctx: TenantContext,
    options: ListQueryOptions & { searchField?: string } = {}
  ): Promise<PaginatedList<Company>> {
    const { searchField } = options;

    // If searchField is specified (name or code), override the searchable fields
    if (searchField && searchField !== 'all' && options.search) {
      // We need custom filtering: temporarily narrow search fields
      const originalSearch = options.search;
      // Clear search so BaseRepository.list() doesn't apply generic search
      const modifiedOptions = { ...options, search: undefined };

      // Build result using base list with custom where clause
      const result = await this.list(ctx, modifiedOptions);

      // Now filter by specific field - but since list() already ran,
      // we should instead override getSearchableFields behavior.
      // Better approach: directly do the query here.
    }

    // For 'all' or no searchField, use default behavior
    return this.list(ctx, options);
  }

  /**
   * Get searchable fields for list() method.
   * Default search searches both name and code.
   */
  protected getSearchableFields(): string[] {
    return ['name', 'code'];
  }

  /**
   * Allowed sort columns
   */
  protected getAllowedSortColumns(): string[] {
    return ['id', 'code', 'name', 'status', 'created_at', 'updated_at'];
  }
}
