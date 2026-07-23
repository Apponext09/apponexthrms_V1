import { getKnex } from '../../db/knex';
import {
  getCachedPermissions,
  cachePermissions,
  invalidateUserPermissions,
  invalidateOrgPermissions,
} from '../../common/lib/cache';
import { logger } from '@/common/lib/logger';
import { NotFoundError, ForbiddenError } from '../../common/errors/index';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { AuditService } from '../audit/audit.service';
import { publishEvent } from '../../realtime/eventBus';
import type { TenantContext } from '../../db/types';
import type { EffectivePermissions } from './rbac.types';

export class RbacService {
  private roleRepo: RoleRepository;
  private permissionRepo: PermissionRepository;
  private auditService: AuditService;
  private db = getKnex();

  constructor() {
    this.roleRepo = new RoleRepository();
    this.permissionRepo = new PermissionRepository();
    this.auditService = new AuditService();
  }

  /**
   * Get effective permissions for a user (with caching)
   */
  async getEffectivePermissions(
    organizationId: number,
    userId: number
  ): Promise<EffectivePermissions> {
    // Check cache first
    const cached = getCachedPermissions(organizationId, userId);
    if (cached) {
      logger.debug('Permission cache hit', { organizationId, userId });

      // Reconstruct EffectivePermissions from cached codes
      const permissions = await this.permissionRepo.getByCodes(cached);

      return {
        userId,
        organizationId,
        roleIds: [], // Not cached
        roleCodes: [], // Not cached
        permissions,
        permissionCodes: cached,
      };
    }

    // Get user's roles
    const userRoles = await this.db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.organization_id', organizationId)
      .where('user_roles.user_id', userId)
      .select('roles.id', 'roles.code', 'user_roles.expires_at');

    // Filter out expired role assignments
    const now = new Date();
    const activeRoles = userRoles.filter((r) => !r.expires_at || new Date(r.expires_at) > now);

    const roleIds = activeRoles.map((r) => r.id);
    const roleCodes = activeRoles.map((r) => r.code);

    // Get all permissions for these roles
    const permissions = await this.permissionRepo.getForRoles(roleIds);
    const permissionCodes = permissions.map((p) => p.code);

    // Cache the permission codes
    cachePermissions(organizationId, userId, permissionCodes);

    logger.debug('Permission cache miss - computed', { organizationId, userId });

    return {
      userId,
      organizationId,
      roleIds,
      roleCodes,
      permissions,
      permissionCodes,
    };
  }

  /** List roles available within the current organization. */
  async listRoles(ctx: TenantContext) {
    return this.roleRepo.getForOrganization(ctx);
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    organizationId: number,
    userId: number,
    permission: string
  ): Promise<boolean> {
    const perms = await this.getEffectivePermissions(organizationId, userId);
    return perms.permissionCodes.includes(permission);
  }

  /**
   * Check if user has any of the given permissions
   */
  async hasAnyPermission(
    organizationId: number,
    userId: number,
    permissions: string[]
  ): Promise<boolean> {
    const perms = await this.getEffectivePermissions(organizationId, userId);
    return permissions.some((p) => perms.permissionCodes.includes(p));
  }

  /**
   * Check if user has all of the given permissions
   */
  async hasAllPermissions(
    organizationId: number,
    userId: number,
    permissions: string[]
  ): Promise<boolean> {
    const perms = await this.getEffectivePermissions(organizationId, userId);
    return permissions.every((p) => perms.permissionCodes.includes(p));
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(
    ctx: TenantContext,
    userId: number,
    roleId: number,
    expiresAt?: Date
  ): Promise<void> {
    // Verify role exists and belongs to organization or is platform role
    const role = await this.roleRepo.getById(ctx, roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Check if assignment already exists
    const existing = await this.db('user_roles')
      .where('organization_id', ctx.organizationId)
      .where('user_id', userId)
      .where('role_id', roleId)
      .first();

    if (existing) {
      throw new Error('User already has this role');
    }

    // Assign role
    await this.db('user_roles').insert({
      organization_id: ctx.organizationId,
      user_id: userId,
      role_id: roleId,
      assigned_by: ctx.userId,
      assigned_at: new Date(),
      expires_at: expiresAt,
    });

    // Invalidate user's permission cache
    invalidateUserPermissions(ctx.organizationId, userId);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'ASSIGN_ROLE',
      entityType: 'USER_ROLE',
      entityId: userId,
      afterState: {
        roleId,
        roleCode: role.code,
      },
    });

    // Emit event for real-time updates
    publishEvent('permission.assigned', {
      organizationId: ctx.organizationId,
      userId,
      roleId,
    });
  }

  /**
   * Revoke role from user
   */
  async revokeRoleFromUser(ctx: TenantContext, userId: number, roleId: number): Promise<void> {
    const existing = await this.db('user_roles')
      .where('organization_id', ctx.organizationId)
      .where('user_id', userId)
      .where('role_id', roleId)
      .first();

    if (!existing) {
      throw new NotFoundError('User role assignment not found');
    }

    // Delete the assignment
    await this.db('user_roles')
      .where('organization_id', ctx.organizationId)
      .where('user_id', userId)
      .where('role_id', roleId)
      .delete();

    // Invalidate user's permission cache
    invalidateUserPermissions(ctx.organizationId, userId);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'REVOKE_ROLE',
      entityType: 'USER_ROLE',
      entityId: userId,
      afterState: {
        roleId,
      },
    });

    // Emit event for real-time updates
    publishEvent('permission.revoked', {
      organizationId: ctx.organizationId,
      userId,
      roleId,
    });
  }

  /**
   * Create custom role
   */
  async createRole(ctx: TenantContext, input: { name: string; code: string; description?: string }) {
    // Check code is unique
    const existing = await this.roleRepo.getByCode(ctx, input.code);
    if (existing) {
      throw new Error(`Role code '${input.code}' already exists`);
    }

    const [roleId] = await this.db('roles').insert({
      uuid: require('uuid').v4(),
      organization_id: ctx.organizationId,
      name: input.name,
      code: input.code,
      description: input.description,
      is_system: false,
      is_platform_role: false,
      is_default: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Invalidate org permissions cache
    invalidateOrgPermissions(ctx.organizationId);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'ROLE',
      entityId: roleId,
      afterState: input,
    });

    return { id: roleId, ...input };
  }

  /**
   * Update role
   */
  async updateRole(
    ctx: TenantContext,
    roleId: number,
    input: { name?: string; description?: string }
  ) {
    const role = await this.roleRepo.getById(ctx, roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenError('Cannot update system roles');
    }

    const updated = await this.roleRepo.update(ctx, roleId, {
      name: input.name,
      description: input.description,
    } as any);

    // Invalidate org permissions cache
    invalidateOrgPermissions(ctx.organizationId);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'ROLE',
      entityId: roleId,
      beforeState: { name: role.name, description: role.description },
      afterState: input,
    });

    return updated;
  }

  /**
   * Delete role
   */
  async deleteRole(ctx: TenantContext, roleId: number): Promise<void> {
    const role = await this.roleRepo.getById(ctx, roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenError('Cannot delete system roles');
    }

    // Check if role is assigned to any users
    const assignmentCount = await this.db('user_roles')
      .where('role_id', roleId)
      .count('* as count')
      .first();

    if ((assignmentCount as any).count > 0) {
      throw new Error('Cannot delete role that is assigned to users');
    }

    // Soft delete
    await this.roleRepo.delete(ctx, roleId);

    // Invalidate org permissions cache
    invalidateOrgPermissions(ctx.organizationId);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'ROLE',
      entityId: roleId,
    });
  }
}


