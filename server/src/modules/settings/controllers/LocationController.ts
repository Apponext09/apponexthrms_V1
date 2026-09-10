import type { Request, Response } from 'express';
import { LocationService } from '../services/LocationService';
import type { ApiResponse } from '@apponexthrms/shared';

export class LocationController {
  private locationService: LocationService;

  constructor() {
    this.locationService = new LocationService();
  }

  async list(req: Request, res: Response): Promise<void> {
    const { page, pageSize, sortBy, sortOrder, search, type, status } = req.query;
    const result = await this.locationService.listLocations(req.ctx!, {
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
      sortBy: (sortBy as string) || 'created_at',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      search: search as string,
      filters: {
        ...(type && { type }),
        ...(status && { status }),
      },
    });

    const response: ApiResponse = {
      success: true,
      data: result.items,
      meta: result.meta,
    };

    res.status(200).json(response);
  }

  async get(req: Request, res: Response): Promise<void> {
    const location = await this.locationService.getLocation(req.ctx!, req.params.id);
    const response: ApiResponse = { success: true, data: location };
    res.status(200).json(response);
  }

  async create(req: Request, res: Response): Promise<void> {
    const location = await this.locationService.createLocation(req.ctx!, req.body);
    const response: ApiResponse = { success: true, data: location };
    res.status(201).json(response);
  }

  async update(req: Request, res: Response): Promise<void> {
    const location = await this.locationService.updateLocation(req.ctx!, req.params.id, req.body);
    const response: ApiResponse = { success: true, data: location };
    res.status(200).json(response);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await this.locationService.deleteLocation(req.ctx!, req.params.id);
    const response: ApiResponse = { success: true };
    res.status(200).json(response);
  }

  async restore(req: Request, res: Response): Promise<void> {
    const location = await this.locationService.restoreLocation(req.ctx!, req.params.id);
    const response: ApiResponse = { success: true, data: location };
    res.status(200).json(response);
  }

  async listCompanies(req: Request, res: Response): Promise<void> {
    const companies = await this.locationService.listCompanies(req.ctx!);
    const response: ApiResponse = { success: true, data: companies };
    res.status(200).json(response);
  }
}
