import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export class PayrollComponentGroupService {
  async getGroups(ctx: TenantContext, category?: string) {
    const db = getKnex();
    try {
      let query = db('payroll_component_groups').whereNull('deleted_at');
      if (ctx?.organizationId) {
        query = query.where('organization_id', ctx.organizationId);
      }
      if (category) {
        query = query.where('category', category);
      }
      const rows = await query.orderBy('display_order', 'asc').orderBy('id', 'asc');

      return rows.map((r: any) => ({
        ...r,
        id: String(r.id || r.uuid),
        name: r.name || '',
        category: r.category || 'Earning',
        roundFormat: r.roundFormat || r.round_format || 'Round',
        groupFunction: r.groupFunction || r.group_function || 'Max',
        configureOnProfile: Boolean(r.configureOnProfile ?? r.configure_on_profile),
        displayOnProfile: Boolean(r.displayOnProfile ?? r.display_on_profile),
        isEditable: Boolean(r.isEditable ?? r.is_editable),
        contributedBy: r.contributedBy || r.contributed_by || 'Employee',
        isActive: r.isActive ?? (r.is_active !== false),
        recalculateOnChange: Boolean(r.recalculateOnChange ?? r.recalculate_on_change),
        groupForPayslip: r.groupForPayslip || r.group_for_payslip || 'Choose',
        displayOrder: r.displayOrder ?? r.display_order ?? 10,
        disableArrear: Boolean(r.disableArrear ?? r.disable_arrear),
        displayTotalOnProcess: Boolean(r.displayTotalOnProcess ?? r.display_total_on_process),
        tdsSameMonth: Boolean(r.tdsSameMonth ?? r.tds_same_month),
        isTaxable: Boolean(r.isTaxable ?? r.is_taxable)
      }));
    } catch (err) {
      console.error('Error fetching component groups:', err);
      return [];
    }
  }

  async createGroup(ctx: TenantContext, data: any) {
    const db = getKnex();
    const nameVal = data.name || data.group_name || 'New Group';
    const category = data.category || 'Earning';

    const payload: any = {
      uuid: uuidv4(),
      organization_id: ctx?.organizationId ? Number(ctx.organizationId) : 68,
      name: nameVal,
      category: category,
      round_format: data.roundFormat || data.round_format || 'Round',
      group_function: data.groupFunction || data.group_function || 'Max',
      configure_on_profile: (data.configureOnProfile ?? data.configure_on_profile) ? 1 : 0,
      display_on_profile: (data.displayOnProfile ?? data.display_on_profile) ? 1 : 0,
      is_editable: (data.isEditable ?? data.is_editable) !== false ? 1 : 0,
      contributed_by: data.contributedBy || data.contributed_by || 'Employee',
      is_active: (data.isActive ?? data.is_active) !== false ? 1 : 0,
      recalculate_on_change: (data.recalculateOnChange ?? data.recalculate_on_change) ? 1 : 0,
      group_for_payslip: data.groupForPayslip || data.group_for_payslip || 'Choose',
      display_order: data.displayOrder ?? data.display_order ?? 10,
      disable_arrear: (data.disableArrear ?? data.disable_arrear) ? 1 : 0,
      display_total_on_process: (data.displayTotalOnProcess ?? data.display_total_on_process) ? 1 : 0,
      tds_same_month: (data.tdsSameMonth ?? data.tds_same_month) ? 1 : 0,
      is_taxable: (data.isTaxable ?? data.is_taxable) !== false ? 1 : 0
    };

    try {
      const [groupId] = await db('payroll_component_groups').insert(payload);

      // Auto-create a matching default primary component inside this group if none exists
      const compPayload = {
        uuid: uuidv4(),
        organization_id: ctx.organizationId || 1,
        group_id: groupId,
        name: nameVal,
        component_type: 'Value',
        amount: 0,
        is_active: 1
      };
      await db('payroll_components').insert(compPayload).catch(() => {});

      const row = await db('payroll_component_groups').where('id', groupId).first();
      const r = row || { id: groupId, ...payload };
      return {
        ...r,
        id: String(r.id || r.uuid || groupId),
        name: r.name || nameVal,
        category: r.category || category,
        roundFormat: r.roundFormat || r.round_format || payload.round_format,
        groupFunction: r.groupFunction || r.group_function || payload.group_function,
        configureOnProfile: Boolean(r.configureOnProfile ?? r.configure_on_profile),
        displayOnProfile: Boolean(r.displayOnProfile ?? r.display_on_profile),
        isEditable: Boolean(r.isEditable ?? r.is_editable),
        contributedBy: r.contributedBy || r.contributed_by || payload.contributed_by,
        isActive: r.isActive ?? (r.is_active !== false),
        recalculateOnChange: Boolean(r.recalculateOnChange ?? r.recalculate_on_change),
        groupForPayslip: r.groupForPayslip || r.group_for_payslip || payload.group_for_payslip,
        displayOrder: r.displayOrder ?? r.display_order ?? 10,
        disableArrear: Boolean(r.disableArrear ?? r.disable_arrear),
        displayTotalOnProcess: Boolean(r.displayTotalOnProcess ?? r.display_total_on_process),
        tdsSameMonth: Boolean(r.tdsSameMonth ?? r.tds_same_month),
        isTaxable: Boolean(r.isTaxable ?? r.is_taxable)
      };
    } catch (err) {
      console.error('Error creating component group:', err);
      throw err;
    }
  }

  async updateGroup(ctx: TenantContext, id: number | string, data: any) {
    const db = getKnex();
    const strId = String(id);
    const numId = parseInt(strId, 10);

    const updateData: any = {
      updated_at: new Date()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.roundFormat !== undefined || data.round_format !== undefined) {
      updateData.round_format = data.roundFormat ?? data.round_format;
    }
    if (data.groupFunction !== undefined || data.group_function !== undefined) {
      updateData.group_function = data.groupFunction ?? data.group_function;
    }
    if (data.configureOnProfile !== undefined || data.configure_on_profile !== undefined) {
      updateData.configure_on_profile = (data.configureOnProfile ?? data.configure_on_profile) ? 1 : 0;
    }
    if (data.displayOnProfile !== undefined || data.display_on_profile !== undefined) {
      updateData.display_on_profile = (data.displayOnProfile ?? data.display_on_profile) ? 1 : 0;
    }
    if (data.isEditable !== undefined || data.is_editable !== undefined) {
      updateData.is_editable = (data.isEditable ?? data.is_editable) ? 1 : 0;
    }
    if (data.contributedBy !== undefined || data.contributed_by !== undefined) {
      updateData.contributed_by = data.contributedBy ?? data.contributed_by;
    }
    if (data.isActive !== undefined || data.is_active !== undefined) {
      updateData.is_active = (data.isActive ?? data.is_active) ? 1 : 0;
    }
    if (data.recalculateOnChange !== undefined || data.recalculate_on_change !== undefined) {
      updateData.recalculate_on_change = (data.recalculateOnChange ?? data.recalculate_on_change) ? 1 : 0;
    }
    if (data.groupForPayslip !== undefined || data.group_for_payslip !== undefined) {
      updateData.group_for_payslip = data.groupForPayslip ?? data.group_for_payslip;
    }
    if (data.displayOrder !== undefined || data.display_order !== undefined) {
      updateData.display_order = data.displayOrder ?? data.display_order;
    }
    if (data.disableArrear !== undefined || data.disable_arrear !== undefined) {
      updateData.disable_arrear = (data.disableArrear ?? data.disable_arrear) ? 1 : 0;
    }
    if (data.displayTotalOnProcess !== undefined || data.display_total_on_process !== undefined) {
      updateData.display_total_on_process = (data.displayTotalOnProcess ?? data.display_total_on_process) ? 1 : 0;
    }
    if (data.tdsSameMonth !== undefined || data.tds_same_month !== undefined) {
      updateData.tds_same_month = (data.tdsSameMonth ?? data.tds_same_month) ? 1 : 0;
    }
    if (data.isTaxable !== undefined || data.is_taxable !== undefined) {
      updateData.is_taxable = (data.isTaxable ?? data.is_taxable) ? 1 : 0;
    }

    try {
      let query = db('payroll_component_groups');
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
      console.error('Error updating group in DB:', err);
    }

    let fetchQuery = db('payroll_component_groups');
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

    return {
      ...r,
      id: String(r.id || r.uuid),
      name: r.name || data.name || '',
      category: r.category || 'Earning',
      roundFormat: r.roundFormat || r.round_format || 'Round',
      groupFunction: r.groupFunction || r.group_function || 'Max',
      configureOnProfile: Boolean(r.configureOnProfile ?? r.configure_on_profile),
      displayOnProfile: Boolean(r.displayOnProfile ?? r.display_on_profile),
      isEditable: Boolean(r.isEditable ?? r.is_editable),
      contributedBy: r.contributedBy || r.contributed_by || 'Employee',
      isActive: r.isActive ?? (r.is_active !== false),
      recalculateOnChange: Boolean(r.recalculateOnChange ?? r.recalculate_on_change),
      groupForPayslip: r.groupForPayslip || r.group_for_payslip || 'Choose',
      displayOrder: r.displayOrder ?? r.display_order ?? 10,
      disableArrear: Boolean(r.disableArrear ?? r.disable_arrear),
      displayTotalOnProcess: Boolean(r.displayTotalOnProcess ?? r.display_total_on_process),
      tdsSameMonth: Boolean(r.tdsSameMonth ?? r.tds_same_month),
      isTaxable: Boolean(r.isTaxable ?? r.is_taxable)
    };
  }

  async deleteGroup(ctx: TenantContext, id: number | string) {
    const db = getKnex();
    const strId = String(id);
    const numId = parseInt(strId, 10);

    let query = db('payroll_component_groups');
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
