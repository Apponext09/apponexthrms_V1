import type { Request, Response } from 'express';
import { OrganizationsService } from './organizations.service';
import type { ApiResponse } from '@apponexthrms/shared';

export class OrganizationsController {
  private orgService: OrganizationsService;

  constructor() {
    this.orgService = new OrganizationsService();
  }

  /**
   * GET /api/v1/organizations/current
   */
  async getCurrent(req: Request, res: Response): Promise<void> {
    const org = await this.orgService.getCurrentOrganization(req.ctx!);

    const response: ApiResponse = {
      success: true,
      data: org,
    };

    res.status(200).json(response);
  }

  /**
   * PUT /api/v1/organizations/current
   */
  async updateCurrent(req: Request, res: Response): Promise<void> {
    const org = await this.orgService.updateOrganization(req.ctx!, req.body);

    const response: ApiResponse = {
      success: true,
      data: org,
    };

    res.status(200).json(response);
  }
}
