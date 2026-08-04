import type { Request, Response } from 'express';
import { CompanyService } from '../services/CompanyService';
import type { ApiResponse } from '@apponexthrms/shared';

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();
  }

  /**
   * List companies with search field + status filtering.
   * Query params:
   *   - page, pageSize, sortBy, sortOrder
   *   - search: search term
   *   - searchField: 'all' | 'name' | 'code' (which field to search)
   *   - status: 'Active' | 'Inactive' (or omit for all)
   */
  async list(req: Request, res: Response): Promise<void> {
    const { page, pageSize, sortBy, sortOrder, search, searchField, status } = req.query;

    const filters: Record<string, any> = {};
    if (status && status !== 'all') {
      filters.status = status;
    }

    // Build search term based on searchField
    let effectiveSearch = search as string | undefined;
    let searchableOverride: string[] | undefined;

    if (searchField === 'name') {
      searchableOverride = ['name'];
    } else if (searchField === 'code') {
      searchableOverride = ['code'];
    }
    // 'all' or undefined uses default searchable fields (name + code)

    const result = await this.companyService.listCompanies(req.ctx!, {
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
      sortBy: (sortBy as string) || 'created_at',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      search: effectiveSearch,
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
    const company = await this.companyService.getCompany(req.ctx!, req.params.id);

    const response: ApiResponse = {
      success: true,
      data: company,
    };

    res.status(200).json(response);
  }

  async create(req: Request, res: Response): Promise<void> {
    const company = await this.companyService.createCompany(req.ctx!, req.body);

    const response: ApiResponse = {
      success: true,
      data: company,
    };

    res.status(201).json(response);
  }

  async update(req: Request, res: Response): Promise<void> {
    const company = await this.companyService.updateCompany(req.ctx!, req.params.id, req.body);

    const response: ApiResponse = {
      success: true,
      data: company,
    };

    res.status(200).json(response);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await this.companyService.deleteCompany(req.ctx!, req.params.id);

    const response: ApiResponse = {
      success: true,
    };

    res.status(200).json(response);
  }

  async restore(req: Request, res: Response): Promise<void> {
    const company = await this.companyService.restoreCompany(req.ctx!, req.params.id);

    const response: ApiResponse = {
      success: true,
      data: company,
    };

    res.status(200).json(response);
  }
}
