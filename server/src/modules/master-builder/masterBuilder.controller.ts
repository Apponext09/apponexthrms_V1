import type { Request, Response } from 'express';
import { masterBuilderService } from './masterBuilder.service';
import type { ApiResponse } from '@apponexthrms/shared';

export class MasterBuilderController {
  private getOrgId(req: Request): number {
    // resolveTenant middleware populates req.ctx from verified JWT claims (oid) — this is the
    // authoritative tenant. Never fall back to a hard-coded org id: that silently cross-tenants data.
    const orgId = (req as any).ctx?.organizationId;
    if (!orgId || Number.isNaN(Number(orgId))) {
      throw new Error('Unable to resolve organization context');
    }
    return Number(orgId);
  }

  private getCompanyId(req: Request): number | undefined {
    const cid = (req as any).ctx?.companyId ?? req.headers['x-company-id'];
    return cid ? Number(cid) : undefined;
  }

  private getUserId(req: Request): number {
    const uid = (req as any).ctx?.userId;
    return uid ? Number(uid) : 0;
  }

  // ─── Masters ─────────────────────────────────────────────────────────────

  async listMasters(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const status = req.query.status as string;
    const masters = await masterBuilderService.listMasters(orgId, status);
    const response: ApiResponse<any> = {
      success: true,
      data: masters,
    };
    return res.json(response);
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
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message || 'Validation error' });
    }
  }

  async updateMaster(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const userId = this.getUserId(req);
    try {
      const updated = await masterBuilderService.updateMaster(orgId, masterId, userId, req.body);
      return res.json({ success: true, data: updated });
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message || 'Validation error' });
    }
  }

  async deleteMaster(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    await masterBuilderService.deleteMaster(orgId, masterId);
    return res.json({ success: true, message: 'Master deleted successfully' });
  }

  // ─── Fields ─────────────────────────────────────────────────────────────

  async addField(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const field = await masterBuilderService.addField(orgId, masterId, req.body);
    return res.status(201).json({ success: true, data: field });
  }

  async updateField(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const fieldId = Number(req.params.fieldId);
    const updated = await masterBuilderService.updateField(orgId, masterId, fieldId, req.body);
    return res.json({ success: true, data: updated });
  }

  async deleteField(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const fieldId = Number(req.params.fieldId);
    await masterBuilderService.deleteField(orgId, masterId, fieldId);
    return res.json({ success: true, message: 'Field deleted successfully' });
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
    const masterId = Number(req.params.id);
    const search = req.query.search as string;
    const status = req.query.status as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;

    const data = await masterBuilderService.listRecords(orgId, masterId, {
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
    const masterId = Number(req.params.id);
    const recordId = Number(req.params.recordId);
    const userId = this.getUserId(req);
    try {
      const record = await masterBuilderService.updateRecord(orgId, masterId, recordId, userId, req.body);
      return res.json({ success: true, data: record });
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message || 'Validation error' });
    }
  }

  async deleteRecord(req: Request, res: Response) {
    const orgId = this.getOrgId(req);
    const masterId = Number(req.params.id);
    const recordId = Number(req.params.recordId);
    await masterBuilderService.deleteRecord(orgId, masterId, recordId);
    return res.json({ success: true, message: 'Record deleted successfully' });
  }
}

export const masterBuilderController = new MasterBuilderController();
