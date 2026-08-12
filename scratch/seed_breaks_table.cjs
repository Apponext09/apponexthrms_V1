require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });
const { v4: uuidv4 } = require('uuid');

async function ensureBreaksTableRows() {
  console.log('--- ENSURING BREAKS TABLE ROWS ---');

  const orgs = await k('organizations').select('id', 'name');
  console.log(`Found ${orgs.length} organizations.`);

  const sampleBreaks = [
    { name: 'Lunch Break', break_type: 'Manual', max_allow_time: '01:00', is_active: 'Yes' },
    { name: 'Tea Break', break_type: 'Manual', max_allow_time: '00:15', is_active: 'Yes' },
    { name: 'Personal Break', break_type: 'Manual', max_allow_time: '00:30', is_active: 'Yes' },
    { name: 'Prayer Break', break_type: 'Manual', max_allow_time: '00:20', is_active: 'Yes' },
  ];

  for (const org of orgs) {
    const existingBreaks = await k('breaks').where('organization_id', org.id).whereNull('deleted_at');
    console.log(`Org ID ${org.id} (${org.name}): ${existingBreaks.length} break rows in DB.`);

    for (const sb of sampleBreaks) {
      const exists = existingBreaks.some(b => b.name.toLowerCase().trim() === sb.name.toLowerCase().trim());
      if (!exists) {
        await k('breaks').insert({
          uuid: uuidv4(),
          organization_id: org.id,
          company_id: null,
          name: sb.name,
          break_type: sb.break_type,
          max_allow_time: sb.max_allow_time,
          is_active: sb.is_active,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  + Inserted break type row into 'breaks' table: "${sb.name}" for org ${org.id}`);
      }
    }
  }

  await k.destroy();
}

ensureBreaksTableRows().catch(e => { console.error(e); k.destroy(); });
