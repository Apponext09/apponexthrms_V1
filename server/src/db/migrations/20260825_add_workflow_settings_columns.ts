import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasWorkflows = await knex.schema.hasTable('workflows');
  if (hasWorkflows) {
    await knex.schema.alterTable('workflows', (table) => {
      knex.schema.hasColumn('workflows', 'approval_type').then((exists) => {
        if (!exists) table.string('approval_type', 50).defaultTo('manual');
      });
      knex.schema.hasColumn('workflows', 'is_active').then((exists) => {
        if (!exists) table.boolean('is_active').defaultTo(true);
      });
      knex.schema.hasColumn('workflows', 'applicability_filters').then((exists) => {
        if (!exists) table.text('applicability_filters').nullable();
      });
    });
  }

  const hasSteps = await knex.schema.hasTable('workflow_steps');
  if (hasSteps) {
    await knex.schema.alterTable('workflow_steps', (table) => {
      knex.schema.hasColumn('workflow_steps', 'approver_department_id').then((exists) => {
        if (!exists) table.bigInteger('approver_department_id').unsigned().nullable();
      });
      knex.schema.hasColumn('workflow_steps', 'form_permissions').then((exists) => {
        if (!exists) table.text('form_permissions').nullable();
      });
      knex.schema.hasColumn('workflow_steps', 'escalation_config').then((exists) => {
        if (!exists) table.text('escalation_config').nullable();
      });
      knex.schema.hasColumn('workflow_steps', 'notification_config').then((exists) => {
        if (!exists) table.text('notification_config').nullable();
      });
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // no-op down for safety
}
