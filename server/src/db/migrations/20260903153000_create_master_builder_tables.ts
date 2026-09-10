import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create custom_masters table
  const hasCustomMasters = await knex.schema.hasTable('custom_masters');
  if (!hasCustomMasters) {
    await knex.schema.createTable('custom_masters', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('uuid', 36).nullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.string('name', 150).notNullable();
      table.string('plural_name', 150).nullable();
      table.string('code', 100).notNullable();
      table.text('description').nullable();
      table.string('icon', 50).defaultTo('Layers');
      table.string('employee_linkage', 100).defaultTo('none');
      table.boolean('has_hierarchy').defaultTo(false);
      table.boolean('has_history').defaultTo(false);
      table.string('status', 20).defaultTo('Active');
      table.boolean('is_system').defaultTo(false);
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.index(['organization_id', 'code'], 'cm_org_code_idx');
      table.index(['organization_id', 'status'], 'cm_org_status_idx');
    });
  }

  // 2. Create custom_master_choice_lists table
  const hasChoiceLists = await knex.schema.hasTable('custom_master_choice_lists');
  if (!hasChoiceLists) {
    await knex.schema.createTable('custom_master_choice_lists', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('uuid', 36).nullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 150).notNullable();
      table.string('code', 100).notNullable();
      table.text('description').nullable();
      table.json('options_json').nullable();
      table.string('status', 20).defaultTo('Active');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.index(['organization_id', 'code'], 'cmcl_org_code_idx');
    });
  }

  // 3. Create custom_master_fields table
  const hasFields = await knex.schema.hasTable('custom_master_fields');
  if (!hasFields) {
    await knex.schema.createTable('custom_master_fields', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('uuid', 36).nullable();
      table.bigInteger('master_id').unsigned().notNullable();
      table.string('field_name', 150).notNullable();
      table.string('field_key', 100).notNullable();
      table.string('field_type', 50).notNullable().defaultTo('text');
      table.boolean('is_required').defaultTo(false);
      table.boolean('is_unique').defaultTo(false);
      table.boolean('show_in_table').defaultTo(true);
      table.boolean('is_active').defaultTo(true);
      table.string('help_text', 255).nullable();
      table.string('placeholder', 255).nullable();
      table.string('default_value', 255).nullable();
      table.bigInteger('lookup_master_id').unsigned().nullable();
      table.bigInteger('choice_list_id').unsigned().nullable();
      table.json('options_json').nullable();
      table.json('validation_rules').nullable();
      table.integer('display_order').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('master_id').references('custom_masters.id').onDelete('CASCADE');
      table.index(['master_id', 'field_key'], 'cmf_master_key_idx');
      table.index(['master_id', 'display_order'], 'cmf_master_order_idx');
    });
  }

  // 4. Create custom_master_validation_rules table
  const hasRules = await knex.schema.hasTable('custom_master_validation_rules');
  if (!hasRules) {
    await knex.schema.createTable('custom_master_validation_rules', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('uuid', 36).nullable();
      table.bigInteger('master_id').unsigned().notNullable();
      table.string('rule_name', 150).notNullable();
      table.string('field_a', 100).notNullable();
      table.string('operator', 50).notNullable();
      table.string('field_b', 100).nullable();
      table.string('custom_value', 255).nullable();
      table.string('error_message', 255).nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('master_id').references('custom_masters.id').onDelete('CASCADE');
      table.index(['master_id'], 'cmvr_master_idx');
    });
  }

  // 5. Create custom_master_autofill_mappings table
  const hasAutofill = await knex.schema.hasTable('custom_master_autofill_mappings');
  if (!hasAutofill) {
    await knex.schema.createTable('custom_master_autofill_mappings', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('uuid', 36).nullable();
      table.bigInteger('master_id').unsigned().notNullable();
      table.string('lookup_field_key', 100).notNullable();
      table.string('source_field_key', 100).notNullable();
      table.string('target_field_key', 100).notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('master_id').references('custom_masters.id').onDelete('CASCADE');
      table.index(['master_id'], 'cmam_master_idx');
    });
  }

  // 6. Create custom_master_records table
  const hasRecords = await knex.schema.hasTable('custom_master_records');
  if (!hasRecords) {
    await knex.schema.createTable('custom_master_records', (table) => {
      table.bigIncrements('id').unsigned().primary();
      table.string('uuid', 36).nullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.bigInteger('master_id').unsigned().notNullable();
      table.string('record_code', 100).nullable();
      table.json('data').notNullable();
      table.string('status', 20).defaultTo('Active');
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('master_id').references('custom_masters.id').onDelete('CASCADE');
      table.index(['organization_id', 'master_id'], 'cmr_org_master_idx');
      table.index(['master_id', 'status'], 'cmr_master_status_idx');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('custom_master_records');
  await knex.schema.dropTableIfExists('custom_master_autofill_mappings');
  await knex.schema.dropTableIfExists('custom_master_validation_rules');
  await knex.schema.dropTableIfExists('custom_master_fields');
  await knex.schema.dropTableIfExists('custom_master_choice_lists');
  await knex.schema.dropTableIfExists('custom_masters');
}
