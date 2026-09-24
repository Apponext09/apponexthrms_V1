import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Table 1: ot_rules ─────────────────────────────────────────────────────
  const rulesExists = await knex.schema.hasTable('ot_rules');
  if (!rulesExists) {
    await knex.schema.createTable('ot_rules', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();

      // Identity
      table.string('rule_name', 255).notNullable();
      table.string('title_change', 255).nullable();

      // Period & shift type
      table.enum('period', ['daily', 'weekly']).defaultTo('daily');
      table.enum('shift_type', ['time_bound', 'flexible']).defaultTo('time_bound');

      // Limits
      table.decimal('daily_max_ot_limit', 6, 2).nullable();
      table.enum('daily_max_ot_limit_unit', ['minutes', 'hours']).defaultTo('hours');
      table.decimal('weekly_max_ot_limit', 6, 2).nullable();
      table.enum('weekly_max_ot_limit_unit', ['minutes', 'hours']).defaultTo('hours');
      // JSON array: ["holidays","weekends","normal_days"]
      table.text('max_limit_priority_json').nullable();

      // Auto Approve
      table.boolean('auto_ot_approve').defaultTo(false);
      table.integer('auto_approve_min_minutes').nullable();
      table.integer('auto_approve_max_minutes').nullable();

      // Formula
      table.boolean('ot_formula_enabled').defaultTo(false);
      table.text('ot_formula_expression').nullable();

      // Rounding
      table.string('employee_timing_rounding', 50).defaultTo('no_round');

      // Day-type configs (JSON)
      table.text('normal_day_config_json').nullable();
      table.text('holiday_config_json').nullable();
      table.text('weekend_config_json').nullable();

      table.boolean('is_active').defaultTo(true);

      table.bigInteger('created_by').unsigned().notNullable();
      table.bigInteger('updated_by').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.foreign('created_by').references('users.id');
      table.foreign('updated_by').references('users.id');

      table.index('organization_id');
      table.index('company_id');
      table.index('is_active');
    });
  } else {
    // Add any missing columns to pre-existing ot_rules table
    const columnsToEnsure = [
      { name: 'uuid', type: 'uuid' },
      { name: 'company_id', type: 'bigInteger' },
      { name: 'title_change', type: 'string' },
      { name: 'period', type: 'enum', values: ['daily', 'weekly'], default: 'daily' },
      { name: 'shift_type', type: 'enum', values: ['time_bound', 'flexible'], default: 'time_bound' },
      { name: 'daily_max_ot_limit', type: 'decimal' },
      { name: 'daily_max_ot_limit_unit', type: 'enum', values: ['minutes', 'hours'], default: 'hours' },
      { name: 'weekly_max_ot_limit', type: 'decimal' },
      { name: 'weekly_max_ot_limit_unit', type: 'enum', values: ['minutes', 'hours'], default: 'hours' },
      { name: 'max_limit_priority_json', type: 'text' },
      { name: 'auto_ot_approve', type: 'boolean', default: false },
      { name: 'auto_approve_min_minutes', type: 'integer' },
      { name: 'auto_approve_max_minutes', type: 'integer' },
      { name: 'ot_formula_enabled', type: 'boolean', default: false },
      { name: 'ot_formula_expression', type: 'text' },
      { name: 'employee_timing_rounding', type: 'enum', values: ['no_round', 'round', 'round_up', 'round_down'], default: 'no_round' },
      { name: 'normal_day_config_json', type: 'text' },
      { name: 'holiday_config_json', type: 'text' },
      { name: 'weekend_config_json', type: 'text' },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'deleted_at', type: 'timestamp' },
    ];

    for (const col of columnsToEnsure) {
      const exists = await knex.schema.hasColumn('ot_rules', col.name);
      if (!exists) {
        await knex.schema.alterTable('ot_rules', (table) => {
          if (col.type === 'uuid') table.uuid('uuid').nullable();
          else if (col.type === 'bigInteger') table.bigInteger(col.name).unsigned().nullable();
          else if (col.type === 'string') table.string(col.name, 255).nullable();
          else if (col.type === 'decimal') table.decimal(col.name, 6, 2).nullable();
          else if (col.type === 'integer') table.integer(col.name).nullable();
          else if (col.type === 'boolean') table.boolean(col.name).defaultTo(col.default as boolean);
          else if (col.type === 'text') table.text(col.name).nullable();
          else if (col.type === 'timestamp') table.timestamp(col.name).nullable();
          else if (col.type === 'enum') table.enum(col.name, col.values!).defaultTo(col.default as any);
        });
      }
    }
  }

  // ── Table 2: ot_rule_eligibility ──────────────────────────────────────────
  const eligExists = await knex.schema.hasTable('ot_rule_eligibility');
  if (!eligExists) {
    await knex.schema.createTable('ot_rule_eligibility', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('ot_rule_id').unsigned().notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.enum('entity_type', [
        'company_location',
        'department',
        'grade',
        'employee_type',
        'shift',
        'employee_status',
      ]).notNullable();
      table.bigInteger('entity_id').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.foreign('ot_rule_id').references('ot_rules.id').onDelete('CASCADE');
      table.unique(['ot_rule_id', 'entity_type', 'entity_id'], { indexName: 'uq_ot_rule_entity' });
      table.index('ot_rule_id');
      table.index('organization_id');
    });
  }

  // ── Alter: overtime_requests — add 4 new columns ──────────────────────────
  const hasAttendanceRecordId = await knex.schema.hasColumn('overtime_requests', 'attendance_record_id');
  if (!hasAttendanceRecordId) {
    await knex.schema.alterTable('overtime_requests', (table) => {
      table.bigInteger('attendance_record_id').unsigned().nullable().after('employee_id');
      table.integer('overtime_minutes').nullable().after('overtime_hours');
      table.enum('day_type', ['normal', 'holiday', 'weekend']).nullable().after('overtime_type');
      table.enum('source', ['manual', 'auto_checkout']).defaultTo('manual').after('day_type');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('overtime_requests', (table) => {
    table.dropColumn('attendance_record_id');
    table.dropColumn('overtime_minutes');
    table.dropColumn('day_type');
    table.dropColumn('source');
  });
  await knex.schema.dropTableIfExists('ot_rule_eligibility');
  await knex.schema.dropTableIfExists('ot_rules');
}
