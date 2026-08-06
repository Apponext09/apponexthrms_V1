import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../common/types/TenantContext';

export class PayrollComponentDefinitionService {
  async getComponents(ctx: TenantContext, groupId?: number | string) {
    const db = getKnex();
    try {
      let query = db('payroll_components').whereNull('deleted_at');
      if (ctx?.organizationId) {
        query = query.where('organization_id', ctx.organizationId);
      }
      if (groupId) {
        const numGroupId = parseInt(String(groupId), 10);
        if (!isNaN(numGroupId)) {
          query = query.where('group_id', numGroupId);
        }
      }
      const rows = await query.orderBy('id', 'asc');

      return rows.map((r: any) => {
        let monthsArr = [];
        try { monthsArr = typeof r.months === 'string' ? JSON.parse(r.months) : (r.months || []); } catch {}
        let gradesArr = [];
        try { gradesArr = typeof r.grades === 'string' ? JSON.parse(r.grades) : (r.grades || []); } catch {}
        let deptsArr = [];
        try { deptsArr = typeof r.departments === 'string' ? JSON.parse(r.departments) : (r.departments || []); } catch {}
        let locsArr = [];
        try { locsArr = typeof r.locations === 'string' ? JSON.parse(r.locations) : (r.locations || []); } catch {}
        let empsArr = [];
        try { empsArr = typeof r.employees === 'string' ? JSON.parse(r.employees) : (r.employees || []); } catch {}

        return {
          ...r,
          id: String(r.id || r.uuid),
          groupId: String(r.groupId || r.group_id || ''),
          name: r.name || '',
          nonCashable: Boolean(r.nonCashable ?? r.non_cashable),
          basedOnAttendance: Boolean(r.basedOnAttendance ?? r.based_on_attendance),
          isActive: r.isActive ?? (r.is_active !== false),
          componentType: r.componentType || r.component_type || 'Value',
          amount: Number(r.amount || 0),
          formula: r.formula || '',
          boundaryType: r.boundaryType || r.boundary_type || 'Choose',
          minAmount: Number(r.minAmount || r.min_amount || 0),
          maxAmount: Number(r.maxAmount || r.max_amount || 0),
          effectiveFromDate: r.effectiveFromDate || r.effective_from_date || '',
          effectiveToDate: r.effectiveToDate || r.effective_to_date || '',
          conditionOn: r.conditionOn || r.condition_on || 'Choose',
          conditionOperator: r.conditionOperator || r.condition_operator || 'Choose',
          conditionValue1: r.conditionValue1 || r.condition_value1 || '',
          conditionValue2: r.conditionValue2 || r.condition_value2 || '',
          months: monthsArr,
          genderFilter: r.genderFilter || r.gender_filter || 'All',
          grades: gradesArr,
          departments: deptsArr,
          locations: locsArr,
          employees: empsArr
        };
      });
    } catch (err) {
      console.error('Error fetching components:', err);
      return [];
    }
  }

