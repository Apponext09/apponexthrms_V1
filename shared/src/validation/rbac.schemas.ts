import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50).regex(/^[a-z_]+$/),
  description: z.string().max(500).optional().nullable(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const rolePermissionsSchema = z.object({
  permissionCodes: z.array(z.string()),
});

export type RolePermissionsInput = z.infer<typeof rolePermissionsSchema>;

export const assignRoleSchema = z.object({
  roleId: z.number().int().positive(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

export const updateUserRolesSchema = z.object({
  roles: z.array(
    z.object({
      roleId: z.number().int().positive(),
      expiresAt: z.string().datetime().optional().nullable(),
    })
  ),
});

export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;

export const passwordPolicySchema = z.object({
  minLength: z.number().int().min(4).max(128),
  requireUppercase: z.boolean(),
  requireLowercase: z.boolean(),
  requireNumber: z.boolean(),
  requireSpecialChar: z.boolean(),
  passwordExpiryDays: z.number().int().min(1).optional().nullable(),
  passwordHistoryCount: z.number().int().min(1).max(24),
  maxFailedAttempts: z.number().int().min(1).max(10),
  lockoutDurationMinutes: z.number().int().min(1).max(1440),
  sessionTimeoutMinutes: z.number().int().min(1).max(1440),
  mfaRequired: z.boolean(),
});

export type PasswordPolicyInput = z.infer<typeof passwordPolicySchema>;
