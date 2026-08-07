import { getKnex } from './server/src/db/knex';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

async function inspectCompanyData() {
  const db = getKnex();

  console.log('\n🏢 Companies in DB:');
  const companies = await db('company').select('company_id', 'name', 'is_parent', 'organization_id');
  console.table(companies);

  console.log('\n👥 Employees grouped by company_id & organization_id:');
  const empCounts = await db('employees')
    .select('organization_id', 'company_id')
    .count('* as total')
    .groupBy('organization_id', 'company_id');
  console.table(empCounts);

  console.log('\n🏛️ Departments grouped by company_id & organization_id:');
  const deptCounts = await db('departments')
    .select('organization_id', 'company_id')
    .count('* as total')
    .groupBy('organization_id', 'company_id');
  console.table(deptCounts);

  console.log('\n📍 Locations grouped by company_id & organization_id:');
  if (await db.schema.hasTable('locations')) {
    const locCounts = await db('locations')
      .select('organization_id', 'company_id')
      .count('* as total')
      .groupBy('organization_id', 'company_id');
    console.table(locCounts);
  }

  await db.destroy();
}

inspectCompanyData();