  async createComponent(ctx: TenantContext, data: any) {
    const db = getKnex();
    const nameVal = data.name || data.component_name || 'New Component';
    const groupId = data.groupId || data.group_id ? parseInt(String(data.groupId || data.group_id), 10) : null;

    const payload: any = {
      uuid: uuidv4(),
      organization_id: ctx?.organizationId ? Number(ctx.organizationId) : 68,
      group_id: groupId,
      name: nameVal,
      non_cashable: (data.nonCashable ?? data.non_cashable) ? 1 : 0,
      based_on_attendance: (data.basedOnAttendance ?? data.based_on_attendance) ? 1 : 0,
      is_active: (data.isActive ?? data.is_active) !== false ? 1 : 0,
      component_type: data.componentType || data.component_type || 'Value',
      amount: Number(data.amount || 0),
      formula: data.formula || '',
      boundary_type: data.boundaryType || data.boundary_type || 'Choose',
      min_amount: Number(data.minAmount || data.min_amount || 0),
      max_amount: Number(data.maxAmount || data.max_amount || 0),
      effective_from_date: data.effectiveFromDate || data.effective_from_date || null,
      effective_to_date: data.effectiveToDate || data.effective_to_date || null,
      condition_on: data.conditionOn || data.condition_on || null,
      condition_operator: data.conditionOperator || data.condition_operator || null,
      condition_value1: data.conditionValue1 || data.condition_value1 || null,
      condition_value2: data.conditionValue2 || data.condition_value2 || null,
      months: data.months ? JSON.stringify(data.months) : null,
      gender_filter: data.genderFilter || data.gender_filter || 'All',
      grades: data.grades ? JSON.stringify(data.grades) : null,
      departments: data.departments ? JSON.stringify(data.departments) : null,
      locations: data.locations ? JSON.stringify(data.locations) : null,
      employees: data.employees ? JSON.stringify(data.employees) : null
    };

    try {
      const [id] = await db('payroll_components').insert(payload);
      const row = await db('payroll_components').where('id', id).first();
      const r = row || { id, ...payload };
      return {
        ...r,
        id: String(r.id || r.uuid || id),
        groupId: String(r.groupId || r.group_id || ''),
        name: r.name || nameVal,
        nonCashable: Boolean(r.nonCashable ?? r.non_cashable),
        basedOnAttendance: Boolean(r.basedOnAttendance ?? r.based_on_attendance),
        isActive: r.isActive ?? (r.is_active !== false),
        componentType: r.componentType || r.component_type || 'Value',
        amount: Number(r.amount || 0),
        formula: r.formula || '',
        boundaryType: r.boundaryType || r.boundary_type || 'Choose',
        minAmount: Number(r.minAmount || r.min_amount || 0),
        maxAmount: Number(r.maxAmount || r.max_amount || 0),
        genderFilter: r.genderFilter || r.gender_filter || 'All'
      };
    } catch (err) {
      console.error('Error creating component:', err);
      throw err;
    }
  }

