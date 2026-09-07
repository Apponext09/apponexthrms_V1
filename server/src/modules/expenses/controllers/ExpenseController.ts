import type { Request, Response } from 'express';
import { ExpenseService } from '../services/ExpenseService';

export class ExpenseController {
  private expenseService: ExpenseService;

  constructor(expenseService?: ExpenseService) {
    this.expenseService = expenseService || new ExpenseService();
  }

  // --- CATEGORIES ---
  async getCategories(req: Request, res: Response) {
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await this.expenseService.getCategories(req.ctx!, includeInactive);
    res.json({ success: true, data: categories });
  }

  async createCategory(req: Request, res: Response) {
    const category = await this.expenseService.createCategory(req.ctx!, req.body);
    res.status(201).json({ success: true, data: category });
  }

  async updateCategory(req: Request, res: Response) {
    const category = await this.expenseService.updateCategory(req.ctx!, Number(req.params.id), req.body);
    res.json({ success: true, data: category });
  }

  async deleteCategory(req: Request, res: Response) {
    const result = await this.expenseService.deleteCategory(req.ctx!, Number(req.params.id));
    res.json(result);
  }

  // --- POLICIES ---
  async getPolicies(req: Request, res: Response) {
    const policies = await this.expenseService.getPolicies(req.ctx!);
    res.json({ success: true, data: policies });
  }

  async createPolicy(req: Request, res: Response) {
    const policy = await this.expenseService.createPolicy(req.ctx!, req.body);
    res.status(201).json({ success: true, data: policy });
  }

  async updatePolicy(req: Request, res: Response) {
    const policy = await this.expenseService.updatePolicy(req.ctx!, Number(req.params.id), req.body);
    res.json({ success: true, data: policy });
  }

  async deletePolicy(req: Request, res: Response) {
    const result = await this.expenseService.deletePolicy(req.ctx!, Number(req.params.id));
    res.json(result);
  }

  async validatePolicy(req: Request, res: Response) {
    const { categoryId, amount, receiptProvided } = req.body;
    const validation = await this.expenseService.validatePolicyForClaim(req.ctx!, Number(categoryId), Number(amount), Boolean(receiptProvided));
    res.json({ success: true, data: validation });
  }

  // --- CLAIMS ---
  async getClaims(req: Request, res: Response) {
    const { employeeId, status, departmentId, designationId, locationId, categoryId, search, mode } = req.query;
    console.log('[DEBUG getClaims] req.query:', req.query, 'ctx:', { userId: req.ctx?.userId, orgId: req.ctx?.organizationId, role: req.ctx?.role, roles: req.ctx?.roles });
    const claims = await this.expenseService.getClaims(req.ctx!, {
      employeeId: employeeId ? Number(employeeId) : undefined,
      status: status as string,
      departmentId: departmentId ? Number(departmentId) : undefined,
      designationId: designationId ? Number(designationId) : undefined,
      locationId: locationId ? Number(locationId) : undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      search: search as string,
      mode: mode as string
    });
    console.log('[DEBUG getClaims] claims returned count:', claims?.length, 'items:', claims);
    res.json({ success: true, data: claims });
  }

  private parseClaimId(val: any): number | string {
    if (typeof val === 'string' && val.startsWith('tr_')) return val;
    const num = Number(val);
    return isNaN(num) ? String(val) : num;
  }

