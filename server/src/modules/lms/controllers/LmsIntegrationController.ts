import type { Request, Response } from 'express';
import { lmsIntegrationService } from '../services/LmsIntegrationService';
import type { LmsPlatform } from '../services/LmsIntegrationService';
import type { ApiResponse } from '@apponexthrms/shared';

const VALID_PLATFORMS: LmsPlatform[] = ['udemy', 'coursera', 'linkedin'];

class LmsIntegrationController {
  /**
   * GET /api/v1/lms/integrations/settings
   * Returns integration flags for all platforms (safe — no credentials in response).
   */
  async getSettings(req: Request, res: Response): Promise<void> {
    const settings = await lmsIntegrationService.getSettings(req.ctx!);
    const response: ApiResponse = { success: true, data: settings };
    res.status(200).json(response);
  }

  /**
   * PUT /api/v1/lms/integrations/settings/:platform
   * Admin-only: enable/disable a platform and save credentials.
   *
   * Body: { isEnabled?: boolean, config?: { apiKey, orgSubdomain, orgId, ... } }
   */
  async updateSetting(req: Request, res: Response): Promise<void> {
    const platform = req.params.platform as LmsPlatform;

    if (!VALID_PLATFORMS.includes(platform)) {
      const response: ApiResponse = {
        success: false,
        error: `Unknown platform '${platform}'. Supported: ${VALID_PLATFORMS.join(', ')}`,
      };
      res.status(400).json(response);
      return;
    }

    const { isEnabled, config } = req.body;
    const result = await lmsIntegrationService.updateSetting(req.ctx!, platform, {
      isEnabled,
      config,
    });

    const response: ApiResponse = { success: true, data: result };
    res.status(200).json(response);
  }

  /**
   * POST /api/v1/lms/integrations/sync/:platform
   * Admin-only: trigger an on-demand course import from the specified platform.
   *
   * Returns immediately with skipped=0/imported=0 if the platform is disabled.
   */
  async syncPlatform(req: Request, res: Response): Promise<void> {
    const platform = req.params.platform as LmsPlatform;

    if (!VALID_PLATFORMS.includes(platform)) {
      const response: ApiResponse = {
        success: false,
        error: `Unknown platform '${platform}'. Supported: ${VALID_PLATFORMS.join(', ')}`,
      };
      res.status(400).json(response);
      return;
    }

    const result = await lmsIntegrationService.syncPlatform(req.ctx!, platform);
    const response: ApiResponse = { success: true, data: result };
    res.status(200).json(response);
  }
}

export const lmsIntegrationController = new LmsIntegrationController();
