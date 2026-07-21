import { BaseRepository } from '../../db/BaseRepository';
import type { User } from '@apponexthrms/shared';
import type { TenantContext } from '../../db/types';

export class UsersRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  /**
   * Get user by ID within organization
   */
  async getInOrganization(ctx: TenantContext, userId: number): Promise<User | null> {
    return this.getById(ctx, userId);
  }

  /**
   * Get user with roles
   */
  async getWithRoles(ctx: TenantContext, userId: number) {
    const user = await this.getById(ctx, userId);
    if (!user) {
      return null;
    }

    const roles = await this.db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .where('user_roles.organization_id', ctx.organizationId)
      .whereNull('user_roles.deleted_at')
      .select('roles.code', 'roles.name');

    return {
      ...user,
      roles: roles.map((r) => r.code),
    };
  }

  /**
   * Get searchable fields
   */
  protected getSearchableFields(): string[] {
    return ['email', 'first_name', 'last_name', 'mobile'];
  }
}
