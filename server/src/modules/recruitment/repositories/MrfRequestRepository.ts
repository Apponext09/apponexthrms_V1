import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface MrfRequest {
  id: number;
  uuid: string;
  organization_id: number;
  mr_number: string;
  position_title: string;
  number_of_positions: number;
  recruitment_type: string;
  company_id: number | null;
  company_location_id: number | null;
  department_id: number | null;
  grade_id: number | null;
  employment_type: string | null;
  qualification_required: string | null;
  experience_desired: string | null;
  interviewer_id: number | null;
  pay_scale_type: string | null;
  pay_scale_for_position: string | null;
  reason_for_requirement: string | null;
  list_in_job_page: 'Yes' | 'No';
  skills: any;
  comment: string | null;
  job_description: string | null;
  stage: string;
  status: 'Open' | 'Closed';
  requested_by: number | null;
  approved_by: number | null;
  approved_at: string | null;
  target_closure_date?: string | null;
  expiry_date?: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class MrfRequestRepository extends BaseRepository<MrfRequest> {
  private static schemaChecked = false;

  constructor() {
    super('mrf_requests');
  }

  private async ensureColumns() {
    if (MrfRequestRepository.schemaChecked) return;
    try {
      const hasTargetClosure = await this.db.schema.hasColumn('mrf_requests', 'target_closure_date');
      if (!hasTargetClosure) {
        await this.db.schema.alterTable('mrf_requests', (table) => {
          table.date('target_closure_date').nullable();
        });
      }
      const hasExpiryDate = await this.db.schema.hasColumn('mrf_requests', 'expiry_date');
      if (!hasExpiryDate) {
        await this.db.schema.alterTable('mrf_requests', (table) => {
          table.date('expiry_date').nullable();
        });
      }
      const hasDeletedAt = await this.db.schema.hasColumn('mrf_requests', 'deleted_at');
      if (!hasDeletedAt) {
        await this.db.schema.alterTable('mrf_requests', (table) => {
          table.timestamp('deleted_at').nullable();
        });
      }
      MrfRequestRepository.schemaChecked = true;
    } catch (err) {
      console.warn('MrfRequestRepository ensureColumns error:', err);
    }
  }

  override query(ctx: TenantContext): any {
    return this.db('mrf_requests')
      .where('mrf_requests.organization_id', ctx.organizationId)
      .whereNull('mrf_requests.deleted_at');
  }

  override async delete(ctx: TenantContext, id: number | string): Promise<void> {
    await this.ensureColumns();
    await this.db('mrf_requests')
      .where('organization_id', ctx.organizationId)
      .where(this.isPrimaryKeyUuid(id) ? 'uuid' : 'id', id)
      .update({
        deleted_at: new Date(),
        updated_at: new Date(),
      });
  }

  override async create(ctx: TenantContext, data: Partial<MrfRequest>): Promise<MrfRequest> {
    await this.ensureColumns();
    const { v4: uuidv4 } = await import('uuid');
    return super.create(ctx, {
      uuid: data.uuid || uuidv4(),
      ...data
    });
  }

  protected getSearchableFields(): string[] {
    return ['mr_number', 'position_title'];
  }

  async getByMrNumber(ctx: TenantContext, mrNumber: string): Promise<MrfRequest | null> {
    return this.query(ctx).where('mr_number', mrNumber).first();
  }

  async getNextMrNumber(ctx: TenantContext): Promise<string> {
    const result = await this.query(ctx)
      .orderBy('id', 'desc')
      .first();
    
    if (!result) return 'MR-1';
    
    const mrNum = result.mrNumber || (result as any).mr_number;
    if (!mrNum) return 'MR-1';
    const lastNum = parseInt(mrNum.replace('MR-', ''), 10);
    return `MR-${(lastNum || 0) + 1}`;
  }

  async getByStatus(ctx: TenantContext, status: 'Open' | 'Closed', options?: ListQueryOptions) {
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

  async countByStatus(ctx: TenantContext, status: 'Open' | 'Closed'): Promise<number> {
    return this.count(ctx, { status });
  }

  override async getById(ctx: TenantContext, id: number | string): Promise<MrfRequest | null> {
    const row = await this.query(ctx)
      .leftJoin('company', 'mrf_requests.company_id', 'company.company_id')
      .leftJoin('locations', 'mrf_requests.company_location_id', 'locations.id')
      .leftJoin('departments', 'mrf_requests.department_id', 'departments.id')
      .leftJoin('grades', 'mrf_requests.grade_id', 'grades.id')
      .leftJoin('employees', 'mrf_requests.interviewer_id', 'employees.id')
      .leftJoin('users as requester_user', 'mrf_requests.requested_by', 'requester_user.id')
      .leftJoin('employees as requester', 'requester_user.employee_id', 'requester.id')
      .where('mrf_requests.id', id)
      .select([
        'mrf_requests.*',
        'company.name as company',
        'locations.name as companyLocation',
        'departments.name as department',
        'grades.name as grade',
        this.db.raw("TRIM(CONCAT(employees.first_name, ' ', COALESCE(employees.last_name, ''))) as interviewer"),
        this.db.raw("TRIM(CONCAT(COALESCE(requester.first_name, requester_user.first_name), ' ', COALESCE(requester.last_name, requester_user.last_name, ''))) as requested_by")
      ])
      .first();

    return row || null;
  }

  override async list(
    ctx: TenantContext,
    options: ListQueryOptions = {}
  ): Promise<any> {
    await this.ensureColumns();
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search,
      filters = {},
    } = options;

    const validatedPage = Math.max(1, Number(page) || 1);
    const validatedPageSize = Math.max(1, Number(pageSize) || 20);
    const validatedSortOrder = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc';

    let sortByCol = sortBy;
    if (sortBy === 'created_at') sortByCol = 'mrf_requests.created_at';
    else if (sortBy === 'mrNumber' || sortBy === 'mr_number') sortByCol = 'mrf_requests.mr_number';

    let query = this.query(ctx)
      .leftJoin('company', 'mrf_requests.company_id', 'company.company_id')
      .leftJoin('locations', 'mrf_requests.company_location_id', 'locations.id')
      .leftJoin('departments', 'mrf_requests.department_id', 'departments.id')
      .leftJoin('grades', 'mrf_requests.grade_id', 'grades.id')
      .leftJoin('employees', 'mrf_requests.interviewer_id', 'employees.id')
      .leftJoin('users as requester_user', 'mrf_requests.requested_by', 'requester_user.id')
      .leftJoin('employees as requester', 'requester_user.employee_id', 'requester.id');

    // Apply custom filters
    for (const [field, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        if (field === 'status') {
          query = query.where('mrf_requests.status', value);
        } else if (field === 'department_id') {
          query = query.where('mrf_requests.department_id', value);
        } else {
          query = query.where(`mrf_requests.${field}`, value);
        }
      }
    }

    // Apply search
    if (search) {
      query = query.andWhere((q) => {
        q.where('mrf_requests.mr_number', 'like', `%${search}%`)
         .orWhere('mrf_requests.position_title', 'like', `%${search}%`);
      });
    }

    // Get total count
    const countQuery = query.clone();
    const countResult = await countQuery.count('mrf_requests.id as count').first();
    const total = Number(countResult?.count || 0);

    // Apply sorting, pagination and selection
    const items = await query
      .select([
        'mrf_requests.*',
        'company.name as company',
        'locations.name as companyLocation',
        'departments.name as department',
        'grades.name as grade',
        this.db.raw("TRIM(CONCAT(employees.first_name, ' ', COALESCE(employees.last_name, ''))) as interviewer"),
        this.db.raw("TRIM(CONCAT(COALESCE(requester.first_name, requester_user.first_name), ' ', COALESCE(requester.last_name, requester_user.last_name, ''))) as requested_by"),
        this.db.raw(`(
          SELECT COUNT(DISTINCT rb.id) FROM resume_bank rb WHERE rb.mrf_request_id = mrf_requests.id
        ) + (
          SELECT COUNT(DISTINCT a.id) FROM applications a
          INNER JOIN jobs j ON a.job_id = j.id
          WHERE j.mrf_request_id = mrf_requests.id
        ) as applicants`)
      ])
      .orderBy(sortByCol, validatedSortOrder)
      .offset((validatedPage - 1) * validatedPageSize)
      .limit(validatedPageSize);

    const meta = {
      page: validatedPage,
      pageSize: validatedPageSize,
      total,
      hasMore: validatedPage * validatedPageSize < total,
      totalPages: Math.ceil(total / validatedPageSize),
    };

    return { items, meta };
  }
}
