import { BaseRepository } from '../../../db/BaseRepository';
import type { Role } from '@apponexthrms/shared';
import type { TenantContext } from '../../../db/types';

export class RoleRepository extends BaseRepository<Role> {
  constructor() {
    super('roles');
  }

  /**
   * Get role with all permissions
   */
  async getRoleWithPermissions(ctx: TenantContext, roleId: number) {
    const role = await this.getById(ctx, roleId);
    if (!role) {
      return null;
    }

    const permissions = await this.db('role_permissions')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .where('role_permissions.role_id', roleId)
      .select('permissions.*');

    return {
      ...role,
      permissions,
    };
  }

  /**
   * Get role by code
   */
  async getByCode(ctx: TenantContext, code: string) {
    return this.query(ctx)
      .where('code', code)
      .first() as Promise<Role | null>;
  }

  /** Organization roles only; platform roles are managed separately. */
  async getForOrganization(ctx: TenantContext) {
    return (await this.query(ctx)
      .where('is_platform_role', false)
      .whereNot('code', 'super_admin')
      .whereNull('deleted_at')
      .select()) as Promise<Role[]>;
  }

  /**
   * Check if role code is unique within organization
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeRoleId?: number): Promise<boolean> {
    let query = this.query(ctx).where('code', code);

    if (excludeRoleId) {
      query = query.whereNot('id', excludeRoleId);
    }

    const count = await query.count('* as count').first();
    return (count as any).count === 0;
  }

  /**
   * Get searchable fields
   */
  protected getSearchableFields(): string[] {
    return ['name', 'code', 'description'];
  }
}
