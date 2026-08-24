import { Request, Response } from 'express';
import { RolePolicyService } from './rolePolicy.service';

export class RolePolicyController {
  private service: RolePolicyService;

  constructor() {
    this.service = new RolePolicyService();
  }

  /**
   * GET /api/v1/auth/my-policies
   * Get role-assigned policy for the authenticated user
   */
  getMyPolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const userAny = req.user as any;
      const ctxAny = req.ctx as any;
      const userId = userAny?.id || userAny?.userId || req.userId || ctxAny?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const roles = userAny?.roles || ctxAny?.roles || req.userRoles || [];
      const result = await this.service.getPolicyForUser(Number(userId), roles);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[RolePolicyController] getMyPolicy error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch role policy',
      });
    }
  };

  /**
   * POST /api/v1/auth/accept-policy
   * Record policy acceptance for the authenticated user
   */
  acceptPolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const userAny = req.user as any;
      const ctxAny = req.ctx as any;
      const userId = userAny?.id || userAny?.userId || req.userId || ctxAny?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const result = await this.service.acceptPolicyForUser(Number(userId));
      res.json(result);
    } catch (error: any) {
      console.error('[RolePolicyController] acceptPolicy error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to record policy acceptance',
      });
    }
  };
}
