import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import { WorkflowTemplateRepository } from '../repositories/WorkflowTemplateRepository';
import { WorkflowDefinitionService } from './WorkflowDefinitionService';
import type { TenantContext } from '../../../db/types';
import type { CreateWorkflowTemplateInput, UpdateWorkflowTemplateInput, CreateWorkflowInput } from '@apponexthrms/shared';

export class WorkflowTemplateService {
  private templateRepo: WorkflowTemplateRepository;
  private workflowDefService: WorkflowDefinitionService;

  constructor() {
    this.templateRepo = new WorkflowTemplateRepository();
    this.workflowDefService = new WorkflowDefinitionService();
  }

  async createTemplate(ctx: TenantContext, input: CreateWorkflowTemplateInput) {
    if (!input.template_data || Object.keys(input.template_data).length === 0) {
      throw new ValidationError('Template data is required');
    }

    const template = await this.templateRepo.create(ctx, {
      uuid: uuidv4(),
      template_name: input.template_name,
      template_description: input.template_description,
      category: input.category || 'operations',
      is_default: input.is_default || false,
      template_data: input.template_data,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    return template;
  }

  async updateTemplate(ctx: TenantContext, id: number, input: UpdateWorkflowTemplateInput) {
    const template = await this.templateRepo.getById(ctx, id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    const updated = await this.templateRepo.update(ctx, id, {
      ...input,
      updated_by: ctx.userId,
    } as any);

    return updated;
  }

  async deleteTemplate(ctx: TenantContext, id: number) {
    await this.templateRepo.delete(ctx, id);
  }

  async getTemplate(ctx: TenantContext, id: number) {
    return this.templateRepo.getById(ctx, id);
  }

  async listTemplates(ctx: TenantContext, page = 1, pageSize = 20) {
    return this.templateRepo.listTemplates(ctx, page, pageSize);
  }

  async listTemplatesByCategory(ctx: TenantContext, category: string, page = 1, pageSize = 20) {
    return this.templateRepo.listByCategory(ctx, category, page, pageSize);
  }

  async getDefaultTemplate(ctx: TenantContext, category: string) {
    return this.templateRepo.getDefaultTemplate(ctx, category);
  }

  async createWorkflowFromTemplate(
    ctx: TenantContext,
    templateId: number,
    workflowInput: CreateWorkflowInput
  ) {
    const template = await this.templateRepo.getById(ctx, templateId);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Create workflow using template data
    const templateData = template.template_data;

    // Merge template data with provided input
    const mergedInput: CreateWorkflowInput = {
      ...templateData,
      ...workflowInput,
    };

    return this.workflowDefService.createWorkflow(ctx, mergedInput);
  }

  async cloneTemplate(ctx: TenantContext, id: number, newName: string) {
    const template = await this.templateRepo.getById(ctx, id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    const cloned = await this.templateRepo.create(ctx, {
      uuid: uuidv4(),
      template_name: newName,
      template_description: template.template_description,
      category: template.category,
      is_default: false,
      template_data: template.template_data,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    return cloned;
  }
}
