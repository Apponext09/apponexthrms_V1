import type { Request, Response } from 'express';
import { RbacService } from './rbac.service';
import type { ApiResponse } from '@apponexthrms/shared';
import { z } from 'zod';

const roleCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{1,49}$/),
  description: z.string().trim().max(500).optional(),
});
const roleUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
});
const menuSelectionSchema = z.object({ menuIds: z.array(z.number().int().positive()).max(2000) });

export class RbacController {
  private rbacService: RbacService;

  constructor() {
    this.rbacService = new RbacService();
  }

  /**
   * GET /api/v1/rbac/me/permissions
   */
  async getMyPermissions(req: Request, res: Response): Promise<void> {
    const perms = await this.rbacService.getEffectivePermissions(
      req.ctx!.organizationId,
      req.ctx!.userId
    );

    const response: ApiResponse = {
      success: true,
      data: {
        permissions: perms.permissionCodes,
        roles: perms.roleCodes,
      },
    };

    res.status(200).json(response);
  }

  /**
   * GET /api/v1/rbac/roles
   */
  async listRoles(req: Request, res: Response): Promise<void> {
    const roles = await this.rbacService.listRoles(req.ctx!);

    const response: ApiResponse = {
      success: true,
      data: {
        items: roles,
        meta: {
          page: 1,
          pageSize: roles.length,
          total: roles.length,
          hasMore: false,
          totalPages: 1,
        },
      },
    };

    res.status(200).json(response);
  }

  async listMenus(_req: Request, res: Response): Promise<void> {
    const items = await this.rbacService.listMenus();
    res.json({ success: true, data: { items } });
  }

  async getRoleMenus(req: Request, res: Response): Promise<void> {
    const data = await this.rbacService.getRoleMenus(req.ctx!, Number(req.params.roleId));
    res.json({ success: true, data });
  }

  async setRoleMenus(req: Request, res: Response): Promise<void> {
    const { menuIds } = menuSelectionSchema.parse(req.body);
    const data = await this.rbacService.setRoleMenus(req.ctx!, Number(req.params.roleId), menuIds);
    res.json({ success: true, data });
  }

  async getMyMenus(req: Request, res: Response): Promise<void> {
    const data = await this.rbacService.getMyMenus(req.ctx!);
    res.json({ success: true, data });
  }

  async createRole(req: Request, res: Response): Promise<void> {
    const input = roleCreateSchema.parse(req.body);
    const role = await this.rbacService.createRole(req.ctx!, { name: input.name!, code: input.code!, description: input.description });
    res.status(201).json({ success: true, data: role });
  }

  async updateRole(req: Request, res: Response): Promise<void> {
    const input = roleUpdateSchema.parse(req.body);
    const role = await this.rbacService.updateRole(req.ctx!, Number(req.params.roleId), input);
    res.json({ success: true, data: role });
  }

  async deleteRole(req: Request, res: Response): Promise<void> {
    await this.rbacService.deleteRole(req.ctx!, Number(req.params.roleId));
    res.json({ success: true });
  }

  /**
   * POST /api/v1/rbac/users/:userId/roles/:roleId
   */
  async assignRoleToUser(req: Request, res: Response): Promise<void> {
    const { userId, roleId } = req.params;

    await this.rbacService.assignRoleToUser(req.ctx!, parseInt(userId, 10), parseInt(roleId, 10));

    const response: ApiResponse = {
      success: true,
    };

    res.status(201).json(response);
  }

  /**
   * DELETE /api/v1/rbac/users/:userId/roles/:roleId
   */
  async revokeRoleFromUser(req: Request, res: Response): Promise<void> {
    const { userId, roleId } = req.params;

    await this.rbacService.revokeRoleFromUser(req.ctx!, parseInt(userId, 10), parseInt(roleId, 10));

    const response: ApiResponse = {
      success: true,
    };

    res.status(200).json(response);
  }
}
