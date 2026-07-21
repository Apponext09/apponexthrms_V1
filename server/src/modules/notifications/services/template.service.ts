import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/common/lib/logger';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import { NotificationTemplateRepository, type NotificationTemplate } from '../repositories/notification-template.repository';
import { NotificationTemplateVersionRepository } from '../repositories/notification-template-version.repository';

export interface TemplateRenderResult {
  subject_line?: string;
  body_text: string;
  body_html?: string;
}

export class TemplateService {
  private templateRepo: NotificationTemplateRepository;
  private versionRepo: NotificationTemplateVersionRepository;

  constructor() {
    this.templateRepo = new NotificationTemplateRepository();
    this.versionRepo = new NotificationTemplateVersionRepository();
  }

  /**
   * Create template
   */
  async createTemplate(ctx: TenantContext, input: any): Promise<NotificationTemplate> {
    // Validate uniqueness of template_code
    const existing = await this.templateRepo.getByCode(ctx, input.template_code);
    if (existing) {
      throw new ValidationError(`Template code ${input.template_code} already exists`);
    }

    // Extract variables from body text
    const variables = this.extractVariables(input.body_text);

    const template = await this.templateRepo.create(ctx, {
      uuid: uuidv4(),
      template_code: input.template_code,
      template_name: input.template_name,
      template_description: input.template_description,
      category: input.category,
      channels: input.channels || ['email', 'inapp'],
      subject_line: input.subject_line,
      body_text: input.body_text,
      body_html: input.body_html,
      sms_text: input.sms_text,
      whatsapp_template_name: input.whatsapp_template_name,
      variables,
      version_number: 1,
      is_published: false,
      status: 'draft',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    logger.info(`Template created: ${template.uuid}`);
    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(ctx: TenantContext, id: number | string, input: any): Promise<NotificationTemplate> {
    const template = await this.templateRepo.getById(ctx, id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Extract variables from body text
    const variables = this.extractVariables(input.body_text || template.body_text);

    const updated = await this.templateRepo.update(ctx, id, {
      template_name: input.template_name || template.template_name,
      template_description: input.template_description || template.template_description,
      category: input.category || template.category,
      channels: input.channels || template.channels,
      subject_line: input.subject_line || template.subject_line,
      body_text: input.body_text || template.body_text,
      body_html: input.body_html || template.body_html,
      sms_text: input.sms_text || template.sms_text,
      whatsapp_template_name: input.whatsapp_template_name || template.whatsapp_template_name,
      variables,
      updated_by: ctx.userId,
    } as any);

    logger.info(`Template updated: ${template.uuid}`);
    return updated;
  }

  /**
   * Publish template (creates version and marks as published)
   */
  async publishTemplate(ctx: TenantContext, id: number | string): Promise<NotificationTemplate> {
    const template = await this.templateRepo.getById(ctx, id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Create version before publishing
    await this.versionRepo.create(ctx, {
      uuid: uuidv4(),
      template_id: template.id as number,
      version_number: template.version_number,
      body_text: template.body_text,
      body_html: template.body_html,
      sms_text: template.sms_text,
      variables: template.variables,
      published_by: ctx.userId,
      published_at: new Date(),
    } as any);

    const published = await this.templateRepo.update(ctx, id, {
      is_published: true,
      status: 'published',
      version_number: (template.version_number || 1) + 1,
      updated_by: ctx.userId,
    } as any);

    logger.info(`Template published: ${template.uuid}`);
    return published;
  }

  /**
   * Archive template
   */
  async archiveTemplate(ctx: TenantContext, id: number | string): Promise<NotificationTemplate> {
    const template = await this.templateRepo.getById(ctx, id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    const archived = await this.templateRepo.update(ctx, id, {
      status: 'archived',
      is_published: false,
      updated_by: ctx.userId,
    } as any);

    logger.info(`Template archived: ${template.uuid}`);
    return archived;
  }

  /**
   * Get template with version history
   */
  async getWithVersions(ctx: TenantContext, id: number | string): Promise<any> {
    const template = await this.templateRepo.getById(ctx, id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    const versions = await this.versionRepo.getByTemplateId(ctx, template.id as number);

    return {
      ...template,
      versions,
    };
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(ctx: TenantContext, id: number | string, variables: Record<string, any>): Promise<TemplateRenderResult> {
    const template = await this.templateRepo.getById(ctx, id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    return this.renderTemplate(template, variables);
  }

  /**
   * Render template by interpolating variables
   */
  async renderTemplate(template: NotificationTemplate, variables: Record<string, any>): Promise<TemplateRenderResult> {
    const subject_line = template.subject_line ? this.interpolate(template.subject_line, variables) : undefined;
    const body_text = this.interpolate(template.body_text, variables);
    const body_html = template.body_html ? this.interpolate(template.body_html, variables) : undefined;

    return {
      subject_line,
      body_text,
      body_html,
    };
  }

  /**
   * Extract variable names from template text
   */
  private extractVariables(text: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: Set<string> = new Set();

    let match;
    while ((match = regex.exec(text)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  /**
   * Interpolate variables in text
   */
  private interpolate(text: string, variables: Record<string, any>): string {
    let result = text;

    for (const [key, value] of Object.entries(variables)) {
      // Escape value for safety
      const escapedValue = this.escapeHtml(String(value || ''));
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, escapedValue);
    }

    return result;
  }

  /**
   * Escape HTML to prevent injection
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}


