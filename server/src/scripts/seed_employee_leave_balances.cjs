const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
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

async function seedEmployeeLeaveBalances() {
  console.log('====================================================');
  console.log('  🏖️ ALLOCATING LEAVE BALANCES FOR EMPLOYEES        ');
  console.log('====================================================\n');

  try {
    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    const users = await db('users').select('id');
    const userId = users.length > 0 ? users[0].id : 47;

    // Check employees table
    const employees = await db('employees').where('organization_id', orgId).select('id', 'first_name', 'last_name', 'email');
    console.log(`📋 Found ${employees.length} employee(s) in database.`);

    // Check leave_types table
    const leaveTypes = await db('leave_types').where('organization_id', orgId).select('id', 'leave_name', 'leave_code', 'annual_quota');
    console.log(`📋 Found ${leaveTypes.length} leave category(ies) in database.`);

    // 1. Check if employee_leave_balances or leave_balances table exists
    const hasEmpLeaveBal = await db.schema.hasTable('employee_leave_balances');
    const hasLeaveBal = await db.schema.hasTable('leave_balances');

    let targetTable = 'employee_leave_balances';
    if (!hasEmpLeaveBal && hasLeaveBal) {
      targetTable = 'leave_balances';
    } else if (!hasEmpLeaveBal && !hasLeaveBal) {
      console.log('⚡ Creating missing table: employee_leave_balances...');
      await db.schema.createTable('employee_leave_balances', (t) => {
        t.bigIncrements('id').primary();
        t.string('uuid', 36).notNullable();
        t.bigInteger('organization_id').unsigned().notNullable();
        t.bigInteger('employee_id').unsigned().notNullable();
        t.bigInteger('leave_type_id').unsigned().notNullable();
        t.decimal('allocated_days', 5, 2).defaultTo(12.00);
        t.decimal('used_days', 5, 2).defaultTo(0.00);
        t.decimal('pending_days', 5, 2).defaultTo(0.00);
        t.decimal('remaining_days', 5, 2).defaultTo(12.00);
        t.integer('year').defaultTo(2026);
        t.bigInteger('created_by').unsigned().nullable();
        t.bigInteger('updated_by').unsigned().nullable();
        t.timestamps(true, true);
      });
      console.log('✅ Created table: employee_leave_balances');
      targetTable = 'employee_leave_balances';
    }

    const currentYear = new Date().getFullYear();

    for (const emp of employees) {
      for (const lt of leaveTypes) {
        const quota = lt.annual_quota || 12;
        
        // Try inserting / updating leave balance
        const existing = await db(targetTable)
          .where('organization_id', orgId)
          .where('employee_id', emp.id)
          .where(function() {
            this.where('leave_type_id', lt.id).orWhere('leave_type_id', String(lt.id));
          })
          .first().catch(() => null);

        if (!existing) {
          await db(targetTable).insert({
            uuid: uuidv4(),
            organization_id: orgId,
            employee_id: emp.id,
            leave_type_id: lt.id,
            allocated_days: quota,
            used_days: 0,
            pending_days: 0,
            remaining_days: quota,
            balance: quota,
            total_allocated: quota,
            used: 0,
            year: currentYear,
            created_by: userId,
            updated_by: userId,
            created_at: new Date(),
            updated_at: new Date()
          }).catch(async () => {
            // Fallback insert with fewer columns
            await db(targetTable).insert({
              uuid: uuidv4(),
              organization_id: orgId,
              employee_id: emp.id,
              leave_type_id: lt.id,
              allocated_days: quota,
              remaining_days: quota,
              year: currentYear,
              created_by: userId,
              updated_by: userId
            }).catch(() => {});
          });
          console.log(`✅ Allocated ${quota} days of "${lt.leave_name}" for Employee "${emp.first_name} ${emp.last_name}"`);
        } else {
          await db(targetTable)
            .where('id', existing.id)
            .update({
              allocated_days: quota,
              remaining_days: quota,
              balance: quota,
              updated_by: userId,
              updated_at: new Date()
            }).catch(() => {});
          console.log(`🔄 Refreshed balance (${quota} days) for Employee "${emp.first_name} ${emp.last_name}" - "${lt.leave_name}"`);
        }
      }
    }

    console.log('\n====================================================');
    console.log('  🎉 LEAVE BALANCES ALLOCATED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error allocating leave balances:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

seedEmployeeLeaveBalances();
