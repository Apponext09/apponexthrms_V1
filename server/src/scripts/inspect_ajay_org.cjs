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

async function inspectOrgAndUsers() {
  console.log("Inspecting organizations table for 'ajay@gmail.com':");
  const orgs = await knex('organizations')
    .whereRaw('LOWER(email) = ?', ['ajay@gmail.com'])
    .select('id', 'name', 'email', 'password_hash');
  console.log("Organizations match:", orgs);

  console.log("\nInspecting users table for 'ajay@gmail.com':");
  const users = await knex('users')
    .whereRaw('LOWER(email) = ?', ['ajay@gmail.com'])
    .select('id', 'email', 'password_hash', 'organization_id', 'status');
  console.log("Users match:", users);

  console.log("\nInspecting super_admins table for 'ajay@gmail.com':");
  const superAdmins = await knex('super_admins')
    .whereRaw('LOWER(email) = ?', ['ajay@gmail.com'])
    .select('id', 'email', 'password_hash', 'status');
  console.log("Super Admins match:", superAdmins);

  await knex.destroy();
}

inspectOrgAndUsers();
