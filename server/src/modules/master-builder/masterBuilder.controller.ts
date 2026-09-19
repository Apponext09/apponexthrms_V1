import type { Request, Response } from 'express';
import { masterBuilderService } from './masterBuilder.service';
import type { ApiResponse } from '@apponexthrms/shared';

export class MasterBuilderController {
  private getOrgId(req: Request): number {
    const orgId =
      req.ctx?.organizationId ||
      (req as any).user?.organizationId ||
      (req as any).user?.oid ||
      (req as any).user?.orgId ||
      (req as any).organizationId ||
      8;
    return Number(orgId);
  }

  private getCompanyId(req: Request): number | undefined {
    const cid = req.ctx?.companyId || req.headers['x-company-id'] || (req as any).user?.companyId || (req as any).user?.cid;
    return cid ? Number(cid) : undefined;
  }

  private getUserId(req: Request): number {
    return Number(req.ctx?.userId || (req as any).user?.userId || (req as any).user?.id || (req as any).user?.sub || 1);
  }

  // ─── Masters ─────────────────────────────────────────────────────────────

  async listMasters(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const status = req.query.status as string;
    try {
      const masters = await masterBuilderService.listMasters(orgId, status);
      const response: ApiResponse<any> = {
        success: true,
        data: masters,
      };
      return res.json(response);
    } catch (err: any) {
      console.error('[MasterBuilder] listMasters FAILED:', err?.message);
      console.error(err?.stack);
      throw err;
    }
  }

  async getMaster(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const param = req.params.id;
    const masterId = Number(param);
    const master = isNaN(masterId)
      ? await masterBuilderService.getMasterByCode(orgId, param)
      : await masterBuilderService.getMasterById(orgId, masterId);
    if (!master) {
      return res.status(404).json({ success: false, error: 'Master not found' });
    }
    return res.json({ success: true, data: master });
  }

  async createMaster(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const companyId = this.getCompanyId(req);
    const userId = this.getUserId(req);
    try {
      const created = await masterBuilderService.createMaster(orgId, companyId, userId, req.body);
      return res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      console.error('[MasterBuilder] createMaster FAILED:', err?.message);
      return res.status(400).json({ success: false, message: err?.message || 'Failed to create master' });
    }
  }

  async updateMaster(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const userId = this.getUserId(req);
    try {
      const updated = await masterBuilderService.updateMaster(orgId, masterId, userId, req.body);
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[MasterBuilder] updateMaster FAILED:', err?.message);
      return res.status(400).json({ success: false, message: err?.message || 'Failed to update master' });
    }
  }

  async deleteMaster(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    try {
      await masterBuilderService.deleteMaster(orgId, masterId);
      return res.json({ success: true, message: 'Master deleted successfully' });
    } catch (err: any) {
      console.error('[MasterBuilder] deleteMaster FAILED:', err?.message);
      return res.status(400).json({ success: false, message: err?.message || 'Failed to delete master' });
    }
  }

  // ─── Fields ─────────────────────────────────────────────────────────────

  async addField(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    try {
      const field = await masterBuilderService.addField(orgId, masterId, req.body);
      return res.status(201).json({ success: true, data: field });
    } catch (err: any) {
      console.error('[MasterBuilder] addField FAILED:', err?.message);
      return res.status(400).json({ success: false, message: err?.message || 'Failed to add field' });
    }
  }

  async updateField(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const fieldId = Number(req.params.fieldId);
    try {
      const updated = await masterBuilderService.updateField(orgId, masterId, fieldId, req.body);
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      console.error('[MasterBuilder] updateField FAILED:', err?.message);
      return res.status(400).json({ success: false, message: err?.message || 'Failed to update field' });
    }
  }

  async deleteField(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const fieldId = Number(req.params.fieldId);
    try {
      await masterBuilderService.deleteField(orgId, masterId, fieldId);
      return res.json({ success: true, message: 'Field deleted successfully' });
    } catch (err: any) {
      console.error('[MasterBuilder] deleteField FAILED:', err?.message);
      return res.status(400).json({ success: false, message: err?.message || 'Failed to delete field' });
    }
  }

  // ─── Validation Rules ───────────────────────────────────────────────────

  async addValidationRule(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const rule = await masterBuilderService.addValidationRule(orgId, masterId, req.body);
    return res.status(201).json({ success: true, data: rule });
  }

  async updateValidationRule(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const ruleId = Number(req.params.ruleId);
    const updated = await masterBuilderService.updateValidationRule(orgId, masterId, ruleId, req.body);
    return res.json({ success: true, data: updated });
  }

