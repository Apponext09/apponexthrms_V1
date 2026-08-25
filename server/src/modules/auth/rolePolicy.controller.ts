import { Request, Response } from 'express';
import { RolePolicyService } from './rolePolicy.service';

export class RolePolicyController {
  private service: RolePolicyService;

  constructor() {
    this.service = new RolePolicyService();
  }

  /**
   * GET /api/v1/auth/my-policies
   * Get primary role policy for mandatory login acceptance modal
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

      let roles: string[] = userAny?.roles || ctxAny?.roles || req.userRoles || [];
      if (typeof roles === 'string') roles = [roles];
      if (userAny?.role) roles.push(userAny.role);
      if (userAny?.access_level) roles.push(userAny.access_level);
      if (userAny?.designation) roles.push(userAny.designation);

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
   * GET /api/v1/auth/role-policies
   * Get all visible policies for the logged-in user based on their assigned role & organization
   */
  getAllPolicies = async (req: Request, res: Response): Promise<void> => {
    try {
      const userAny = req.user as any;
      const ctxAny = req.ctx as any;
      const userId = userAny?.id || userAny?.userId || req.userId || ctxAny?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      let roles: string[] = userAny?.roles || ctxAny?.roles || req.userRoles || [];
      if (typeof roles === 'string') roles = [roles];
      if (userAny?.role) roles.push(userAny.role);
      if (userAny?.access_level) roles.push(userAny.access_level);
      if (userAny?.designation) roles.push(userAny.designation);

      const orgId = userAny?.organizationId || ctxAny?.organizationId || req.organizationId;
      const list = await this.service.getAllPoliciesForUser(Number(userId), roles, orgId ? Number(orgId) : undefined);

      res.json({
        success: true,
        data: list,
      });
    } catch (error: any) {
      console.error('[RolePolicyController] getAllPolicies error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch role policies',
      });
    }
  };

  /**
   * GET /api/v1/auth/role-policies/:id
   * Get specific policy by ID with strict role-policy authorization check
   */
  getPolicyById = async (req: Request, res: Response): Promise<void> => {
    try {
      const userAny = req.user as any;
      const ctxAny = req.ctx as any;
      const userId = userAny?.id || userAny?.userId || req.userId || ctxAny?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      let roles: string[] = userAny?.roles || ctxAny?.roles || req.userRoles || [];
      if (typeof roles === 'string') roles = [roles];
      if (userAny?.role) roles.push(userAny.role);
      if (userAny?.access_level) roles.push(userAny.access_level);
      if (userAny?.designation) roles.push(userAny.designation);

      const orgId = userAny?.organizationId || ctxAny?.organizationId || req.organizationId;
      const policyId = Number(req.params.id);

      const policy = await this.service.getPolicyByIdForUser(policyId, Number(userId), roles, orgId ? Number(orgId) : undefined);
      if (!policy) {
        res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this policy or it does not exist.' });
        return;
      }

      res.json({
        success: true,
        data: policy,
      });
    } catch (error: any) {
      console.error('[RolePolicyController] getPolicyById error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch policy detail',
      });
    }
  };

  /**
   * POST /api/v1/auth/role-policies
   * Create a new role policy (Admin & Super Admin only)
   */
  createPolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const userAny = req.user as any;
      const ctxAny = req.ctx as any;
      const userId = userAny?.id || userAny?.userId || req.userId || ctxAny?.userId;
      let roles: string[] = userAny?.roles || ctxAny?.roles || req.userRoles || [];
      if (typeof roles === 'string') roles = [roles];
      if (userAny?.role) roles.push(userAny.role);

      const primaryRole = this.service.resolveRoleCode(roles, userAny);
      const isSuperAdmin = roles.some((r) => ['super_admin', 'superadmin', 'owner'].includes(String(r).toLowerCase())) || primaryRole === 'super_admin';
      const isOrgAdmin = primaryRole === 'organization_admin';

      if (!isSuperAdmin && !isOrgAdmin) {
        res.status(403).json({ success: false, message: 'Forbidden: Policy creation requires administrative privileges.' });
        return;
      }

      const orgId = userAny?.organizationId || ctxAny?.organizationId || req.organizationId;
      const result = await this.service.createPolicy(req.body, Number(userId), orgId ? Number(orgId) : undefined);
      res.json(result);
    } catch (error: any) {
      console.error('[RolePolicyController] createPolicy error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create policy',
      });
    }
  };

  /**
   * PUT /api/v1/auth/role-policies/:id
   * Update existing role policy (Admin & Super Admin only)
   */
  updatePolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const userAny = req.user as any;
      const ctxAny = req.ctx as any;
      let roles: string[] = userAny?.roles || ctxAny?.roles || req.userRoles || [];
      if (typeof roles === 'string') roles = [roles];
      if (userAny?.role) roles.push(userAny.role);

      const primaryRole = this.service.resolveRoleCode(roles, userAny);
      const isSuperAdmin = roles.some((r) => ['super_admin', 'superadmin', 'owner'].includes(String(r).toLowerCase())) || primaryRole === 'super_admin';
      const isOrgAdmin = primaryRole === 'organization_admin';

      if (!isSuperAdmin && !isOrgAdmin) {
        res.status(403).json({ success: false, message: 'Forbidden: Policy management requires administrative privileges.' });
        return;
      }

      const id = Number(req.params.id);
      const orgId = userAny?.organizationId || ctxAny?.organizationId || req.organizationId;
      const result = await this.service.updatePolicy(id, req.body, orgId ? Number(orgId) : undefined);
      res.json(result);
    } catch (error: any) {
      console.error('[RolePolicyController] updatePolicy error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update policy',
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
