import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../db/knex';
import {
  getCachedPermissions,
  cachePermissions,
  invalidateUserPermissions,
  invalidateOrgPermissions,
} from '../../common/lib/cache';
import { logger } from '../../common/lib/logger';
import { NotFoundError, ForbiddenError, ConflictError } from '../../common/errors/index';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { AuditService } from '../audit/audit.service';
import { publishEvent } from '../../realtime/eventBus';
import type { TenantContext } from '../../db/types';
import type { EffectivePermissions } from './rbac.types';
import { canManageRoleMenu } from './role-management-policy';
import { SUBSCRIPTION_ALIASES, expandMenuSelection, pageAllowsReadPermission } from './menu.catalog';

const legacyRolePortals: Record<string, string[]> = {
  organization_admin: ['admin', 'manager', 'finance'], org_admin: ['admin', 'manager', 'finance'], owner: ['admin', 'manager', 'finance'], admin: ['admin', 'manager', 'finance'], ceo: ['admin', 'manager', 'finance'],
  cto: ['admin', 'manager', 'finance'], cfo: ['admin', 'manager', 'finance'], coo: ['admin', 'manager', 'finance'], cxo: ['admin', 'manager', 'finance'],
  hr: ['hr', 'finance'], hr_admin: ['hr', 'finance'], hr_manager: ['hr', 'finance'],
  manager: ['manager'], department_head: ['manager'], dept_head: ['manager'], reporting_manager: ['manager'],
  team_lead: ['team_lead'], lead: ['team_lead'], finance: ['finance'], finance_manager: ['finance'],
  intern: ['intern', 'employee'], consultant: ['consultant', 'employee'], employee: ['employee'], support: ['employee'],
};

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

  /** The catalog is global; role grants are always scoped through an organization role. */
  async listMenus() {
    const rows = await this.db('menu_items').where('is_active', true)
      .orderBy('sort_order').select('id', 'code', 'label', 'portal', 'route', 'parent_id', 'sort_order', 'subscription_module');
    return rows.map((row) => ({ ...row, path: row.route, parentId: row.parentId ?? row.parent_id, sortOrder: row.sortOrder ?? row.sort_order, subscriptionModule: row.subscriptionModule ?? row.subscription_module }));
  }

  private async organizationRole(ctx: TenantContext, roleId: number) {
    if (!Number.isSafeInteger(roleId) || roleId <= 0) throw new NotFoundError('Role not found');
    const role = await this.db('roles').where({ id: roleId, organization_id: ctx.organizationId })
      .whereNull('deleted_at').where('is_platform_role', false).whereNot('code', 'super_admin').first();
    if (!role) throw new NotFoundError('Role not found');
    return role;
  }

  /** Handles standard roles created in a new organization after the catalog migration. */
  private async initializeLegacyRole(role: any): Promise<void> {
    if (role.menuAccessInitialized ?? role.menu_access_initialized) return;
    const portals = legacyRolePortals[role.code] || ((role.isSystem ?? role.is_system) ? ['employee'] : null);
    if (!portals) return;
    await this.db.transaction(async (trx) => {
      const locked = await trx('roles').where('id', role.id).forUpdate().first('menu_access_initialized');
      if (locked?.menuAccessInitialized ?? locked?.menu_access_initialized) return;
      const menuRows = await trx('menu_items').whereIn('portal', portals).select('id', 'parent_id');
      const ids = [...new Set(menuRows.flatMap((row) => [Number(row.id), Number(row.parentId ?? row.parent_id)]).filter(Boolean))];
      for (let index = 0; index < ids.length; index += 100) {
        await trx('role_menu_access').insert(ids.slice(index, index + 100).map((menuId) => ({ role_id: role.id, menu_id: menuId })))
          .onConflict(['role_id', 'menu_id']).ignore();
      }
      await trx('roles').where('id', role.id).update({ menu_access_initialized: true });
    });
  }

  async getRoleMenus(ctx: TenantContext, roleId: number) {
    const role = await this.organizationRole(ctx, roleId);
    await this.initializeLegacyRole(role);
    const rows = await this.db('role_menu_access').where('role_id', roleId).pluck('menu_id');
    return { menuIds: rows.map(Number) };
  }

  async setRoleMenus(ctx: TenantContext, roleId: number, requestedIds: number[]) {
    const role = await this.organizationRole(ctx, roleId);
    const ids = [...new Set(requestedIds)];
    if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw new ForbiddenError('Invalid menu selection');
    const menus = ids.length ? await this.db('menu_items').whereIn('id', ids).where('is_active', true)
      .select('id', 'code', 'parent_id') : [];
    if (menus.length !== ids.length) throw new ForbiddenError('One or more menu items are invalid');
    const actorAccess = await this.getMyMenus(ctx);
    if (!canManageRoleMenu(actorAccess.roleCodes, role.code)) {
      throw new ForbiddenError('This role cannot be managed from your account');
    }
    const actorIsAdmin = actorAccess.roleCodes.some((code: string) => ['organization_admin', 'ceo'].includes(code));
    if (!actorIsAdmin) {
      // HR can administer lower organization roles, but cannot edit an admin/HR
      // system role or grant pages beyond the HR user's own effective access.
      const allowedCodes = new Set(actorAccess.menuCodes);
      if (menus.some((menu) => !allowedCodes.has(menu.code))) {
        throw new ForbiddenError('Cannot grant access that your own role does not have');
      }
    }
    const effectiveIds = expandMenuSelection(ids, menus);
    const before = await this.getRoleMenus(ctx, roleId);
    await this.db.transaction(async (trx) => {
      await trx('role_menu_access').where('role_id', roleId).delete();
      await trx('roles').where('id', roleId).update({ menu_access_initialized: true });
      for (let index = 0; index < effectiveIds.length; index += 100) {
        await trx('role_menu_access').insert(effectiveIds.slice(index, index + 100).map((menuId) => ({ role_id: roleId, menu_id: menuId })));
      }
    });
    invalidateOrgPermissions(ctx.organizationId);
    await this.auditService.log(ctx, {
      action: 'UPDATE', entityType: 'ROLE_MENU_ACCESS', entityId: roleId,
      beforeState: before, afterState: { menuIds: effectiveIds, roleCode: role.code },
    });
    publishEvent('permission.assigned', { organizationId: ctx.organizationId, roleId, menuIds: effectiveIds });
    return { menuIds: effectiveIds };
  }

  /** Union of non-expired role grants. No role-code fallback: unknown/new roles start with no access. */
  async getMyMenus(ctx: TenantContext) {
    const roleRows = await this.db('user_roles as ur').join('roles as r', 'r.id', 'ur.role_id')
      .where((query) => query.where('ur.organization_id', ctx.organizationId).orWhereNull('ur.organization_id'))
      .where('ur.user_id', ctx.userId)
      .where('r.organization_id', ctx.organizationId).whereNull('r.deleted_at')
      .where((query) => query.whereNull('ur.expires_at').orWhere('ur.expires_at', '>', this.db.fn.now()))
      .select('r.id', 'r.code', 'r.is_system', 'r.menu_access_initialized');
    for (const role of roleRows) await this.initializeLegacyRole(role);
    const roleIds = roleRows.map((row) => Number(row.id));
    const menus = roleIds.length ? await this.db('role_menu_access as rma')
      .join('menu_items as menu', 'menu.id', 'rma.menu_id')
      .whereIn('rma.role_id', roleIds).where('menu.is_active', true)
      .distinct('menu.code', 'menu.route', 'menu.portal', 'menu.parent_id', 'menu.subscription_module') : [];
    const organization = await this.db('organizations').where('id', ctx.organizationId).first('enabled_modules');
    const rawModules = organization?.enabledModules ?? organization?.enabled_modules;
    let enabledModules: string[] | null = null;
    if (rawModules != null) {
      try {
        const parsed = typeof rawModules === 'string' ? JSON.parse(rawModules) : rawModules;
        enabledModules = Array.isArray(parsed) ? parsed.map((entry) => String(entry).toLowerCase()) : [];
      } catch { enabledModules = []; }
    }
    const licensed = menus.filter((menu) => {
      const module = menu.subscriptionModule ?? menu.subscription_module;
      if (!module || enabledModules === null) return true;
      const names = [module, ...(SUBSCRIPTION_ALIASES[module] || [])].map((name) => name.toLowerCase());
      return names.some((name) => enabledModules!.includes(name));
    });
    return {
      configured: true,
      roleCodes: roleRows.map((row) => row.code),
      menuCodes: licensed.map((menu) => menu.code),
      paths: licensed.filter((menu) => menu.route).map((menu) => menu.route),
      items: licensed.map((menu) => ({ code: menu.code, route: menu.route, portal: menu.portal, parentId: menu.parentId ?? menu.parent_id })),
    };
  }

  async hasMenuReadPermission(ctx: TenantContext, permission: string): Promise<boolean> {
    const access = await this.getMyMenus(ctx);
    return access.items.some((item) => item.route && pageAllowsReadPermission(permission, item.route));
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
    if (!role || role.isPlatformRole || role.code === 'super_admin') {
      throw new NotFoundError('Role not found');
    }
    const targetUser = await this.db('users').where({ id: userId, organization_id: ctx.organizationId }).first('id');
    if (!targetUser) throw new NotFoundError('User not found in this organization');

    // Check if assignment already exists
    const existing = await this.db('user_roles')
      .where('organization_id', ctx.organizationId)
      .where('user_id', userId)
      .where('role_id', roleId)
      .first();

    if (existing) {
      throw new ConflictError('User already has this role');
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
    // Only the true platform-root codes are permanently reserved.
    // Org-level system roles (hr, employee, manager etc.) are NOT reserved.
    const reservedCodes = ['super_admin', 'superadmin'];

    // Block only platform-global roles (organization_id IS NULL, is_platform_role=true).
    const existingPlatformRole = await this.db('roles')
      .where('code', input.code)
      .where('is_platform_role', true)
      .whereNull('organization_id')
      .first('id');

    if (reservedCodes.includes(input.code) || existingPlatformRole) {
      throw new ForbiddenError('This role code is reserved for system roles');
    }
    // Check code is unique
    const existing = await this.roleRepo.getByCode(ctx, input.code);
    if (existing) {
      throw new ConflictError(`Role code '${input.code}' already exists`);
    }

    const [roleId] = await this.db('roles').insert({
      uuid: uuidv4(),
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

    if (!canManageRoleMenu((await this.getMyMenus(ctx)).roleCodes, role.code)) {
      throw new ForbiddenError('This role cannot be managed from your account');
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

    if (!canManageRoleMenu((await this.getMyMenus(ctx)).roleCodes, role.code)) {
      throw new ForbiddenError('This role cannot be managed from your account');
    }

    if (role.isSystem) {
      throw new ForbiddenError('Cannot delete system roles');
    }

    // Check if role is assigned to any users
    const assignmentCount = await this.db('user_roles')
      .where('role_id', roleId)
      .count('* as count')
      .first();

    if (Number((assignmentCount as any)?.count || 0) > 0) {
      throw new ConflictError('Cannot delete a role that is still assigned to users');
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