  async deleteValidationRule(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const ruleId = Number(req.params.ruleId);
    await masterBuilderService.deleteValidationRule(orgId, masterId, ruleId);
    return res.json({ success: true, message: 'Validation rule deleted' });
  }

  // ─── Autofill Mappings ──────────────────────────────────────────────────

  async addAutofillMapping(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const mapping = await masterBuilderService.addAutofillMapping(orgId, masterId, req.body);
    return res.status(201).json({ success: true, data: mapping });
  }

  async deleteAutofillMapping(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const mappingId = Number(req.params.mappingId);
    await masterBuilderService.deleteAutofillMapping(orgId, masterId, mappingId);
    return res.json({ success: true, message: 'Mapping deleted' });
  }

  // ─── Choice Lists ───────────────────────────────────────────────────────

  async listChoiceLists(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const lists = await masterBuilderService.listChoiceLists(orgId);
    return res.json({ success: true, data: lists });
  }

  async createChoiceList(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const list = await masterBuilderService.createChoiceList(orgId, req.body);
    return res.status(201).json({ success: true, data: list });
  }

  async updateChoiceList(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const id = Number(req.params.id);
    const updated = await masterBuilderService.updateChoiceList(orgId, id, req.body);
    return res.json({ success: true, data: updated });
  }

  async deleteChoiceList(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const id = Number(req.params.id);
    await masterBuilderService.deleteChoiceList(orgId, id);
    return res.json({ success: true, message: 'Choice list deleted' });
  }

  // ─── Records ─────────────────────────────────────────────────────────────

  async listRecords(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const companyId = this.getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'A company context is required to access master records.' });
    const masterId = Number(req.params.id);
    const search = req.query.search as string;
    const status = req.query.status as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;

    const data = await masterBuilderService.listRecords(orgId, companyId, masterId, {
      search,
      status,
      page,
      limit,
    });
    return res.json({ success: true, ...data });
  }

  async createRecord(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const companyId = this.getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'A company context is required to create master records.' });
    const masterId = Number(req.params.id);
    const userId = this.getUserId(req);
    try {
      const record = await masterBuilderService.createRecord(orgId, companyId, masterId, userId, req.body);
      return res.status(201).json({ success: true, data: record });
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message || 'Validation error' });
    }
  }

  async updateRecord(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const companyId = this.getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'A company context is required to update master records.' });
    const masterId = Number(req.params.id);
    const recordId = Number(req.params.recordId);
    const userId = this.getUserId(req);
    try {
      const record = await masterBuilderService.updateRecord(orgId, companyId, masterId, recordId, userId, req.body);
      return res.json({ success: true, data: record });
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message || 'Validation error' });
    }
  }

  async deleteRecord(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const companyId = this.getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'A company context is required to delete master records.' });
    const masterId = Number(req.params.id);
    const recordId = Number(req.params.recordId);
    await masterBuilderService.deleteRecord(orgId, companyId, masterId, recordId);
    return res.json({ success: true, message: 'Record deleted successfully' });
  }

  // ─── DB Lookup Options ─────────────────────────────────────────────────────
  // Returns a label/value list for real DB entities (companies, departments, etc.)
  async getDbLookupOptions(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const companyId = this.getCompanyId(req);
    const entity = req.params.entity as string;
    try {
      const options = await masterBuilderService.getDbLookupOptions(orgId, companyId, entity);
      return res.json({ success: true, data: options });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Failed to fetch lookup options' });
    }
  }

  // ─── Employee Profile Linkage Handlers ─────────────────────────────────────
  async getEmployeeLinkages(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    try {
      const masters = await masterBuilderService.getEmployeeLinkedMasters(orgId);
      return res.json({ success: true, data: masters });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to fetch employee linked masters' });
    }
  }

  async getEmployeeValues(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const employeeId = Number(req.params.employeeId);
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }
    try {
      const values = await masterBuilderService.getEmployeeMasterValues(orgId, employeeId);
      return res.json({ success: true, data: values });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to fetch employee master values' });
    }
  }

  async saveEmployeeValues(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const employeeId = Number(req.params.employeeId);
    const assignments = req.body?.assignments || req.body?.values || req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }
    if (!Array.isArray(assignments)) {
      return res.status(400).json({ success: false, message: 'Assignments must be an array' });
    }
    try {
      const updated = await masterBuilderService.saveEmployeeMasterValues(orgId, employeeId, assignments);
      return res.json({ success: true, data: updated, message: 'Custom master values saved successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to save employee master values' });
    }
  }
}

export const masterBuilderController = new MasterBuilderController();


