import { getKnex } from '../db/knex';

export async function setupReportEngineTables() {
  const db = getKnex();
  console.log('🚀 Checking Report Engine database dependencies...');

  try {
    const hasTable = await db.schema.hasTable('report_templates');

    if (!hasTable) {
      console.log('⏳ Creating report_templates table...');
      await db.schema.createTable('report_templates', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('company_id').unsigned().nullable();
        table.bigInteger('created_by').unsigned().notNullable();
        table.string('name', 255).notNullable();
        table.text('description').nullable();
        table.string('module', 50).notNullable();
        table.text('selected_fields').notNullable();
        table.text('filters').notNullable();
        table.text('column_order').nullable();
        table.tinyint('is_shared').defaultTo(0);
        table.timestamps(true, true);
        table.timestamp('deleted_at').nullable();
        table.index(['organization_id']);
        table.index(['created_by']);
      });
      console.log('✅ Created table: report_templates');
    } else {
      console.log('ℹ️ Table report_templates already exists');
    }

    console.log('🎉 Report Engine setup completed successfully!');
  } catch (err: any) {
    console.error('❌ Failed to setup Report Engine tables:', err.message);
    throw err;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.includes('setup_report_engine_tables')) {
  setupReportEngineTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
