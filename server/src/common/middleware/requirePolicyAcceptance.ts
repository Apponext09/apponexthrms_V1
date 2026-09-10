import type { Request, Response, NextFunction } from 'express';
import { PolicyService } from '../../modules/policy/services/PolicyService';

const policyService = new PolicyService();

/**
 * Middleware that enforces policy acceptance on protected operational endpoints.
 * Users with pending mandatory policies are blocked with POLICY_ACCEPTANCE_REQUIRED (403).
 */
export async function requirePolicyAcceptance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Skip if no authenticated user or tenant context
    if (!req.user || !req.ctx) {
      next();
      return;
    }

    // 2. Exempt super_admin from policy gates
    const roles = req.user.roles || req.ctx.roles || [];
    if (roles.includes('super_admin')) {
      next();
      return;
    }

    // 3. Skip policy routes, auth routes, and notification routes to prevent deadlocks
    const path = req.originalUrl || req.baseUrl || req.path || '';
    if (
      path.includes('/api/v1/policies') ||
      path.includes('/api/v1/auth') ||
      path.includes('/api/v1/notifications') ||
      path.includes('/api/v1/health')
    ) {
      next();
      return;
    }

    // 4. Check for pending mandatory policies
    const pendingPolicies = await policyService.getPendingPolicies(req.ctx, roles);

    if (pendingPolicies && pendingPolicies.length > 0) {
      res.status(403).json({
        success: false,
        error: {
          code: 'POLICY_ACCEPTANCE_REQUIRED',
          message: 'Mandatory policy acceptance is required before accessing company resources.',
          details: {
            pendingCount: pendingPolicies.length,
            pendingPolicies: pendingPolicies.map((p) => ({
              id: p.id,
              title: p.title,
              version: p.version,
              category: p.category,
            })),
          },
        },
      });
      return;
    }

    next();
  } catch (error) {
    // In case of error during check, log and do not break core APIs unnecessarily
    console.warn('[requirePolicyAcceptance] Check warning:', error);
    next();
  }
}
