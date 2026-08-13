const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function checkTables() {
  const hasEmpTypes = await db.schema.hasTable('employee_types');
  const hasEmploymentTypes = await db.schema.hasTable('employment_types');
  console.log('hasTable(employee_types):', hasEmpTypes);
  console.log('hasTable(employment_types):', hasEmploymentTypes);

  if (!hasEmpTypes) {
    console.log('⚡ Creating missing table: employee_types...');
    await db.schema.createTable('employee_types', (t) => {
      t.bigIncrements('id').primary();
      t.string('uuid', 36).notNullable();
      t.bigInteger('organization_id').unsigned().notNullable();
      t.bigInteger('company_id').unsigned().nullable();
      t.string('name', 100).notNullable();
      t.enum('status', ['active', 'inactive']).defaultTo('active');
      t.bigInteger('created_by').unsigned().nullable();
      t.bigInteger('updated_by').unsigned().nullable();
      t.timestamps(true, true);
      t.timestamp('deleted_at').nullable();
    });
    console.log('✅ Created table: employee_types');

    // Seed default employee types
    const orgs = await db('organizations').select('id');
    for (const org of orgs) {
      await db('employee_types').insert([
        { uuid: 'et-1', organization_id: org.id, name: 'Full Time', status: 'active' },
        { uuid: 'et-2', organization_id: org.id, name: 'Part Time', status: 'active' },
        { uuid: 'et-3', organization_id: org.id, name: 'Contractual', status: 'active' },
        { uuid: 'et-4', organization_id: org.id, name: 'Intern', status: 'active' },
        { uuid: 'et-5', organization_id: org.id, name: 'Probation', status: 'active' },
      ]).catch(() => {});
    }
    console.log('✅ Seeded default employee types!');
  }

  if (!hasEmploymentTypes) {
    console.log('⚡ Creating missing table alias: employment_types...');
    await db.schema.createTable('employment_types', (t) => {
      t.bigIncrements('id').primary();
      t.string('uuid', 36).notNullable();
      t.bigInteger('organization_id').unsigned().notNullable();
      t.bigInteger('company_id').unsigned().nullable();
      t.string('name', 100).notNullable();
      t.enum('status', ['active', 'inactive']).defaultTo('active');
      t.bigInteger('created_by').unsigned().nullable();
      t.bigInteger('updated_by').unsigned().nullable();
      t.timestamps(true, true);
      t.timestamp('deleted_at').nullable();
    });
    console.log('✅ Created table: employment_types');
  }

  await db.destroy();
  process.exit(0);
}

checkTables();
