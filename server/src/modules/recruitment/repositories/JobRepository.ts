import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Job {
  id: number;
  uuid: string;
  organization_id: number;
  job_code: string;
  job_title: string;
  job_description: string;
  department_id: number | null;
  designation_id: number | null;
  location_id: number | null;
  job_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  experience_level: 'entry' | 'mid' | 'senior' | 'lead';
  min_experience_years: number | null;
  max_experience_years: number | null;
  min_salary: number | null;
  max_salary: number | null;
  currency: string;
  employment_type: 'onsite' | 'remote' | 'hybrid';
  no_of_positions: number;
  job_template_id: number | null;
  status: 'draft' | 'published' | 'closed' | 'archived' | 'on_hold';
  is_internal: boolean;
  is_published_external: boolean;
  published_at: string | null;
  closed_at: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class JobRepository extends BaseRepository<Job> {
  constructor() {
    super('jobs');
    this.ensureExpiryDateColumn();
  }

  private async ensureExpiryDateColumn() {
    try {
      const db = this.db;
      if (db && db.schema) {
        const hasExpiry = await db.schema.hasColumn('jobs', 'expiry_date');
        if (!hasExpiry) {
          await db.schema.table('jobs', (table: any) => {
            table.date('expiry_date').nullable();
          });
        }
      }
    } catch { }
  }

  protected getSearchableFields(): string[] {
    return ['job_code', 'job_title', 'job_description'];
  }

  async getByCode(ctx: TenantContext, code: string): Promise<Job | null> {
    return this.query(ctx).where('job_code', code).first();
  }

  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('job_code', code);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  async getByDepartment(ctx: TenantContext, departmentId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { department_id: departmentId },
    });
  }

  async getPublished(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'published' },
    });
  }

  async getOpen(ctx: TenantContext, options?: ListQueryOptions) {
    return this.getPublished(ctx, options);
  }

  async getPublishedExternal(orgId: number, options?: ListQueryOptions): Promise<any> {
    const query = this.db(this.tableName)
      .where('organization_id', orgId)
      .where('status', 'published')
      .where('is_published_external', true)
      .whereNull('deleted_at');

    if (options?.filters) {
      for (const [field, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null) {
          query.where(field, value);
        }
      }
    }

    if (options?.search) {
      query.andWhere((q) => {
        q.where('job_title', 'like', `%${options.search}%`)
          .orWhere('job_code', 'like', `%${options.search}%`)
          .orWhere('job_description', 'like', `%${options.search}%`);
      });
    }

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const countQuery = query.clone().clearSelect().count('* as count').first();
    const countResult = await countQuery;
    const total = parseInt((countResult as any)?.count as string, 10) || 0;

    const items = await query
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getPublishedInternal(ctx: TenantContext, options?: ListQueryOptions): Promise<any> {
    const query = this.query(ctx)
      .where('status', 'published')
      .where('is_internal', true)
      .whereNull('deleted_at');

    if (options?.filters) {
      for (const [field, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null) {
          query.where(field, value);
        }
      }
    }

    if (options?.search) {
      query.andWhere((q) => {
        q.where('job_title', 'like', `%${options.search}%`)
          .orWhere('job_code', 'like', `%${options.search}%`)
          .orWhere('job_description', 'like', `%${options.search}%`);
      });
    }

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const countQuery = query.clone().clearSelect().count('* as count').first();
    const countResult = await countQuery;
    const total = parseInt((countResult as any)?.count as string, 10) || 0;

    const items = await query
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}

