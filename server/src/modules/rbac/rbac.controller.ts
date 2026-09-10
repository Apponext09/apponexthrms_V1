import type { Request, Response } from 'express';
import { RbacService } from './rbac.service';
import type { ApiResponse } from '@apponexthrms/shared';

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
