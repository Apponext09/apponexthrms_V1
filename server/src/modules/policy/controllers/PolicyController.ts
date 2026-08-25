import type { Request, Response, NextFunction } from 'express';
import { PolicyService } from '../services/PolicyService';
import { UnauthorizedError } from '../../../common/errors';

export class PolicyController {
  private policyService: PolicyService;

  constructor() {
    this.policyService = new PolicyService();
  }

  /**
   * GET /policies
   * List all policies in organization (Admin/HR view)
   */
  listPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const policies = await this.policyService.listPolicies(req.ctx);
      res.json({
        success: true,
        data: policies,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/categories
   */
  listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const categories = await this.policyService.listCategories(req.ctx);
      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /policies/categories
   */
  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const { name, description } = req.body;
      const category = await this.policyService.createCategory(req.ctx, name, description);
      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /policies/categories/:id
   */
  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      await this.policyService.deleteCategory(req.ctx, id);
      res.json({
        success: true,
        message: 'Policy category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/:id
   */
  getPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      const policy = await this.policyService.getPolicyById(req.ctx, id);
      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /policies
   */
  createPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const policy = await this.policyService.createPolicy(req.ctx, req.body);
      res.status(201).json({
        success: true,
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /policies/:id
   */
  updatePolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      const policy = await this.policyService.updatePolicy(req.ctx, id, req.body);
      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /policies/:id
   */
  deletePolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      await this.policyService.deletePolicy(req.ctx, id);
      res.json({
        success: true,
        message: 'Policy document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/my-policies
   * Returns all policies applicable to the logged-in user
   */
  getMyPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const jwtRoles = req.user?.roles;
      const policies = await this.policyService.getMyPolicies(req.ctx, jwtRoles);
      res.json({
        success: true,
        data: policies,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/pending
   * Returns unaccepted mandatory policies for the logged-in user
   */
  getPendingPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const jwtRoles = req.user?.roles;
      const pendingPolicies = await this.policyService.getPendingPolicies(req.ctx, jwtRoles);
      res.json({
        success: true,
        data: pendingPolicies,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /policies/:id/accept
   * Records user acceptance
   */
  acceptPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const acceptance = await this.policyService.acceptPolicy(
        req.ctx,
        id,
        typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : undefined,
        userAgent
      );

      res.json({
        success: true,
        message: 'Policy accepted successfully',
        data: acceptance,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /policies/:id/audit
   * Compliance audit view for HR
   */
  getPolicyAudit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context not resolved');
      const id = parseInt(req.params.id, 10);
      const audit = await this.policyService.getPolicyAudit(req.ctx, id);
      res.json({
        success: true,
        data: audit,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const policyController = new PolicyController();
