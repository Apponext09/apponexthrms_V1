import { getKnex } from '../../../db/knex';
import type { Permission } from '@apponexthrms/shared';

/**
 * Permission repository (no tenant scoping - permissions are platform-wide)
 */
export class PermissionRepository {
  private db = getKnex();

  /**
   * Get all permissions
   */
  async getAll(): Promise<Permission[]> {
    return this.db('permissions').select();
  }

  /**
   * Get permission by code
   */
  async getByCode(code: string): Promise<Permission | null> {
    return this.db('permissions').where('code', code).first() as Promise<Permission | null>;
  }

  /**
   * Get permissions for a role
   */
  async getForRole(roleId: number): Promise<Permission[]> {
    return this.db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_permissions.role_id', roleId)
      .distinct('permissions.*')
      .select('permissions.*');
  }

  /**
   * Get permissions for multiple roles
   */
  async getForRoles(roleIds: number[]): Promise<Permission[]> {
    if (roleIds.length === 0) {
      return [];
    }

    return this.db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .whereIn('role_permissions.role_id', roleIds)
      .distinct('permissions.*')
      .select('permissions.*');
  }

  /**
   * Get permissions by code list
   */
  async getByCodes(codes: string[]): Promise<Permission[]> {
    if (codes.length === 0) {
      return [];
    }

    return this.db('permissions').whereIn('code', codes).select();
  }

  /**
   * Assign permission to role
   */
  async assignToRole(roleId: number, permissionId: number): Promise<void> {
    await this.db('role_permissions').insert({
      role_id: roleId,
      permission_id: permissionId,
    });
  }

  /**
   * Remove permission from role
   */
  async removeFromRole(roleId: number, permissionId: number): Promise<void> {
    await this.db('role_permissions')
      .where('role_id', roleId)
      .where('permission_id', permissionId)
      .del();
  }

  /**
   * Assign multiple permissions to role
   */
  async assignManyToRole(roleId: number, permissionIds: number[]): Promise<void> {
    if (permissionIds.length === 0) {
      return;
    }

    const rows = permissionIds.map((permissionId) => ({
      role_id: roleId,
      permission_id: permissionId,
    }));

    await this.db('role_permissions').insert(rows);
  }

  /**
   * Remove all permissions from role
   */
  async clearRole(roleId: number): Promise<void> {
    await this.db('role_permissions').where('role_id', roleId).del();
  }
}
