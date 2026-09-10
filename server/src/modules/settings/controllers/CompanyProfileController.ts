import type { Request, Response } from 'express';
import { CompanyProfileService } from '../services/CompanyProfileService';
import type { ApiResponse } from '@apponexthrms/shared';

export class CompanyProfileController {
  private profileService: CompanyProfileService;

  constructor() {
    this.profileService = new CompanyProfileService();
  }

  async get(req: Request, res: Response): Promise<void> {
    const profile = await this.profileService.getProfile(req.ctx!);

    const response: ApiResponse = {
      success: true,
      data: profile,
    };

    res.status(200).json(response);
  }

  async upsert(req: Request, res: Response): Promise<void> {
    const profile = await this.profileService.upsertProfile(req.ctx!, req.body);

    const response: ApiResponse = {
      success: true,
      data: profile,
    };

    res.status(200).json(response);
  }
}
