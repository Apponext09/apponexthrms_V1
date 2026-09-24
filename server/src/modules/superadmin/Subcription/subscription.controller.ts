import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { superAdminService } from '../superadmin.service';

export class SuperAdminSubscriptionController {
  /** GET /superadmin/subscriptions */
  getSubscriptions = asyncHandler(async (req: Request, res: Response) => {
    const data = await superAdminService.getSubscriptions();
    res.json({ success: true, data });
  });

  /** POST /superadmin/subscriptions */
  createPlan = asyncHandler(async (req: Request, res: Response) => {
    const plan = await superAdminService.createSubscriptionPlan(req.body);
    res.status(201).json({ success: true, message: 'Subscription plan created successfully', data: plan });
  });

  /** PUT /superadmin/subscriptions/:id */
  updatePlan = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const plan = await superAdminService.updateSubscriptionPlan(id, req.body);
    res.json({ success: true, message: 'Subscription plan updated successfully', data: plan });
  });

  /**
   * POST /superadmin/subscriptions/assign-to-org/:orgId
   * Body: { planId: number | null }
   * Assigns a subscription plan to an organization and caches the enabled modules.
   * Pass planId = null to remove the plan assignment (restores full access).
   */
  assignPlanToOrg = asyncHandler(async (req: Request, res: Response) => {
    const orgId = parseInt(req.params.orgId, 10);
    const rawPlanId = req.body.planId;
    const planId =
      rawPlanId !== undefined && rawPlanId !== null
        ? parseInt(rawPlanId, 10)
        : null;
    const result = await superAdminService.assignPlanToOrg(orgId, planId);
    const msg = planId
      ? 'Subscription plan assigned to organization successfully'
      : 'Subscription plan removed - full access restored';
    res.json({ success: true, message: msg, data: result });
  });
}

export const superAdminSubscriptionController = new SuperAdminSubscriptionController();
