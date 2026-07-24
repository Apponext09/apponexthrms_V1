import { BaseRepository } from '../../../db/BaseRepository';
import type { User } from '@apponexthrms/shared';
import type { TenantContext } from '../../../db/types';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  /**
   * Get user by email (across organization, used for login)
   */
  async getByEmail(email: string): Promise<User | null> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = await this.db('users')
      .whereRaw('LOWER(email) = ?', [cleanEmail])
      .first();

    if (!user) {
      return null;
    }

    // Ensure camelCase conversion works by manually mapping snake_case to camelCase
    return {
      ...user,
      organizationId: user.organization_id || user.organizationId,
      emailVerifiedAt: user.email_verified_at || user.emailVerifiedAt,
      mobileVerifiedAt: user.mobile_verified_at || user.mobileVerifiedAt,
      mfaEnabled: user.mfa_enabled !== undefined ? user.mfa_enabled : user.mfaEnabled,
      failedLoginAttempts: user.failed_login_attempts || user.failedLoginAttempts,
      lockedUntil: user.locked_until || user.lockedUntil,
      lastLoginAt: user.last_login_at || user.lastLoginAt,
      lastPasswordChangedAt: user.last_password_changed_at || user.lastPasswordChangedAt,
      mustChangePassword: user.must_change_password !== undefined ? user.must_change_password : user.mustChangePassword,
      createdAt: user.created_at || user.createdAt,
      updatedAt: user.updated_at || user.updatedAt,
      deletedAt: user.deleted_at || user.deletedAt,
      mobileCountryCode: user.mobile_country_code || user.mobileCountryCode,
      employeeId: user.employee_id || user.employeeId,
    } as User;
  }

  /**
   * Get user by email within organization
   */
  async getByEmailInOrg(ctx: TenantContext, email: string): Promise<User | null> {
    return this.query(ctx).where('email', email).first() as Promise<User | null>;
  }

  /**
   * Get user by UUID (across organization)
   */
  async getByUuid(uuid: string): Promise<User | null> {
    return this.db('users')
      .where('uuid', uuid)
      .first() as Promise<User | null>;
  }

  /**
   * Get user with roles and permissions
   */
  async getWithPermissions(ctx: TenantContext, userId: number) {
    const user = await this.getById(ctx, userId);
    if (!user) {
      return null;
    }

    // Fetch roles
    const roles = await this.db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', userId)
      .where('user_roles.organization_id', ctx.organizationId)
      .select('roles.code', 'roles.name', 'roles.id');

    // Fetch permissions via roles
    const permissions = await this.db('role_permissions')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .whereIn(
        'role_permissions.role_id',
        roles.map((r) => r.id)
      )
      .distinct('permissions.code')
      .select('permissions.code');

    return {
      ...user,
      roles: roles.map((r) => r.code),
      permissions: permissions.map((p) => p.code),
    };
  }

  /**
   * Check if email is unique across organization
   */
  async isEmailUnique(ctx: TenantContext, email: string, excludeUserId?: number): Promise<boolean> {
    let query = this.query(ctx).where('email', email);

    if (excludeUserId) {
      query = query.whereNot('id', excludeUserId);
    }

    const count = await query.count('* as count').first();
    return (count as any).count === 0;
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['email', 'first_name', 'last_name'];
  }
}
