import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';

// Additive migration. Existing requests are not silently rerouted or approved.
export async function up(db: Knex) {
  await db.raw('ALTER TABLE workflows MODIFY COLUMN type VARCHAR(100) NOT NULL');
  const add = async (table: string, column: string, build: (t: Knex.CreateTableBuilder) => void) => {
    if (!(await db.schema.hasColumn(table, column))) await db.schema.alterTable(table, build);
  };
  await add('workflows', 'applicability_filters', t => t.text('applicability_filters').nullable());
  await add('workflows', 'is_active', t => t.boolean('is_active').defaultTo(true));
  await add('workflows', 'expense_config', t => t.text('expense_config').nullable());
  await add('workflow_steps', 'resolver_config', t => t.text('resolver_config').nullable());
  for (const table of ['expense_claims', 'travel_requests', 'travel_advances', 'mileage_claims']) {
    await add(table, 'submitted_by_user_id', t => t.bigInteger('submitted_by_user_id').unsigned().nullable());
    await add(table, 'submitted_by_role', t => t.string('submitted_by_role', 50).nullable());
    await add(table, 'approval_run_id', t => t.bigInteger('approval_run_id').unsigned().nullable().index());
    await add(table, 'current_level', t => t.integer('current_level').nullable());
    await add(table, 'current_approver_role', t => t.string('current_approver_role', 100).nullable());
    await add(table, 'workflow_id', t => t.bigInteger('workflow_id').unsigned().nullable());
    await add(table, 'rejection_reason', t => t.text('rejection_reason').nullable());
    await add(table, 'company_id', t => t.bigInteger('company_id').unsigned().nullable());
    await db.raw('ALTER TABLE ?? MODIFY COLUMN current_approver_role VARCHAR(255) NULL', [table]);
    await db.raw('ALTER TABLE ?? MODIFY COLUMN employee_id BIGINT UNSIGNED NULL', [table]);
  }
  if (!(await db.schema.hasTable('expense_approval_runs'))) {
    await db.schema.createTable('expense_approval_runs', t => {
      t.bigIncrements('id');
      t.bigInteger('organization_id').unsigned().notNullable().index();
      t.bigInteger('company_id').unsigned().nullable();
      t.string('entity_type', 50).notNullable();
      t.bigInteger('entity_id').unsigned().notNullable();
      t.bigInteger('workflow_id').unsigned().notNullable();
      t.integer('workflow_version').notNullable();
      t.bigInteger('submitter_user_id').unsigned().notNullable();
      t.bigInteger('employee_id').unsigned().nullable();
      t.text('snapshot').notNullable();
      t.integer('current_step').notNullable().defaultTo(0);
      t.string('status', 30).notNullable().defaultTo('pending');
      t.timestamps(true, true);
      t.index(['organization_id', 'entity_type', 'entity_id'], 'expense_run_entity_idx');
    });
  }
  if (!(await db.schema.hasTable('expense_approval_events'))) {
    await db.schema.createTable('expense_approval_events', t => {
      t.bigIncrements('id');
      t.bigInteger('organization_id').unsigned().notNullable();
      t.bigInteger('run_id').unsigned().notNullable().index();
      t.integer('step_number').nullable();
      t.bigInteger('actor_user_id').unsigned().notNullable();
      t.string('action', 30).notNullable();
      t.text('comments').nullable();
      t.text('details').nullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }
  if (!(await db.schema.hasTable('expense_payments'))) {
    await db.schema.createTable('expense_payments', t => {
      t.bigIncrements('id');
      t.bigInteger('organization_id').unsigned().notNullable();
      t.bigInteger('run_id').unsigned().notNullable().unique();
      t.bigInteger('paid_by_user_id').unsigned().notNullable();
      t.decimal('amount', 15, 2).notNullable();
      t.decimal('advance_applied', 15, 2).notNullable().defaultTo(0);
      t.string('currency', 8).notNullable();
      t.date('payment_date').notNullable();
      t.string('method', 50).notNullable();
      t.string('reference', 150).notNullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
      t.index(['organization_id', 'payment_date']);
    });
  }
  await add('expense_payments', 'advance_applied', t => t.decimal('advance_applied', 15, 2).notNullable().defaultTo(0));
  // Preserve old configuration as explicit per-request-type definitions. No pending
  // request is migrated automatically and no new role exception is introduced.
  if (await db.schema.hasTable('expense_workflows')) {
    const old = await db('expense_workflows');
    for (const w of old) {
      const custodian = await db('users').where('organization_id', w.organization_id).whereNull('deleted_at').orderBy('id').first();
      if (!custodian) throw new Error('Cannot import expense workflow without an organization user');
      const levels = await db('expense_workflow_levels').where('workflow_id', w.id).orderBy('level_order');
      for (const type of ['expense_claim', 'travel_request', 'travel_advance', 'mileage_claim']) {
        const code = `legacy_expense_${w.id}_${type}`;
        if (await db('workflows').where({ organization_id: w.organization_id, workflow_code: code }).first()) continue;
        const known = levels.length > 0 && levels.every(l => ['team_lead', 'reporting_manager', 'department_head', 'finance', 'hr', 'ceo', 'manager'].includes(l.approver_type));
        const active = Boolean(w.is_active && known);
        const [id] = await db('workflows').insert({ uuid: randomUUID(), organization_id: w.organization_id, company_id: w.company_id,
          workflow_code: code, workflow_name: `${w.name} - ${type.replace(/_/g, ' ')}`, type, version_number: 1, created_by: custodian.id, updated_by: custodian.id,
          description: 'Automatically imported from legacy Expense Settings. Creator identifies the organization custodian, not an approval action. Review reporting-chain configuration.',
          status: active ? 'published' : 'draft', is_published: active, is_active: active, approval_pattern: 'sequential',
          applicability_filters: JSON.stringify({ departmentIds: w.department_id ? [w.department_id] : [], companyIds: w.company_id ? [w.company_id] : [] }),
          expense_config: JSON.stringify({ minAmount: Number(w.min_amount || 0), maxAmount: w.max_amount == null ? null : Number(w.max_amount), targetRole: w.target_role || 'all', priority: 0, importedFrom: w.id }),
        });
        for (const [i, l] of levels.entries()) {
          const resolver = l.approver_type === 'manager' ? 'manager_chain' : ['finance', 'hr', 'ceo'].includes(l.approver_type) ? 'role' : l.approver_type;
          await db('workflow_steps').insert({ uuid: randomUUID(), organization_id: w.organization_id, workflow_id: id, step_number: i + 1, created_by: custodian.id, updated_by: custodian.id,
            step_name: l.step_name || l.approver_role || `Approval ${i + 1}`, approval_mode: 'any_one_person',
            approver_type: resolver === 'role' ? 'user_role' : ['team_lead', 'manager_chain'].includes(resolver) ? 'reporting_manager' : resolver === 'department_head' ? 'department_head' : 'reporting_manager',
            resolver_config: JSON.stringify({ type: resolver, depth: resolver === 'manager_chain' ? 2 : 1, roleCode: l.approver_type, finance: l.approver_type === 'finance', canReturn: true }), is_final_step: i === levels.length - 1,
          });
        }
      }
    }
  }
}

export async function down() {
  // Preserve approval and payment evidence on rollback.
}
