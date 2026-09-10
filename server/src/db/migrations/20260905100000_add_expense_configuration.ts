import type { Knex } from 'knex';

// Adds configurable (non-hardcoded) values to the Expense module:
//  - expense_settings: currency, number prefixes, default payment method,
//    default advance status, workflow fallback max amount, sequence digits
//  - expense_number_sequences: atomically-incremented nonce per number prefix
//  - expense_config_labels: overridable display labels (portal tags, status labels, etc.)
//
// Every new value is backfilled with the exact literal it replaces, so runtime
// behaviour is unchanged until an admin changes them.

export async function up(knex: Knex): Promise<void> {
  const hasSettings = await knex.schema.hasTable('expense_settings');

  if (hasSettings) {
    const addColumn = async (name: string, build: (t: any) => void) => {
      const exists = await knex.schema.hasColumn('expense_settings', name).catch(() => false);
      if (!exists) {
        await knex.schema.alterTable('expense_settings', (t) => build(t));
      }
    };

    await addColumn('currency_symbol', (t) => t.string('currency_symbol', 8).defaultTo('₹').notNullable());
    await addColumn('currency_code', (t) => t.string('currency_code', 8).defaultTo('INR').notNullable());
    await addColumn('currency_locale', (t) => t.string('currency_locale', 20).defaultTo('en-IN').notNullable());
    await addColumn('claim_number_prefix', (t) => t.string('claim_number_prefix', 10).defaultTo('EXP').notNullable());
    await addColumn('travel_request_number_prefix', (t) => t.string('travel_request_number_prefix', 10).defaultTo('TRV').notNullable());
    await addColumn('travel_advance_number_prefix', (t) => t.string('travel_advance_number_prefix', 10).defaultTo('ADV').notNullable());
    await addColumn('default_payment_method', (t) => t.string('default_payment_method', 50).defaultTo('bank_transfer').notNullable());
    await addColumn('default_advance_status', (t) => t.string('default_advance_status', 50).defaultTo('pending_finance').notNullable());
    await addColumn('workflow_fallback_max_amount', (t) => t.decimal('workflow_fallback_max_amount', 15, 2).defaultTo(10000000).notNullable());
    await addColumn('number_sequence_digits', (t) => t.integer('number_sequence_digits').notNullable().defaultTo(6));
  }

  const hasSequences = await knex.schema.hasTable('expense_number_sequences');
  if (!hasSequences) {
    await knex.schema.createTable('expense_number_sequences', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('seq_key', 50).notNullable();
      table.string('prefix', 20).nullable();
      table.bigInteger('current_value').notNullable().defaultTo(0);
      table.timestamps(true, true);
      table.unique(['organization_id', 'seq_key']);
      table.index(['organization_id']);
    });
  }

  const hasLabels = await knex.schema.hasTable('expense_config_labels');
  if (!hasLabels) {
    await knex.schema.createTable('expense_config_labels', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('label_key', 100).notNullable();
      table.string('label_value', 255).notNullable();
      table.timestamps(true, true);
      table.unique(['organization_id', 'label_key']);
      table.index(['organization_id']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('expense_config_labels');
  await knex.schema.dropTableIfExists('expense_number_sequences');
}
