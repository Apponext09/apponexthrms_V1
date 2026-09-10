import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export interface OTRule {
  id: number;
  uuid: string;
  organizationId: number;
  companyId: number | null;
  ruleName: string;
  titleChange: string | null;
  period: 'daily' | 'weekly';
  shiftType: 'time_bound' | 'flexible';
  dailyMaxOtLimit: number | null;
  dailyMaxOtLimitUnit: 'minutes' | 'hours';
  weeklyMaxOtLimit: number | null;
  weeklyMaxOtLimitUnit: 'minutes' | 'hours';
  maxLimitPriorityJson: string | null;
  autoOtApprove: boolean;
  autoApproveMinMinutes: number | null;
  autoApproveMaxMinutes: number | null;
  otFormulaEnabled: boolean;
  otFormulaExpression: string | null;
  employeeTimingRounding: 'no_round' | 'round' | 'round_up' | 'round_down';
  normalDayConfigJson: string | null;
  holidayConfigJson: string | null;
  weekendConfigJson: string | null;
  isActive: boolean;
}

export class OTRuleRepository {
  private table = 'ot_rules';
  private eligTable = 'ot_rule_eligibility';

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(ctx: TenantContext, data: Record<string, any>): Promise<OTRule> {
    const db = getKnex();
    const [id] = await db(this.table).insert({
      ...data,
      organization_id: ctx.organizationId,
    });
    return this.getById(ctx, id) as Promise<OTRule>;
  }

  async update(ctx: TenantContext, id: number, data: Record<string, any>): Promise<OTRule> {
    const db = getKnex();
    await db(this.table)
      .where({ id, organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .update({ ...data, updated_at: db.fn.now() });
    return this.getById(ctx, id) as Promise<OTRule>;
  }

  async softDelete(ctx: TenantContext, id: number): Promise<void> {
    const db = getKnex();
    await db(this.table)
      .where({ id, organization_id: ctx.organizationId })
      .update({ deleted_at: db.fn.now(), is_active: false });
  }

  async getById(ctx: TenantContext, id: number): Promise<OTRule | null> {
    const db = getKnex();
    const row = await db(this.table)
      .where({ id, organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .first();
    return (row as OTRule) ?? null;
  }

  async list(
    ctx: TenantContext,
    opts?: { page?: number; limit?: number; search?: string; isActive?: boolean }
  ): Promise<{ items: OTRule[]; total: number }> {
    const db = getKnex();
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    let q = db(this.table)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at');

    if (opts?.search) {
      q = q.where('rule_name', 'like', `%${opts.search}%`);
    }
    if (opts?.isActive !== undefined) {
      q = q.where('is_active', opts.isActive);
    }

    const [{ total }] = await q.clone().count('id as total');
    const items = await q.orderBy('created_at', 'desc').limit(limit).offset(offset);

    return { items: items as OTRule[], total: Number(total) };
  }

  // ── Eligibility ─────────────────────────────────────────────────────────────

  async setEligibility(
    ctx: TenantContext,
    ruleId: number,
    items: { entityType: string; entityId: number }[]
  ): Promise<void> {
    const db = getKnex();
    await db(this.eligTable).where('ot_rule_id', ruleId).delete();
    if (items.length > 0) {
      await db(this.eligTable).insert(
        items.map((item) => ({
          ot_rule_id:      ruleId,
          organization_id: ctx.organizationId,
          entity_type:     item.entityType,
          entity_id:       item.entityId,
        }))
      );
    }
  }

  async getEligibility(ruleId: number): Promise<any[]> {
    const db = getKnex();
    return db(this.eligTable).where('ot_rule_id', ruleId);
  }

  // ── Rule resolution for a specific employee ─────────────────────────────────
  /**
   * Resolves the active OT rule for an employee.
   * Priority: department > grade > shift > employee_type > employee_status > company_location
   */
  async getActiveRuleForEmployee(ctx: TenantContext, employeeId: number): Promise<OTRule | null> {
    const db = getKnex();
    const today = new Date().toISOString().slice(0, 10);

    // Load employee core fields
    const emp = await db('employees')
      .where({ id: employeeId, organization_id: ctx.organizationId })
      .select('current_department_id', 'grade_id', 'employment_type_id', 'status_id')
      .first();
    if (!emp) return null;

    // Load shift assignment
    const shiftAssignment = await db('employee_shift_assignments')
      .where('employee_id', employeeId)
      .where('organization_id', ctx.organizationId)
      .where('effective_from', '<=', today)
      .where((q: any) => q.whereNull('effective_to').orWhere('effective_to', '>=', today))
      .orderBy('effective_from', 'desc')
      .select('shift_id')
      .first();

    // Load primary location
    const locAssignment = await db('employee_attendance_locations')
      .where({ employee_id: employeeId, is_primary: true })
      .select('location_id')
      .first()
      .catch(() => null);

    const entityChecks: { type: string; id: number | null }[] = [
      { type: 'department',       id: emp.current_department_id ?? null },
      { type: 'grade',            id: emp.grade_id ?? null },
      { type: 'shift',            id: shiftAssignment?.shift_id ?? null },
      { type: 'employee_type',    id: emp.employment_type_id ?? null },
      { type: 'employee_status',  id: emp.status_id ?? null },
      { type: 'company_location', id: locAssignment?.location_id ?? null },
    ];

    for (const { type, id } of entityChecks) {
      if (!id) continue;
      const rule = await db(`${this.table} as r`)
        .join(`${this.eligTable} as e`, 'e.ot_rule_id', 'r.id')
        .where('r.organization_id', ctx.organizationId)
        .where('r.is_active', true)
        .whereNull('r.deleted_at')
        .where('e.entity_type', type)
        .where('e.entity_id', id)
        .select('r.*')
        .first();
      if (rule) return rule as OTRule;
    }

    // Fallback: return the first active OT rule for the organization
    const fallbackRule = await db(`${this.table} as r`)
      .where('r.organization_id', ctx.organizationId)
      .where('r.is_active', true)
      .whereNull('r.deleted_at')
      .orderBy('r.id', 'asc')
      .first();

    return fallbackRule ? (fallbackRule as OTRule) : null;
  }
}