  async updateComponent(ctx: TenantContext, id: number | string, data: any) {
    const db = getKnex();
    const strId = String(id);
    const numId = parseInt(strId, 10);

    const updateData: any = {
      updated_at: new Date()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.groupId !== undefined || data.group_id !== undefined) {
      updateData.group_id = data.groupId ?? data.group_id;
    }
    if (data.nonCashable !== undefined || data.non_cashable !== undefined) {
      updateData.non_cashable = (data.nonCashable ?? data.non_cashable) ? 1 : 0;
    }
    if (data.basedOnAttendance !== undefined || data.based_on_attendance !== undefined) {
      updateData.based_on_attendance = (data.basedOnAttendance ?? data.based_on_attendance) ? 1 : 0;
    }
    if (data.isActive !== undefined || data.is_active !== undefined) {
      updateData.is_active = (data.isActive ?? data.is_active) ? 1 : 0;
    }
    if (data.componentType !== undefined || data.component_type !== undefined) {
      updateData.component_type = data.componentType ?? data.component_type;
    }
    if (data.amount !== undefined) updateData.amount = Number(data.amount);
    if (data.formula !== undefined) updateData.formula = data.formula;
    if (data.boundaryType !== undefined || data.boundary_type !== undefined) {
      updateData.boundary_type = data.boundaryType ?? data.boundary_type;
    }
    if (data.minAmount !== undefined || data.min_amount !== undefined) {
      updateData.min_amount = Number(data.minAmount ?? data.min_amount);
    }
    if (data.maxAmount !== undefined || data.max_amount !== undefined) {
      updateData.max_amount = Number(data.maxAmount ?? data.max_amount);
    }
    if (data.effectiveFromDate !== undefined || data.effective_from_date !== undefined) {
      updateData.effective_from_date = data.effectiveFromDate ?? data.effective_from_date ?? null;
    }
    if (data.effectiveToDate !== undefined || data.effective_to_date !== undefined) {
      updateData.effective_to_date = data.effectiveToDate ?? data.effective_to_date ?? null;
    }
    if (data.conditionOn !== undefined || data.condition_on !== undefined) {
      updateData.condition_on = data.conditionOn ?? data.condition_on;
    }
    if (data.conditionOperator !== undefined || data.condition_operator !== undefined) {
      updateData.condition_operator = data.conditionOperator ?? data.condition_operator;
    }
    if (data.conditionValue1 !== undefined || data.condition_value1 !== undefined) {
      updateData.condition_value1 = data.conditionValue1 ?? data.condition_value1;
    }
    if (data.conditionValue2 !== undefined || data.condition_value2 !== undefined) {
      updateData.condition_value2 = data.conditionValue2 ?? data.condition_value2;
    }
    if (data.months !== undefined) {
      updateData.months = data.months ? JSON.stringify(data.months) : null;
    }
    if (data.genderFilter !== undefined || data.gender_filter !== undefined) {
      updateData.gender_filter = data.genderFilter ?? data.gender_filter;
    }
    if (data.grades !== undefined) {
      updateData.grades = data.grades ? JSON.stringify(data.grades) : null;
    }
    if (data.departments !== undefined) {
      updateData.departments = data.departments ? JSON.stringify(data.departments) : null;
    }
    if (data.locations !== undefined) {
      updateData.locations = data.locations ? JSON.stringify(data.locations) : null;
    }
    if (data.employees !== undefined) {
      updateData.employees = data.employees ? JSON.stringify(data.employees) : null;
    }

    try {
      let query = db('payroll_components');
      if (ctx?.organizationId) {
        query = query.where('organization_id', ctx.organizationId);
      }

      if (!isNaN(numId)) {
        await query.where(function() {
          this.where('id', numId).orWhere('uuid', strId);
        }).update(updateData);
      } else {
        await query.where('uuid', strId).update(updateData);
      }
    } catch (err) {
      console.error('Error updating component in DB:', err);
    }

    let fetchQuery = db('payroll_components');
    if (ctx?.organizationId) {
      fetchQuery = fetchQuery.where('organization_id', ctx.organizationId);
    }
    const r = await fetchQuery
      .where(function() {
        if (!isNaN(numId)) this.where('id', numId).orWhere('uuid', strId);
        else this.where('uuid', strId);
      })
      .first();

    if (!r) return { id: strId, ...data, ...updateData };

    let monthsArr = []; try { monthsArr = typeof r.months === 'string' ? JSON.parse(r.months) : (r.months || []); } catch {}
    let gradesArr = []; try { gradesArr = typeof r.grades === 'string' ? JSON.parse(r.grades) : (r.grades || []); } catch {}
    let deptsArr = []; try { deptsArr = typeof r.departments === 'string' ? JSON.parse(r.departments) : (r.departments || []); } catch {}
    let locsArr = []; try { locsArr = typeof r.locations === 'string' ? JSON.parse(r.locations) : (r.locations || []); } catch {}
    let empsArr = []; try { empsArr = typeof r.employees === 'string' ? JSON.parse(r.employees) : (r.employees || []); } catch {}

    return {
      ...r,
      id: String(r.id || r.uuid),
      groupId: String(r.groupId || r.group_id || ''),
      name: r.name || data.name || '',
      nonCashable: Boolean(r.nonCashable ?? r.non_cashable),
      basedOnAttendance: Boolean(r.basedOnAttendance ?? r.based_on_attendance),
      isActive: r.isActive ?? (r.is_active !== false),
      componentType: r.componentType || r.component_type || 'Value',
      amount: Number(r.amount || 0),
      formula: r.formula || '',
      boundaryType: r.boundaryType || r.boundary_type || 'Choose',
      minAmount: Number(r.minAmount || r.min_amount || 0),
      maxAmount: Number(r.maxAmount || r.max_amount || 0),
      effectiveFromDate: r.effectiveFromDate || r.effective_from_date || '',
      effectiveToDate: r.effectiveToDate || r.effective_to_date || '',
      conditionOn: r.conditionOn || r.condition_on || 'Choose',
      conditionOperator: r.conditionOperator || r.condition_operator || 'Choose',
      conditionValue1: r.conditionValue1 || r.condition_value1 || '',
      conditionValue2: r.conditionValue2 || r.condition_value2 || '',
      months: monthsArr,
      genderFilter: r.genderFilter || r.gender_filter || 'All',
      grades: gradesArr,
      departments: deptsArr,
      locations: locsArr,
      employees: empsArr
    };
  }

  async deleteComponent(ctx: TenantContext, id: number | string) {
    const db = getKnex();
    const strId = String(id);
    const numId = parseInt(strId, 10);

    let query = db('payroll_components');
    if (ctx?.organizationId) {
      query = query.where('organization_id', ctx.organizationId);
    }

    if (!isNaN(numId)) {
      await query.where(function() {
        this.where('id', numId).orWhere('uuid', strId);
      }).update({ deleted_at: new Date() });
    } else {
      await query.where('uuid', strId).update({ deleted_at: new Date() });
    }
  }
}
