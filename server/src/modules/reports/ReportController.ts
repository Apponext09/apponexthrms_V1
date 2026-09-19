import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../db/knex';
import { FIELD_REGISTRY, type ModuleType } from './fieldRegistry';
import { runDynamicReport } from './ReportQueryEngine';

let tableChecked = false;

async function ensureReportTemplatesTable() {
  if (tableChecked) return;
  try {
    const db = getKnex();
    const hasTable = await db.schema.hasTable('report_templates');
    if (!hasTable) {
      await db.schema.createTable('report_templates', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('company_id').unsigned().nullable();
        table.bigInteger('created_by').unsigned().notNullable();
        table.string('name', 255).notNullable();
        table.text('description').nullable();
        table.string('module', 50).notNullable();
        table.text('selected_fields').notNullable();
        table.text('filters').notNullable();
        table.text('column_order').nullable();
        table.tinyint('is_shared').defaultTo(0);
        table.timestamps(true, true);
        table.timestamp('deleted_at').nullable();
      });
      console.log('✅ Created table: report_templates');
    }
    tableChecked = true;
  } catch (err: any) {
    console.warn('⚠️ Failed to verify or create report_templates table:', err.message);
  }
}

export const reportController = {
  /**
   * GET /api/v1/reports/fields
   * Returns all available fields grouped by module and group
   */
  getFields: async (req: Request, res: Response) => {
    try {
      const grouped: Record<string, any[]> = {};
      for (const field of FIELD_REGISTRY) {
        const key = field.module;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          key: field.key,
          label: field.label,
          group: field.group,
          type: field.type,
          module: field.module,
        });
      }
      res.json({ success: true, data: grouped });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/v1/reports/meta
   * Returns metadata options (departments, locations, leave types, employees) for tenant filters
   */
  getMetadata: async (req: Request, res: Response) => {
    try {
      const organizationId = req.ctx?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ success: false, error: 'Organization context required' });
      }

      const db = getKnex();

      const [companies, departments, locations, leaveTypes, employees] = await Promise.all([
        db('company')
          .where('organization_id', organizationId)
          .whereNull('deleted_at')
          .select('company_id as id', 'name', 'is_parent')
          .orderBy('name', 'asc'),
        db('departments')
          .where('organization_id', organizationId)
          .whereNull('deleted_at')
          .select('id', 'name')
          .orderBy('name', 'asc'),
        db('locations')
          .where('organization_id', organizationId)
          .whereNull('deleted_at')
          .where(function () {
            this.where('status', 'active').orWhere('is_active', 'Yes');
          })
          .whereNot('status', 'inactive')
          .whereNot('is_active', 'No')
          .select('id', 'name')
          .orderBy('name', 'asc'),
        db('leave_types')
          .where('organization_id', organizationId)
          .whereNull('deleted_at')
          .select('id', 'leave_name as name')
          .orderBy('leave_name', 'asc'),
        db('employees')
          .where('organization_id', organizationId)
          .whereNull('deleted_at')
          .select('id', 'first_name', 'last_name', 'employee_code')
          .orderBy('first_name', 'asc'),
      ]);

      res.json({
        success: true,
        data: {
          companies: companies.map((c: any) => ({
            id: c.id,
            name: `${c.name}${c.isParent || c.is_parent ? ' (Parent)' : ''}`,
          })),
          departments,
          locations,
          leaveTypes,
          employees: employees.map((e: any) => ({
            id: e.id,
            name: `${e.firstName || e.first_name || ''} ${e.lastName || e.last_name || ''}`.trim() + (e.employeeCode || e.employee_code ? ` (${e.employeeCode || e.employee_code})` : ''),
          })),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/v1/reports/run
   * Runs a dynamic report based on selected fields + filters
   */
  runReport: async (req: Request, res: Response) => {
    try {
      const organizationId = req.ctx?.organizationId;
      const companyId = req.ctx?.companyId ?? null;

      if (!organizationId) {
        return res.status(400).json({ success: false, error: 'Organization context required' });
      }

      const { module, fields, filters, limit } = req.body;

      if (!module || !fields || !Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ success: false, error: 'module and fields[] are required' });
      }

      const result = await runDynamicReport({
        module: module as ModuleType,
        fields,
        filters: filters || {},
        limit: limit || 1000,
        organizationId,
        companyId,
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('[runReport] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/v1/reports/templates
   */
  listTemplates: async (req: Request, res: Response) => {
    try {
      await ensureReportTemplatesTable();
      const db = getKnex();
      const orgId = req.ctx?.organizationId;
      const userId = req.ctx?.userId;

      const templates = await db('report_templates')
        .where({ organization_id: orgId })
        .where(function () {
          this.where('is_shared', 1).orWhere('created_by', userId);
        })
        .whereNull('deleted_at')
        .orderBy('updated_at', 'desc')
        .select(
          'id',
          'uuid',
          'name',
          'description',
          'module',
          'is_shared',
          'created_by',
          'updated_at',
          'selected_fields',
          'filters'
        );

      const parsed = templates.map((t: any) => {
        const rawFields = t.selectedFields ?? t.selected_fields;
        const rawFilters = t.filters;
        const fields = typeof rawFields === 'string' ? JSON.parse(rawFields || '[]') : (rawFields || []);
        const fltrs = typeof rawFilters === 'string' ? JSON.parse(rawFilters || '{}') : (rawFilters || {});
        return {
          ...t,
          selectedFields: fields,
          selected_fields: fields,
          filters: fltrs,
          isShared: t.isShared ?? t.is_shared ?? false,
          is_shared: t.isShared ?? t.is_shared ?? false,
        };
      });

      res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error('[listTemplates] Error:', err);
      res.json({ success: true, data: [] });
    }
  },

  /**
   * POST /api/v1/reports/templates
   */
  saveTemplate: async (req: Request, res: Response) => {
    try {
      await ensureReportTemplatesTable();
      const db = getKnex();
      const orgId = req.ctx?.organizationId;
      const userId = req.ctx?.userId;

      if (!orgId || !userId) {
        return res.status(400).json({ success: false, error: 'User context required' });
      }

      const name = req.body.name;
      const description = req.body.description;
      const module = req.body.module;
      const fields = req.body.selectedFields ?? req.body.selected_fields ?? [];
      const filters = req.body.filters ?? {};
      const columnOrder = req.body.columnOrder ?? req.body.column_order ?? [];
      const isShared = req.body.isShared ?? req.body.is_shared ?? false;

      const [id] = await db('report_templates').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        created_by: userId,
        name,
        description: description || null,
        module,
        selected_fields: JSON.stringify(fields),
        filters: JSON.stringify(filters),
        column_order: JSON.stringify(columnOrder),
        is_shared: isShared ? 1 : 0,
        created_at: new Date(),
        updated_at: new Date(),
      });

      res.json({ success: true, data: { id } });
    } catch (err: any) {
      console.error('[saveTemplate] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/v1/reports/templates/:id
   */
  getTemplate: async (req: Request, res: Response) => {
    try {
      await ensureReportTemplatesTable();
      const db = getKnex();
      const orgId = req.ctx?.organizationId;
      const { id } = req.params;

      const template = await db('report_templates')
        .where({ id, organization_id: orgId })
        .whereNull('deleted_at')
        .first();

      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      const rawFields = template.selectedFields ?? template.selected_fields;
      const rawFilters = template.filters;
      const fields = typeof rawFields === 'string' ? JSON.parse(rawFields || '[]') : (rawFields || []);
      const fltrs = typeof rawFilters === 'string' ? JSON.parse(rawFilters || '{}') : (rawFilters || {});

      res.json({
        success: true,
        data: {
          ...template,
          selectedFields: fields,
          selected_fields: fields,
          filters: fltrs,
          isShared: template.isShared ?? template.is_shared ?? false,
          is_shared: template.isShared ?? template.is_shared ?? false,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * PUT /api/v1/reports/templates/:id
   */
  updateTemplate: async (req: Request, res: Response) => {
    try {
      await ensureReportTemplatesTable();
      const db = getKnex();
      const orgId = req.ctx?.organizationId;
      const { id } = req.params;

      const updateData: Record<string, any> = {
        updated_at: new Date(),
      };

      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description || null;
      if (req.body.module !== undefined) updateData.module = req.body.module;

      const fields = req.body.selectedFields ?? req.body.selected_fields;
      if (fields !== undefined) updateData.selected_fields = JSON.stringify(fields);

      if (req.body.filters !== undefined) updateData.filters = JSON.stringify(req.body.filters);

      const columnOrder = req.body.columnOrder ?? req.body.column_order;
      if (columnOrder !== undefined) updateData.column_order = JSON.stringify(columnOrder);

      const isShared = req.body.isShared ?? req.body.is_shared;
      if (isShared !== undefined) updateData.is_shared = isShared ? 1 : 0;

      await db('report_templates')
        .where({ id, organization_id: orgId })
        .update(updateData);

      res.json({ success: true });
    } catch (err: any) {
      console.error('[updateTemplate] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * DELETE /api/v1/reports/templates/:id
   */
  deleteTemplate: async (req: Request, res: Response) => {
    try {
      await ensureReportTemplatesTable();
      const db = getKnex();
      const orgId = req.ctx?.organizationId;
      const { id } = req.params;

      await db('report_templates')
        .where({ id, organization_id: orgId })
        .update({ deleted_at: new Date() });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};
