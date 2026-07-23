import { initializeKnex } from './db/knex';

const db = initializeKnex();

async function run() {
  try {
    const hasTable = await db.schema.hasTable('department_managers');
    console.log('department_managers table exists:', hasTable);

    if (!hasTable) {
      console.log('Creating department_managers table...');
      await db.schema.createTable('department_managers', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('department_id').unsigned().notNullable();
        table.bigInteger('employee_id').unsigned().notNullable();
        table.enum('manager_type', ['department_manager', 'team_lead', 'hr_contact']).defaultTo('department_manager');
        table.boolean('is_primary').defaultTo(false);
        table.bigInteger('assigned_by').unsigned().nullable();
        table.timestamp('assigned_at').defaultTo(db.fn.now());

        table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
        table.foreign('department_id').references('id').inTable('departments').onDelete('CASCADE');
        table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');
      });
      console.log('✅ department_managers table created successfully');
    } else {
      const rows = await db('department_managers').select('*');
      console.log('Rows in department_managers:', rows);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
