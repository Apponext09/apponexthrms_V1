import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export interface PolicyCategory {
  id: number;
  uuid: string;
  organizationId: number;
  companyId?: number | null;
  name: string;
  description?: string | null;
  createdBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_CATEGORIES = [
  'General',
  'Code of Conduct',
  'Cybersecurity & InfoSec',
  'POSH & Workplace Safety',
  'Leave & Attendance',
  'Payroll & Compensation',
  'Asset & Data Usage',
  'Executive Guidelines',
];

export class PolicyCategoryRepository {
  private get db() {
    return getKnex();
  }

  /**
   * List all policy categories for the organization (seeds defaults if empty)
   */
  async listAll(ctx: TenantContext): Promise<PolicyCategory[]> {
    let categories = await this.db('policy_categories')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('name', 'asc');

    // Auto-seed default categories if organization has none
    if (categories.length === 0) {
      const defaultRows = DEFAULT_CATEGORIES.map((name) => ({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        company_id: ctx.companyId || null,
        name,
        created_by: ctx.userId || null,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await this.db('policy_categories').insert(defaultRows);

      categories = await this.db('policy_categories')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .orderBy('name', 'asc');
    }

    return categories.map((c) => ({
      id: Number(c.id),
      uuid: c.uuid,
      organizationId: Number(c.organization_id),
      companyId: c.company_id ? Number(c.company_id) : null,
      name: c.name,
      description: c.description || null,
      createdBy: c.created_by ? Number(c.created_by) : null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }

  /**
   * Create a custom policy category
   */
  async create(ctx: TenantContext, name: string, description?: string): Promise<PolicyCategory> {
    const trimmedName = name.trim();
    const existing = await this.db('policy_categories')
      .where('organization_id', ctx.organizationId)
      .whereRaw('LOWER(name) = ?', [trimmedName.toLowerCase()])
      .whereNull('deleted_at')
      .first();

    if (existing) {
      return {
        id: Number(existing.id),
        uuid: existing.uuid,
        organizationId: Number(existing.organization_id),
        companyId: existing.company_id ? Number(existing.company_id) : null,
        name: existing.name,
        description: existing.description || null,
        createdBy: existing.created_by ? Number(existing.created_by) : null,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    const uuid = uuidv4();
    const [insertedId] = await this.db('policy_categories').insert({
      uuid,
      organization_id: ctx.organizationId,
      company_id: ctx.companyId || null,
      name: trimmedName,
      description: description?.trim() || null,
      created_by: ctx.userId || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      id: Number(insertedId),
      uuid,
      organizationId: ctx.organizationId,
      companyId: ctx.companyId || null,
      name: trimmedName,
      description: description?.trim() || null,
      createdBy: ctx.userId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Delete a custom category
   */
  async delete(ctx: TenantContext, id: number): Promise<boolean> {
    const count = await this.db('policy_categories')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .update({
        deleted_at: new Date(),
        updated_at: new Date(),
      });

    return count > 0;
  }
}