  async getClaimById(req: Request, res: Response) {
    const claim = await this.expenseService.getClaimById(req.ctx!, this.parseClaimId(req.params.id));
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Expense claim not found' });
    }
    res.json({ success: true, data: claim });
  }

  async submitClaim(req: Request, res: Response) {
    try {
      const claim = await this.expenseService.createClaim(req.ctx!, req.body);
      res.status(201).json({ success: true, data: claim });
    } catch (err: any) {
      console.error('[ExpenseController] submitClaim error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to submit expense claim' });
    }
  }

  async updateClaim(req: Request, res: Response) {
    try {
      const claim = await this.expenseService.updateClaim(req.ctx!, this.parseClaimId(req.params.id) as any, req.body);
      res.json({ success: true, data: claim });
    } catch (err: any) {
      console.error('[ExpenseController] updateClaim error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to update expense claim' });
    }
  }

  // --- APPROVAL ACTIONS ---
  async approveClaimByManager(req: Request, res: Response) {
    try {
      const claimId = this.parseClaimId(req.params.id);
      const claim = await this.expenseService.approveClaimByManager(req.ctx!, claimId, req.body?.comments || req.body?.notes);
      res.json({ success: true, data: claim });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to approve claim' });
    }
  }

  async bulkApproveClaims(req: Request, res: Response) {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => this.parseClaimId(x)) : [];
      if (ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Select at least one claim to approve' });
      }
      const result = await this.expenseService.bulkApproveClaims(
        req.ctx!,
        ids,
        req.body?.comments || 'Bulk approved'
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Bulk approval failed' });
    }
  }

  async verifyAndApproveByFinance(req: Request, res: Response) {
    try {
      const claimId = this.parseClaimId(req.params.id);
      const claim = await this.expenseService.verifyAndApproveByFinance(req.ctx!, claimId as any, req.body || {});
      res.json({ success: true, data: claim });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to verify claim' });
    }
  }

  async rejectClaim(req: Request, res: Response) {
    try {
      const claimId = this.parseClaimId(req.params.id);
      const claim = await this.expenseService.rejectClaim(req.ctx!, claimId, req.body?.reason || req.body?.remarks || 'Rejected');
      res.json({ success: true, data: claim });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to reject claim' });
    }
  }

  async returnClaimForCorrection(req: Request, res: Response) {
    try {
      const claimId = this.parseClaimId(req.params.id);
      const claim = await this.expenseService.returnClaimForCorrection(req.ctx!, claimId, req.body?.comments || req.body?.notes || 'Returned');
      res.json({ success: true, data: claim });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to return claim' });
    }
  }

  async processReimbursement(req: Request, res: Response) {
    try {
      const claimId = this.parseClaimId(req.params.id);
      const claim = await this.expenseService.processReimbursement(req.ctx!, claimId as any, req.body || {});
      res.json({ success: true, data: claim });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to process reimbursement' });
    }
  }

  // --- TRAVEL REQUESTS & ADVANCES ---
  async getTravelRequests(req: Request, res: Response) {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const filters = {
      status: req.query.status as string | undefined,
      departmentId: req.query.departmentId ? Number(req.query.departmentId) : undefined,
      search: req.query.search as string | undefined
    };
    const requests = await this.expenseService.getTravelRequests(req.ctx!, employeeId, filters);
    res.json({ success: true, data: requests });
  }

  async createTravelRequest(req: Request, res: Response) {
    try {
      const request = await this.expenseService.createTravelRequest(req.ctx!, req.body);
      res.status(201).json({ success: true, data: request });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to create travel request' });
    }
  }

  async updateTravelRequestStatus(req: Request, res: Response) {
    const request = await this.expenseService.updateTravelRequestStatus(req.ctx!, Number(req.params.id), req.body.status, req.body.notes);
    res.json({ success: true, data: request });
  }

  async getTravelAdvances(req: Request, res: Response) {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const filters = {
      status: req.query.status as string | undefined,
      departmentId: req.query.departmentId ? Number(req.query.departmentId) : undefined,
      search: req.query.search as string | undefined
    };
    const advances = await this.expenseService.getTravelAdvances(req.ctx!, employeeId, filters);
    res.json({ success: true, data: advances });
  }

  async approveTravelAdvance(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await this.expenseService.approveTravelAdvance(req.ctx!, id, {
        comments: req.body?.comments || req.body?.notes,
        approvedAmount: req.body?.approvedAmount !== undefined ? Number(req.body.approvedAmount) : undefined
      });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to approve travel advance' });
    }
  }

  async rejectTravelAdvance(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await this.expenseService.rejectTravelAdvance(req.ctx!, id, req.body?.reason || req.body?.remarks || 'Rejected by Finance');
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to reject travel advance' });
    }
  }

  async createTravelAdvance(req: Request, res: Response) {
    try {
      const advance = await this.expenseService.createTravelAdvance(req.ctx!, req.body);
      res.status(201).json({ success: true, data: advance });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to create travel advance' });
    }
  }

  // --- MILEAGE ---
  async getMileageClaims(req: Request, res: Response) {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const claims = await this.expenseService.getMileageClaims(req.ctx!, employeeId);
    res.json({ success: true, data: claims });
  }

  async createMileageClaim(req: Request, res: Response) {
    try {
      const claim = await this.expenseService.createMileageClaim(req.ctx!, req.body);
      res.status(201).json({ success: true, data: claim });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to create mileage claim' });
    }
  }

  async approveMileageClaim(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await this.expenseService.approveMileageClaim(req.ctx!, id, req.body?.comments || req.body?.notes);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to approve mileage claim' });
    }
  }

  async rejectMileageClaim(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await this.expenseService.rejectMileageClaim(req.ctx!, id, req.body?.reason || req.body?.remarks || 'Rejected');
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to reject mileage claim' });
    }
  }

  // --- DASHBOARD & REPORTS ---
  async getDashboardSummary(req: Request, res: Response) {
    const summary = await this.expenseService.getDashboardSummary(req.ctx!);
    res.json({ success: true, data: summary });
  }

  async getReports(req: Request, res: Response) {
    const reports = await this.expenseService.getReports(req.ctx!, req.query);
    res.json({ success: true, data: reports });
  }

  async getSettings(req: Request, res: Response) {
    const settings = await this.expenseService.getSettings(req.ctx!);
    res.json({ success: true, data: settings });
  }

  async updateSettings(req: Request, res: Response) {
    const settings = await this.expenseService.updateSettings(req.ctx!, req.body);
    res.json({ success: true, data: settings });
  }

  // --- WORKFLOWS ---
  async getWorkflows(req: Request, res: Response) {
    const workflows = await this.expenseService.getWorkflows(req.ctx!);
    res.json({ success: true, data: workflows });
  }

  async createWorkflow(req: Request, res: Response) {
    const workflow = await this.expenseService.createWorkflow(req.ctx!, req.body);
    res.status(201).json({ success: true, data: workflow });
  }

  async updateWorkflow(req: Request, res: Response) {
    const workflow = await this.expenseService.updateWorkflow(req.ctx!, Number(req.params.id), req.body);
    res.json({ success: true, data: workflow });
  }

  async deleteWorkflow(req: Request, res: Response) {
    const result = await this.expenseService.deleteWorkflow(req.ctx!, Number(req.params.id));
    res.json(result);
  }
}
