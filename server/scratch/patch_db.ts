import { initializeKnex, getKnex } from '../src/db/knex.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  try {
    initializeKnex();
    const db = getKnex();

    // 1. Alter locations to add company_id if missing
    const hasCompanyId = await db.schema.hasColumn('locations', 'company_id');
    if (!hasCompanyId) {
      await db.schema.alterTable('locations', (table) => {
        table.integer('company_id').nullable();
      });
      console.log('✅ Added company_id column to locations table');
    } else {
      console.log('✓ locations already has company_id');
    }

    // 2. Create reimbursement_claims table if missing
    const hasReimbs = await db.schema.hasTable('reimbursement_claims');
    if (!hasReimbs) {
      await db.schema.createTable('reimbursement_claims', (table) => {
        table.bigIncrements('id').primary();
        table.uuid('uuid').notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('employee_id').unsigned().notNullable();
        table.string('claim_type', 100).notNullable();
        table.date('claim_date').notNullable();
        table.decimal('amount', 15, 2).notNullable();
        table.text('description').nullable();
        table.string('status', 50).notNullable().defaultTo('pending');
        table.bigInteger('approved_by').unsigned().nullable();
        table.timestamp('approved_at').nullable();
        table.text('remarks').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('✅ Created reimbursement_claims table');
    } else {
      console.log('✓ reimbursement_claims table already exists');
    }

    // 3. Fix department_managers table
    // Check if we need to recreate department_managers to match migration
    const hasDeptMgrs = await db.schema.hasTable('department_managers');
    if (hasDeptMgrs) {
      const hasEmployeeId = await db.schema.hasColumn('department_managers', 'employee_id');
      const hasManagerId = await db.schema.hasColumn('department_managers', 'manager_id');
      
      if (hasManagerId && !hasEmployeeId) {
        console.log('🔄 Re-creating department_managers to match required migration schema...');
        await db.schema.dropTable('department_managers');
        
        await db.schema.createTable('department_managers', (table) => {
          table.bigIncrements('id').primary();
          table.bigInteger('organization_id').unsigned().notNullable();
          table.bigInteger('department_id').unsigned().notNullable();
          table.bigInteger('employee_id').unsigned().notNullable();
          table.enum('manager_type', ['department_manager', 'team_lead', 'hr_contact']).notNullable().defaultTo('department_manager');
          table.boolean('is_primary').notNullable().defaultTo(false);
          table.bigInteger('assigned_by').unsigned().notNullable();
          table.timestamp('assigned_at').defaultTo(db.fn.now());
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.timestamp('updated_at').defaultTo(db.fn.now());
        });
        console.log('✅ Re-created department_managers table successfully');
      } else {
        console.log('✓ department_managers table already has employee_id');
      }
    } else {
      await db.schema.createTable('department_managers', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('department_id').unsigned().notNullable();
        table.bigInteger('employee_id').unsigned().notNullable();
        table.enum('manager_type', ['department_manager', 'team_lead', 'hr_contact']).notNullable().defaultTo('department_manager');
        table.boolean('is_primary').notNullable().defaultTo(false);
        table.bigInteger('assigned_by').unsigned().notNullable();
        table.timestamp('assigned_at').defaultTo(db.fn.now());
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('✅ Created department_managers table successfully');
    }

    console.log('🎉 Database patch complete!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Database patch failed:', err.message, err);
    process.exit(1);
  }
}

main();
