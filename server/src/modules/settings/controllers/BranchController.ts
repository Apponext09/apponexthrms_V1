import type { Request, Response } from 'express';
import { BranchService } from '../services/BranchService';
import type { ApiResponse } from '@apponexthrms/shared';

export class BranchController {
  private branchService: BranchService;

  constructor() {
    this.branchService = new BranchService();
  }

  async list(req: Request, res: Response): Promise<void> {
    const { page, pageSize, sortBy, sortOrder, search, status } = req.query;
    const result = await this.branchService.listBranches(req.ctx!, {
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
      sortBy: (sortBy as string) || 'created_at',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      search: search as string,
      filters: status ? { status } : {},
    });

    const response: ApiResponse = {
      success: true,
      data: result.items,
      meta: result.meta,
    };

    res.status(200).json(response);
  }

  async get(req: Request, res: Response): Promise<void> {
    const branch = await this.branchService.getBranch(req.ctx!, req.params.id);

    const response: ApiResponse = {
      success: true,
      data: branch,
    };

    res.status(200).json(response);
  }

  async create(req: Request, res: Response): Promise<void> {
    const branch = await this.branchService.createBranch(req.ctx!, req.body);

    const response: ApiResponse = {
      success: true,
      data: branch,
    };

    res.status(201).json(response);
  }

  async update(req: Request, res: Response): Promise<void> {
    const branch = await this.branchService.updateBranch(req.ctx!, req.params.id, req.body);

    const response: ApiResponse = {
      success: true,
      data: branch,
    };

    res.status(200).json(response);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await this.branchService.deleteBranch(req.ctx!, req.params.id);

    const response: ApiResponse = {
      success: true,
    };

    res.status(200).json(response);
  }

  async restore(req: Request, res: Response): Promise<void> {
    const branch = await this.branchService.restoreBranch(req.ctx!, req.params.id);

    const response: ApiResponse = {
      success: true,
      data: branch,
    };

    res.status(200).json(response);
  }
}
