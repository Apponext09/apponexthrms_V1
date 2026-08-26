import type { Request, Response } from 'express';
import { IdCardTemplateService } from '../services/IdCardTemplateService';
import { ValidationError, ForbiddenError } from '../../../common/errors';

export class IdCardTemplateController {
  private service: IdCardTemplateService;

  constructor() {
    this.service = new IdCardTemplateService();
  }

  private getContext(req: Request) {
    if (!req.ctx) {
      throw new ForbiddenError('Tenant context not resolved');
    }
    return req.ctx;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    const ctx = this.getContext(req);
    const templates = await this.service.listTemplates(ctx);
    res.status(200).json({
      success: true,
      data: templates,
      meta: {
        total: templates.length,
      },
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const ctx = this.getContext(req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid template ID');
    }

    const template = await this.service.getTemplateById(ctx, id);
    res.status(200).json({
      success: true,
      data: template,
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ctx = this.getContext(req);
    const { name, description, isDefault, appliesTo, configJson, status } = req.body;

    if (!name || typeof name !== 'string') {
      throw new ValidationError('Template name is required');
    }
    if (!configJson || typeof configJson !== 'object') {
      throw new ValidationError('Valid ID card configuration object is required');
    }

    const created = await this.service.createTemplate(ctx, {
      name,
      description,
      isDefault,
      appliesTo,
      configJson,
      status,
    });

    res.status(201).json({
      success: true,
      data: created,
      message: 'ID card template created successfully',
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const ctx = this.getContext(req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid template ID');
    }

    const { name, description, isDefault, appliesTo, configJson, status } = req.body;

    const updated = await this.service.updateTemplate(ctx, id, {
      name,
      description,
      isDefault,
      appliesTo,
      configJson,
      status,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'ID card template updated successfully',
    });
  };

  publish = async (req: Request, res: Response): Promise<void> => {
    const ctx = this.getContext(req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid template ID');
    }

    const { changelog, configJson, isDefault } = req.body;
    const published = await this.service.publishTemplate(ctx, id, changelog, configJson, isDefault);

    res.status(200).json({
      success: true,
      data: published,
      message: `Template '${published.name}' published successfully as version ${published.version}`,
    });
  };

  duplicate = async (req: Request, res: Response): Promise<void> => {
    const ctx = this.getContext(req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid template ID');
    }

    const duplicated = await this.service.duplicateTemplate(ctx, id);
    res.status(201).json({
      success: true,
      data: duplicated,
      message: 'ID card template duplicated successfully',
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const ctx = this.getContext(req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid template ID');
    }

    const result = await this.service.deleteTemplate(ctx, id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  };

  getVersions = async (req: Request, res: Response): Promise<void> => {
    const ctx = this.getContext(req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid template ID');
    }

    const versions = await this.service.getVersionHistory(ctx, id);
    res.status(200).json({
      success: true,
      data: versions,
    });
  };

  rollback = async (req: Request, res: Response): Promise<void> => {
    const ctx = this.getContext(req);
    const templateId = parseInt(req.params.id, 10);
    const versionId = parseInt(req.params.versionId, 10);
    if (isNaN(templateId) || isNaN(versionId)) {
      throw new ValidationError('Invalid template or version ID');
    }

    const rolledBack = await this.service.rollbackVersion(ctx, templateId, versionId);
    res.status(200).json({
      success: true,
      data: rolledBack,
      message: `Template rolled back successfully to version #${versionId}`,
    });
  };

  resolveActive = async (req: Request, res: Response): Promise<void> => {
    const ctx = this.getContext(req);
    const employeeId = req.query.employeeId ? parseInt(String(req.query.employeeId), 10) : undefined;

    const activeTemplate = await this.service.resolveActiveTemplate(ctx, employeeId);
    res.status(200).json({
      success: true,
      data: activeTemplate,
    });
  };

  uploadAsset = async (req: Request, res: Response): Promise<void> => {
    const { imageBase64, filename } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new ValidationError('Base64 image payload is required');
    }

    // Size limit check (approx 2.5MB base64 length = ~1.8MB binary)
    if (imageBase64.length > 3.5 * 1024 * 1024) {
      throw new ValidationError('Image file size exceeds maximum limit of 2MB');
    }

    // Basic format verification
    if (!imageBase64.startsWith('data:image/')) {
      throw new ValidationError('Invalid image payload format');
    }

    res.status(200).json({
      success: true,
      data: {
        url: imageBase64,
        filename: filename || 'asset.png',
      },
      message: 'Asset uploaded successfully',
    });
  };
}
