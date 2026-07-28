import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export interface PayComponentInput {
  code: string;
  name: string;
  componentType: 'earning' | 'deduction' | 'employer_contribution' | 'reimbursement';
  calculationType: 'fixed' | 'percentage_of_basic' | 'formula' | 'slab_based' | 'attendance_based';
  formulaExpression?: string;
  isTaxable?: boolean;
  isPfApplicable?: boolean;
  isEsiApplicable?: boolean;
  isPtApplicable?: boolean;
  isStatutory?: boolean;
}

export class PayComponentService {
  async getComponents(ctx: TenantContext) {
    const db = getKnex();
    return db('pay_component_definitions')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at');
  }

  async createComponent(ctx: TenantContext, input: PayComponentInput) {
    const db = getKnex();
    const [id] = await db('pay_component_definitions').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      code: input.code.toUpperCase(),
      name: input.name,
      component_type: input.componentType,
      calculation_type: input.calculationType,
      formula_expression: input.formulaExpression || null,
      is_taxable: input.isTaxable ?? true,
      is_pf_applicable: input.isPfApplicable ?? true,
      is_esi_applicable: input.isEsiApplicable ?? true,
      is_pt_applicable: input.isPtApplicable ?? true,
      is_statutory: input.isStatutory ?? false,
      status: 'active',
      created_by: ctx.userId
    });
    return db('pay_component_definitions').where('id', id).first();
  }

  async getDefaultComponents() {
    return [
      { code: 'BASIC', name: 'Basic Pay', type: 'earning', calc: 'fixed' },
      { code: 'HRA', name: 'House Rent Allowance', type: 'earning', calc: 'percentage_of_basic', formula: '40% of BASIC' },
      { code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance', type: 'earning', calc: 'fixed' },
      { code: 'OVERTIME', name: 'Overtime Pay', type: 'earning', calc: 'attendance_based' },
      { code: 'PF_EMP', name: 'Employee PF (12%)', type: 'deduction', calc: 'percentage_of_basic', formula: '12% of BASIC' },
      { code: 'ESI_EMP', name: 'Employee ESI (0.75%)', type: 'deduction', calc: 'slab_based' },
      { code: 'TDS', name: 'Income Tax (TDS)', type: 'deduction', calc: 'slab_based' },
      { code: 'PT', name: 'Professional Tax', type: 'deduction', calc: 'slab_based' },
      { code: 'REIMB_TRAVEL', name: 'Travel Reimbursement', type: 'reimbursement', calc: 'fixed' }
    ];
  }
}
