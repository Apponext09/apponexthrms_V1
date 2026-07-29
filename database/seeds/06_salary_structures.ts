import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // 1. Resolve Organization ID and Admin User ID
  const organization = await knex('organizations').select('id').first();
  const orgId = organization?.id || 1;

  const adminUser = await knex('users')
    .where('organization_id', orgId)
    .orderBy('id', 'asc')
    .first();
  const adminUserId = adminUser?.id || 1;

  // Safe table cleanup for re-seeding
  await knex('employee_salary_structures').where('organization_id', orgId).del();
  await knex('salary_structure_components').where('organization_id', orgId).del();
  await knex('salary_structures').where('organization_id', orgId).del();
  await knex('salary_components').where('organization_id', orgId).del();

  const now = new Date();
  const effectiveFrom = '2026-01-01';

  // 2. Insert Standard Salary Components (Earnings & Deductions)
  const componentsToInsert = [
    // Earnings
    {
      uuid: uuidv4(),
      organization_id: orgId,
      component_code: 'BASIC',
      component_name: 'Basic Salary',
      component_type: 'earnings',
      earnings_type: 'basic',
      deduction_type: null,
      is_taxable: true,
      is_recurring: true,
      is_monthly: true,
      percentage_of_basic: 50.00,
      calculation_method: 'percentage',
      sort_order: 1,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      component_code: 'HRA',
      component_name: 'House Rent Allowance (HRA)',
      component_type: 'earnings',
      earnings_type: 'hra',
      deduction_type: null,
      is_taxable: true,
      is_recurring: true,
      is_monthly: true,
      percentage_of_basic: 40.00,
      calculation_method: 'percentage',
      sort_order: 2,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      component_code: 'SPECIAL',
      component_name: 'Special Allowance',
      component_type: 'earnings',
      earnings_type: 'allowance',
      deduction_type: null,
      is_taxable: true,
      is_recurring: true,
      is_monthly: true,
      calculation_method: 'fixed',
      sort_order: 3,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      component_code: 'CONVEYANCE',
      component_name: 'Conveyance & Medical Allowance',
      component_type: 'earnings',
      earnings_type: 'allowance',
      deduction_type: null,
      is_taxable: false,
      is_recurring: true,
      is_monthly: true,
      calculation_method: 'fixed',
      sort_order: 4,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      component_code: 'BONUS',
      component_name: 'Performance Bonus & Incentives',
      component_type: 'earnings',
      earnings_type: 'bonus',
      deduction_type: null,
      is_taxable: true,
      is_recurring: false,
      is_monthly: false,
      calculation_method: 'fixed',
      sort_order: 5,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
    // Deductions
    {
      uuid: uuidv4(),
      organization_id: orgId,
      component_code: 'PF',
      component_name: 'Provident Fund (PF 12%)',
      component_type: 'deductions',
      earnings_type: null,
      deduction_type: 'pf',
      is_taxable: false,
      is_recurring: true,
      is_monthly: true,
      percentage_of_basic: 12.00,
      calculation_method: 'percentage',
      max_limit: 1800,
      sort_order: 6,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      component_code: 'ESI',
      component_name: 'Employee State Insurance (ESI 0.75%)',
      component_type: 'deductions',
      earnings_type: null,
      deduction_type: 'esi',
      is_taxable: false,
      is_recurring: true,
      is_monthly: true,
      calculation_method: 'percentage',
      max_limit: 21000,
      sort_order: 7,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      component_code: 'PT',
      component_name: 'Professional Tax (PT)',
      component_type: 'deductions',
      earnings_type: null,
      deduction_type: 'pt',
      is_taxable: false,
      is_recurring: true,
      is_monthly: true,
      calculation_method: 'fixed',
      sort_order: 8,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      component_code: 'TDS',
      component_name: 'Income Tax Withholding (TDS)',
      component_type: 'deductions',
      earnings_type: null,
      deduction_type: 'tds',
      is_taxable: false,
      is_recurring: true,
      is_monthly: true,
      calculation_method: 'fixed',
      sort_order: 9,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex('salary_components').insert(componentsToInsert);

  const insertedComponents = await knex('salary_components')
    .where('organization_id', orgId)
    .select('id', 'component_code');

  const componentMap = new Map(insertedComponents.map(c => [c.component_code, c.id]));

  // 3. Insert Master Salary Structures
  const structuresToInsert = [
    {
      uuid: uuidv4(),
      organization_id: orgId,
      structure_name: 'Standard Corporate Salary Structure',
      structure_code: 'STD_CORP',
      description: 'Standard 50% Basic, 40% HRA, Special Allowance & statutory PF/PT deductions',
      effective_from: effectiveFrom,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      structure_name: 'Engineering & Technical Staff Structure',
      structure_code: 'ENG_TECH',
      description: 'Technical structure for software engineers, tech leads, and product teams',
      effective_from: effectiveFrom,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      structure_name: 'Executive Band Structure',
      structure_code: 'EXEC_BAND',
      description: 'Executive leadership structure with bonus and TDS tax withholding',
      effective_from: effectiveFrom,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    },
  ];

  await knex('salary_structures').insert(structuresToInsert);

  const insertedStructures = await knex('salary_structures')
    .where('organization_id', orgId)
    .select('id', 'structure_code');

  const structureMap = new Map(insertedStructures.map(s => [s.structure_code, s.id]));

  // 4. Map Components to Salary Structures
  const structureComponentsToInsert: any[] = [];

  const stdCorpId = structureMap.get('STD_CORP');
  const engTechId = structureMap.get('ENG_TECH');
  const execBandId = structureMap.get('EXEC_BAND');

  const defaultComponentCodes = ['BASIC', 'HRA', 'SPECIAL', 'CONVEYANCE', 'PF', 'ESI', 'PT', 'TDS'];

  if (stdCorpId) {
    defaultComponentCodes.forEach((code, idx) => {
      const compId = componentMap.get(code);
      if (compId) {
        structureComponentsToInsert.push({
          uuid: uuidv4(),
          organization_id: orgId,
          structure_id: stdCorpId,
          component_id: compId,
          sort_order: idx + 1,
          created_by: adminUserId,
          updated_by: adminUserId,
          created_at: now,
          updated_at: now,
        });
      }
    });
  }

  if (engTechId) {
    ['BASIC', 'HRA', 'SPECIAL', 'BONUS', 'PF', 'PT', 'TDS'].forEach((code, idx) => {
      const compId = componentMap.get(code);
      if (compId) {
        structureComponentsToInsert.push({
          uuid: uuidv4(),
          organization_id: orgId,
          structure_id: engTechId,
          component_id: compId,
          sort_order: idx + 1,
          created_by: adminUserId,
          updated_by: adminUserId,
          created_at: now,
          updated_at: now,
        });
      }
    });
  }

  if (execBandId) {
    ['BASIC', 'HRA', 'SPECIAL', 'BONUS', 'PF', 'PT', 'TDS'].forEach((code, idx) => {
      const compId = componentMap.get(code);
      if (compId) {
        structureComponentsToInsert.push({
          uuid: uuidv4(),
          organization_id: orgId,
          structure_id: execBandId,
          component_id: compId,
          sort_order: idx + 1,
          created_by: adminUserId,
          updated_by: adminUserId,
          created_at: now,
          updated_at: now,
        });
      }
    });
  }

  if (structureComponentsToInsert.length > 0) {
    await knex('salary_structure_components').insert(structureComponentsToInsert);
  }

  // 5. Automatically Assign Default Salary Structure to All Organization Employees
  const employees = await knex('employees').where('organization_id', orgId).select('id');

  if (employees.length > 0 && stdCorpId) {
    const employeeAssignments = employees.map(emp => ({
      uuid: uuidv4(),
      organization_id: orgId,
      employee_id: emp.id,
      salary_structure_id: stdCorpId,
      effective_from: effectiveFrom,
      is_current: true,
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    }));

    await knex('employee_salary_structures').insert(employeeAssignments);
  }
}
