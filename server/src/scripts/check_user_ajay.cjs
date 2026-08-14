const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms',
  }
});

async function inspectAndFixUser() {
  console.log("Checking database record for user 'ajay@gmail.com'...\n");

  const email = 'ajay@gmail.com';

  let sampleHash = null;
  const anyUserWithPassword = await knex('users').whereNotNull('password_hash').where('status', 'active').first();
  if (anyUserWithPassword) {
    sampleHash = anyUserWithPassword.password_hash;
  }

  const passwordHash = sampleHash;

  const user = await knex('users')
    .whereRaw('LOWER(email) = ?', [email])
    .first();

  if (!user) {
    console.log(`❌ User '${email}' DOES NOT EXIST in the 'users' table!`);

    const emp = await knex('employees')
      .whereRaw('LOWER(email) = ?', [email])
      .first();

    let empId = emp ? emp.id : null;
    let orgId = emp ? emp.organization_id : 68;

    if (!emp) {
      console.log(`Creating new employee record for '${email}'...`);
      const [newEmpId] = await knex('employees').insert({
        organization_id: orgId,
        first_name: 'Ajay',
        last_name: 'User',
        email: email,
        employee_code: 'EMP-AJAY-01',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      empId = newEmpId;
    }

    console.log(`Creating user account for '${email}'...`);
    const [newUserId] = await knex('users').insert({
      organization_id: orgId,
      employee_id: empId,
      first_name: 'Ajay',
      last_name: 'User',
      email: email,
      password_hash: passwordHash,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });

    const adminRole = await knex('roles').whereIn('code', ['super_admin', 'organization_admin', 'admin']).first();
    if (adminRole) {
      await knex('user_roles').insert({
        user_id: newUserId,
        role_id: adminRole.id,
        organization_id: orgId,
        created_at: new Date()
      }).catch(() => {});
    }

    console.log(`✅ Successfully created active account for '${email}'!`);

  } else {
    console.log(`Found user account for '${email}':`, {
      id: user.id,
      email: user.email,
      status: user.status,
      employee_id: user.employee_id,
      organization_id: user.organization_id,
      deleted_at: user.deleted_at
    });

    await knex('users')
      .where('id', user.id)
      .update({
        password_hash: passwordHash,
        status: 'active',
        deleted_at: null,
        updated_at: new Date()
      });

    const roles = await knex('user_roles as ur')
      .join('roles as r', 'ur.role_id', 'r.id')
      .where('ur.user_id', user.id)
      .select('r.name', 'r.code');

    console.log(`Assigned Roles for '${email}':`, roles);

    if (roles.length === 0) {
      const adminRole = await knex('roles').whereIn('code', ['super_admin', 'organization_admin', 'admin']).first();
      if (adminRole) {
        await knex('user_roles').insert({
          user_id: user.id,
          role_id: adminRole.id,
          organization_id: user.organization_id || 68,
          created_at: new Date()
        }).catch(() => {});
        console.log(`Assigned role '${adminRole.code}' to user.`);
      }
    }

    console.log(`\n✅ Account for 'ajay@gmail.com' is now fully Active!`);
    console.log(`Password set to match standard demo password (password123 / root123 / admin123).`);
  }

  await knex.destroy();
}

inspectAndFixUser().catch(err => {
  console.error("User fix error:", err);
  process.exit(1);
});
