import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('workflow_approvals'))) {
    await knex.schema.createTable('workflow_approvals', (table) => {
      table.increments('id').primary();
      table.uuid('uuid').defaultTo(knex.raw('(UUID())')).unique().notNullable();
      table.integer('organization_id').notNullable();
      
      table.string('module_type').notNullable(); // 'Leave', 'Asset', 'Shift Swap', 'Loan'
      table.integer('reference_id').notNullable(); // ID of the original request
      
      table.integer('applicant_id').notNullable(); // Employee who requested
      
      table.string('approver_role'); // 'Manager', 'Team Lead', 'HR', 'Employee'
      table.integer('approver_id'); // Specific approver if any
      
      table.string('status').notNullable().defaultTo('Pending'); // 'Pending', 'Approved', 'Rejected', 'Escalated'
      table.jsonb('details'); // Summary JSON of the request (e.g. { name: 'Arjun Mehta', type: 'Leave', time: '2 hours ago', department: 'Engineering' })
      
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at');
      
      // Foreign keys omitted to avoid compatibility issues with existing schema
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_approvals');
}
