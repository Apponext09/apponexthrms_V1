import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import type {
  IdCardTemplate,
  IdCardTemplateVersion,
  CreateTemplateInput,
  UpdateTemplateInput,
  IdCardConfig,
} from '../types/idCardTemplate.types';
import { NotFoundError, ValidationError } from '../../../common/errors';

export const DEFAULT_ID_CARD_CONFIG: any = {
  header: { visible: true, showLogo: true, logoUrl: null, logoSize: 42, orgName: 'Company', subtitle: 'Corporation' },
  photo: { visible: true, shape: 'square', size: 104, borderWidth: 2 },
  fields: [
    { id: 'f1', key: 'name', label: 'Employee Name', visible: true, side: 'front' },
    { id: 'f2', key: 'employeeCode', label: 'ID', visible: true, side: 'front' },
  ],
  qrCode: { enabled: true, content: 'vcard', position: 'back_bottom', side: 'back', size: 64 },
  back: { showDisclaimer: true, showReturnAddress: true },
};

export class IdCardTemplateService {
  /**
   * Helper to parse JSON safely (recursively handles double/triple stringified JSON)
   */
  private parseJson(val: any): any {
    if (!val) return null;
    let parsed = val;
    let attempts = 0;
    while (typeof parsed === 'string' && attempts < 10) {
      try {
        const next = JSON.parse(parsed);
        if (next === parsed) break;
        parsed = next;
      } catch (e) {
        break;
      }
      attempts++;
    }
    return parsed;
  }

  /**
   * Helper to safely map raw DB rows (which Knex converts to camelCase via postProcessResponse) to IdCardTemplate
   */
  private mapRowToTemplate(row: any): IdCardTemplate {
    if (!row) return null as any;
    const rawAppliesTo = row.appliesTo !== undefined ? row.appliesTo : row.applies_to;
    const rawConfig = row.configJson !== undefined ? row.configJson : row.config_json;
    const rawIsDefault = row.isDefault !== undefined ? row.isDefault : row.is_default;
    const rawOrgId = row.organizationId !== undefined ? row.organizationId : row.organization_id;

    return {
      id: row.id,
      organizationId: rawOrgId,
      name: row.name || 'Official Company ID Card',
      description: row.description || '',
      isDefault: !!rawIsDefault,
      status: row.status || 'published',
      version: row.version || 1,
      appliesTo: this.parseJson(rawAppliesTo),
      configJson: this.parseJson(rawConfig) || DEFAULT_ID_CARD_CONFIG,
      createdBy: row.createdBy !== undefined ? row.createdBy : row.created_by,
      updatedBy: row.updatedBy !== undefined ? row.updatedBy : row.updated_by,
      createdAt: row.createdAt !== undefined ? row.createdAt : row.created_at,
      updatedAt: row.updatedAt !== undefined ? row.updatedAt : row.updated_at,
    };
  }

