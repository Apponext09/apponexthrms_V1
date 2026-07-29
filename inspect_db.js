const knex = require('knex');
const config = require('./server/knexfile.js');

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment] || config.development);

async function inspect() {
  try {
    const users = await db('users').select('id', 'email', 'organization_id');
    const orgs = await db('organizations').select('id', 'name');
    const depts = await db('departments').select('id', 'name', 'organization_id');
    console.log('=== USERS ===\n', users);
    console.log('=== ORGANIZATIONS ===\n', orgs);
    console.log('=== DEPARTMENTS ===\n', depts);
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

inspect();
