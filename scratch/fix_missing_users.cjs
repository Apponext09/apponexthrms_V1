require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });
const { hash } = require('argon2');
const { v4: uuidv4 } = require('uuid');

async function fixMissingUserAccounts() {
  console.log('--- SYNCING MISSING USER ACCOUNTS FOR EMPLOYEES ---');

  const employees = await k('employees').whereNull('deleted_at').select('*');
  const users = await k('users').select('*');

  const defaultPassword = 'Password@123';
  const hashedPassword = await hash(defaultPassword, { memoryCost: 65536, timeCost: 3 });

  let createdCount = 0;
  let unlockedCount = 0;

  // 1. Unlock locked accounts
  const lockedUsers = await k('users').whereNotNull('locked_until').where('locked_until', '>', new Date());
  for (const lu of lockedUsers) {
    await k('users').where('id', lu.id).update({ locked_until: null, failed_login_attempts: 0 });
    console.log(`✓ Unlocked user: ${lu.email}`);
    unlockedCount++;
  }

  // 2. Create user accounts for employees missing them
  for (const emp of employees) {
    if (!emp.email) continue;

    const existingUser = users.find(u => 
      u.employee_id === emp.id || 
      (u.email && u.email.toLowerCase() === emp.email.toLowerCase())
    );

    if (!existingUser) {
      const [userId] = await k('users').insert({
        uuid: uuidv4(),
        organization_id: emp.organization_id || 1,
        company_id: emp.company_id || null,
        employee_id: emp.id,
        email: emp.email.toLowerCase(),
        password_hash: hashedPassword,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Get or create employee role
      let empRole = await k('roles')
        .where('organization_id', emp.organization_id || 1)
        .where('code', 'employee')
        .first();

      if (!empRole) {
        const [roleId] = await k('roles').insert({
          uuid: uuidv4(),
          organization_id: emp.organization_id || 1,
          name: 'Employee',
          code: 'employee',
          description: 'Employee access',
          is_system: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
        empRole = { id: roleId };
      }

      await k('user_roles').insert({
        organization_id: emp.organization_id || 1,
        user_id: userId,
        role_id: empRole.id,
        assigned_by: userId,
        assigned_at: new Date(),
      });

      console.log(`✓ Created user account for employee: ${emp.first_name} ${emp.last_name} (${emp.email}) -> Default PW: ${defaultPassword}`);
      createdCount++;
    }
  }

  console.log(`\nSummary: Created ${createdCount} missing user accounts, unlocked ${unlockedCount} accounts.`);
  await k.destroy();
}

fixMissingUserAccounts().catch(e => { console.error('Error:', e); k.destroy(); });
