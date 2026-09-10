import type { Request, Response } from 'express';
import { UsersService } from './users.service';
import type { ApiResponse } from '@apponexthrms/shared';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  /**
   * GET /api/v1/users
   */
  async listUsers(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20;

    const result = await this.usersService.listUsers(req.ctx!, page, pageSize);

    const response: ApiResponse = {
      success: true,
      data: {
        items: result.items,
      },
      meta: result.meta,
    };

    res.status(200).json(response);
  }

  /**
   * GET /api/v1/users/:userId
   */
  async getUser(req: Request, res: Response): Promise<void> {
    const userId = parseInt(req.params.userId, 10);
    const user = await this.usersService.getUser(req.ctx!, userId);

    const response: ApiResponse = {
      success: true,
      data: user,
    };

    res.status(200).json(response);
  }

  /**
   * PUT /api/v1/users/:userId
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    const userId = parseInt(req.params.userId, 10);
    const user = await this.usersService.updateUser(req.ctx!, userId, req.body);

    const response: ApiResponse = {
      success: true,
      data: user,
    };

    res.status(200).json(response);
  }

  /**
   * POST /api/v1/users/:userId/force-logout
   */
  async forceLogout(req: Request, res: Response): Promise<void> {
    const userId = parseInt(req.params.userId, 10);
    const result = await this.usersService.forceLogout(req.ctx!, userId);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  }
}