  /**
   * Ensures at least one default template exists for the organization
   */
  async ensureDefaultTemplate(organizationId: number): Promise<IdCardTemplate> {
    const db = getKnex();

    const existing = await db('id_card_templates')
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .first();

    if (existing) {
      return this.mapRowToTemplate(existing);
    }

    // Create factory default template
    const [newId] = await db('id_card_templates').insert({
      organization_id: organizationId,
      name: 'Default ID Card Template',
      description: 'Official corporate security credentials and digital access badge',
      is_default: true,
      status: 'published',
      version: 1,
      applies_to: null,
      config_json: JSON.stringify(DEFAULT_ID_CARD_CONFIG),
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    // Create initial version snapshot
    await db('id_card_template_versions').insert({
      template_id: newId,
      organization_id: organizationId,
      version_number: 1,
      config_json: JSON.stringify(DEFAULT_ID_CARD_CONFIG),
      changelog: 'Initial factory default template creation',
      created_at: db.fn.now(),
    });

    const created = await db('id_card_templates').where('id', newId).first();
    return this.mapRowToTemplate(created);
  }

  /**
   * List all templates for an organization
   */
  async listTemplates(ctx: TenantContext): Promise<IdCardTemplate[]> {
    const db = getKnex();
    await this.ensureDefaultTemplate(ctx.organizationId);

    let rows = await db('id_card_templates')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('is_default', 'desc')
      .orderBy('updated_at', 'desc');

    if (!rows || rows.length === 0) {
      rows = await db('id_card_templates')
        .whereNull('deleted_at')
        .orderBy('is_default', 'desc')
        .orderBy('updated_at', 'desc');
    }

    return rows.map((r) => this.mapRowToTemplate(r));
  }

  /**
   * Get single template by ID
   */
  async getTemplateById(ctx: TenantContext, id: number): Promise<IdCardTemplate> {
    const db = getKnex();
    let row = await db('id_card_templates')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .first();

    if (!row) {
      row = await db('id_card_templates')
        .where('id', id)
        .whereNull('deleted_at')
        .first();
    }

    if (!row) {
      throw new NotFoundError(`ID card template #${id} not found.`);
    }

    return this.mapRowToTemplate(row);
  }

  /**
   * Validate config sanity
   */
  private validateConfig(config: IdCardConfig) {
    if (!config || !config.fields || !Array.isArray(config.fields)) {
      throw new ValidationError('Invalid ID card configuration payload.');
    }

    const visibleFields = config.fields.filter((f) => f.visible);
    if (visibleFields.length === 0) {
      throw new ValidationError('ID card template must have at least one visible field.');
    }

    // Verify Name or Employee Code is visible
    const hasNameOrCode = visibleFields.some((f) => f.key === 'name' || f.key === 'employeeCode');
    if (!hasNameOrCode) {
      throw new ValidationError('ID card template must include either Employee Name or Employee Code.');
    }
  }

  /**
   * Create a new ID card template
   */
  async createTemplate(ctx: TenantContext, data: CreateTemplateInput): Promise<IdCardTemplate> {
    const db = getKnex();
    this.validateConfig(data.configJson);

    if (data.isDefault) {
      // Unset previous default
      await db('id_card_templates')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .update({ is_default: false });
    }

    const normalizedConfig = typeof data.configJson === 'string' ? this.parseJson(data.configJson) : data.configJson;

    const [id] = await db('id_card_templates').insert({
      organization_id: ctx.organizationId,
      name: (data.name || 'Untitled Template').trim(),
      description: data.description || null,
      is_default: !!data.isDefault,
      status: data.status || 'draft',
      version: 1,
      applies_to: data.appliesTo ? JSON.stringify(data.appliesTo) : null,
      config_json: JSON.stringify(normalizedConfig),
      created_by: ctx.userId || null,
      updated_by: ctx.userId || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    if (data.status === 'published') {
      await db('id_card_template_versions').insert({
        template_id: id,
        organization_id: ctx.organizationId,
        version_number: 1,
        config_json: JSON.stringify(normalizedConfig),
        changelog: 'Initial version published upon creation',
        created_by: ctx.userId || null,
        created_at: db.fn.now(),
      });
    }

    return this.getTemplateById(ctx, id);
  }

  /**
   * Update template settings directly
   */
  async updateTemplate(ctx: TenantContext, id: number, data: UpdateTemplateInput): Promise<IdCardTemplate> {
    const db = getKnex();

    if (data.configJson) {
      this.validateConfig(data.configJson);
    }

    const existing = await db('id_card_templates').where('id', id).whereNull('deleted_at').first();
    const orgId = existing?.organizationId || existing?.organization_id || ctx.organizationId;

    if (orgId) {
      // Unmark previous defaults within the same organization
      await db('id_card_templates')
        .where('organization_id', orgId)
        .whereNull('deleted_at')
        .update({ is_default: false });
    }

    const updatePayload: any = {
      updated_by: ctx.userId || null,
      updated_at: db.fn.now(),
      status: 'published',
      is_default: true,
    };

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.appliesTo !== undefined) updatePayload.applies_to = data.appliesTo ? JSON.stringify(data.appliesTo) : null;
    if (data.configJson !== undefined) {
      const normalized = typeof data.configJson === 'string' ? this.parseJson(data.configJson) : data.configJson;
      updatePayload.config_json = JSON.stringify(normalized);
    }

    await db('id_card_templates')
      .where('id', id)
      .update(updatePayload);

    return this.getTemplateById(ctx, id);
  }

  /**
   * Publish template
   */
  async publishTemplate(
    ctx: TenantContext,
    id: number,
    changelog?: string,
    configJson?: IdCardConfig,
    isDefault?: boolean
  ): Promise<IdCardTemplate> {
    return this.updateTemplate(ctx, id, {
      configJson,
      isDefault: true,
      status: 'published',
    });
  }

  /**
   * Duplicate existing template
   */
  async duplicateTemplate(ctx: TenantContext, id: number): Promise<IdCardTemplate> {
    const db = getKnex();
    const original = await this.getTemplateById(ctx, id);

    const newName = `${original.name} (Copy)`;

    const [newId] = await db('id_card_templates').insert({
      organization_id: ctx.organizationId,
      name: newName,
      description: original.description,
      is_default: false,
      status: 'published',
      version: 1,
      applies_to: original.appliesTo ? JSON.stringify(original.appliesTo) : null,
      config_json: JSON.stringify(original.configJson),
      created_by: ctx.userId || null,
      updated_by: ctx.userId || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return this.getTemplateById(ctx, newId);
  }

  /**
   * Soft delete template
   */
  async deleteTemplate(ctx: TenantContext, id: number): Promise<{ success: boolean; message: string }> {
    const db = getKnex();

    await db('id_card_templates')
      .where('id', id)
      .update({
        deleted_at: db.fn.now(),
        updated_by: ctx.userId || null,
      });

    return { success: true, message: 'Template deleted successfully.' };
  }

  /**
   * Get version history for template
   */
  async getVersionHistory(ctx: TenantContext, templateId: number): Promise<IdCardTemplateVersion[]> {
    const db = getKnex();
    const rows = await db('id_card_template_versions')
      .where('template_id', templateId)
      .orderBy('id', 'desc')
      .limit(20);

    return rows.map((r) => ({
      id: r.id,
      templateId: r.templateId !== undefined ? r.templateId : r.template_id,
      organizationId: r.organizationId !== undefined ? r.organizationId : r.organization_id,
      versionNumber: r.versionNumber !== undefined ? r.versionNumber : r.version_number,
      configJson: this.parseJson(r.configJson !== undefined ? r.configJson : r.config_json),
      changelog: r.changelog,
      createdBy: r.createdBy !== undefined ? r.createdBy : r.created_by,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * Rollback template
   */
  async rollbackVersion(ctx: TenantContext, templateId: number, versionId: number): Promise<IdCardTemplate> {
    const db = getKnex();
    const versionRow = await db('id_card_template_versions')
      .where('id', versionId)
      .first();

    if (!versionRow) {
      throw new NotFoundError(`Version #${versionId} not found.`);
    }

    const rawConfig = versionRow.configJson !== undefined ? versionRow.configJson : versionRow.config_json;
    const rolledBackConfig = this.parseJson(rawConfig);

    return this.updateTemplate(ctx, templateId, {
      configJson: rolledBackConfig,
      isDefault: true,
      status: 'published',
    });
  }

  /**
   * Dynamically resolve active published template for employee
   */
  async resolveActiveTemplate(ctx: TenantContext, employeeId?: number): Promise<IdCardTemplate> {
    const db = getKnex();

    let targetOrgId = ctx.organizationId;
    if (employeeId) {
      const emp = await db('employees').where('id', employeeId).whereNull('deleted_at').first();
      if (emp?.organizationId || emp?.organization_id) {
        targetOrgId = emp.organizationId || emp.organization_id;
      }
    }

    // Step 1: Find template matching target organization
    let selectedRow = await db('id_card_templates')
      .where('organization_id', targetOrgId)
      .whereNull('deleted_at')
      .orderBy('is_default', 'desc')
      .orderBy('updated_at', 'desc')
      .first();

    // Step 2: Fallback across all templates if none found for specific orgId
    if (!selectedRow) {
      selectedRow = await db('id_card_templates')
        .whereNull('deleted_at')
        .orderBy('is_default', 'desc')
        .orderBy('updated_at', 'desc')
        .first();
    }

    if (!selectedRow) {
      return this.ensureDefaultTemplate(targetOrgId || ctx.organizationId || 1);
    }

    return this.mapRowToTemplate(selectedRow);
  }
}
