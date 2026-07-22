import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { superAdminService } from '../superadmin.service';

export class SuperAdminOrganizationController {
  /**
   * List all client organizations
   */
  listOrganizations = asyncHandler(async (req: Request, res: Response) => {
    const organizations = await superAdminService.listOrganizations();
    res.json({
      success: true,
      data: organizations,
    });
  });

  /**
   * Create new organization tenant
   */
  createOrganization = asyncHandler(async (req: Request, res: Response) => {
    const { name, code, ownerName, location, email, phone, password, websiteUrl, plan, industry } = req.body;
    const organization = await superAdminService.createOrganization({
      name,
      code,
      ownerName,
      location,
      email,
      phone,
      password,
      websiteUrl,
      plan,
      industry,
    });

    res.status(201).json({
      success: true,
      data: organization,
    });
  });

  /**
   * Update existing organization tenant
   */
  updateOrganization = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const organization = await superAdminService.updateOrganization(id, req.body);
    res.json({
      success: true,
      data: organization,
    });
  });

  /**
   * Toggle organization status (active/inactive)
   */
  toggleStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const organization = await superAdminService.toggleOrganizationStatus(id, status);
    res.json({
      success: true,
      data: organization,
    });
  });

  /**
   * Delete organization tenant
   */
  deleteOrganization = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await superAdminService.deleteOrganization(id);
    res.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  });
}

export const superAdminOrganizationController = new SuperAdminOrganizationController();
