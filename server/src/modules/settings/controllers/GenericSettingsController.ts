import type { Request, Response } from 'express';
import type { GenericSettingsService } from '../services/GenericSettingsService';
import type { ApiResponse } from '@apponexthrms/shared';

/**
 * Generic controller for simple CRUD operations
 * Reusable across all settings modules
 */
export class GenericSettingsController {
  constructor(private service: GenericSettingsService, private moduleName: string) {}

  async list(req: Request, res: Response): Promise<void> {
    const { page, pageSize, sortBy, sortOrder, search, ...filters } = req.query;
    const result = await this.service.list(req.ctx!, {
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
      sortBy: (sortBy as string) || 'created_at',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      search: search as string,
      filters,
    });

    const response: ApiResponse = {
      success: true,
      data: result.items,
      meta: result.meta,
    };

    res.status(200).json(response);
  }

  async get(req: Request, res: Response): Promise<void> {
    const item = await this.service.getById(req.ctx!, req.params.id);
    const response: ApiResponse = { success: true, data: item };
    res.status(200).json(response);
  }

  async create(req: Request, res: Response): Promise<void> {
    const item = await this.service.create(req.ctx!, req.body);
    const response: ApiResponse = { success: true, data: item };
    res.status(201).json(response);
  }

  async update(req: Request, res: Response): Promise<void> {
    const item = await this.service.update(req.ctx!, req.params.id, req.body);
    const response: ApiResponse = { success: true, data: item };
    res.status(200).json(response);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await this.service.delete(req.ctx!, req.params.id);
    const response: ApiResponse = { success: true };
    res.status(200).json(response);
  }

  async restore(req: Request, res: Response): Promise<void> {
    const item = await this.service.restore(req.ctx!, req.params.id);
    const response: ApiResponse = { success: true, data: item };
    res.status(200).json(response);
  }
}
