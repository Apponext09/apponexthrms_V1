import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { superAdminService } from '../superadmin.service';

export class SuperAdminProfileController {
  /**
   * Get SuperAdmin profile details
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const email = req.user?.sub ? undefined : 'superadmin@apponext.com';
    const profile = await superAdminService.getProfile(email);
    res.json({
      success: true,
      data: profile,
    });
  });

  /**
   * Update SuperAdmin profile details
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const updated = await superAdminService.updateProfile(req.body);
    res.json({
      success: true,
      message: 'SuperAdmin profile updated successfully',
      data: updated,
    });
  });

  /**
   * Change password with 2FA authenticator verification UI endpoint
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await superAdminService.changePassword(req.body);
    res.json({
      success: true,
      message: 'Password changed successfully with Authenticator verification',
      data: result,
    });
  });
}

export const superAdminProfileController = new SuperAdminProfileController();
