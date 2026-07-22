import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { superAdminService } from '../superadmin.service';

export class SuperAdminSubscriptionController {
  /**
   * Get subscription plans
   */
  getSubscriptions = asyncHandler(async (req: Request, res: Response) => {
    const data = await superAdminService.getSubscriptions();
    res.json({
      success: true,
      data,
    });
  });

  /**
   * Create a new subscription plan
   */
  createPlan = asyncHandler(async (req: Request, res: Response) => {
    const plan = await superAdminService.createSubscriptionPlan(req.body);
    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: plan,
    });
  });

  /**
   * Update an existing subscription plan
   */
  updatePlan = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const plan = await superAdminService.updateSubscriptionPlan(id, req.body);
    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: plan,
    });
  });
}

export const superAdminSubscriptionController = new SuperAdminSubscriptionController();
