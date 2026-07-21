import type { Role, Permission } from '@apponexthrms/shared';

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface EffectivePermissions {
  userId: number;
  organizationId: number;
  roleIds: number[];
  roleCodes: string[];
  permissions: Permission[];
  permissionCodes: string[];
}

export interface CreateRoleInput {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
}

export interface AssignRoleInput {
  userId: number;
  roleId: number;
  expiresAt?: string;
}

export interface RevokeRoleInput {
  userId: number;
  roleId: number;
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  permission: string;
}
