import { initializeKnex } from './db/knex';

const db = initializeKnex();

async function main() {
  console.log('=== SYNCING ORGANIZATION IDS ===');

  // Update primary organization to "Apponext HRMS"
  await db('organizations').where('id', 3).update({
    name: 'Apponext HRMS',
    slug: 'apponext-hrms',
  });

  // Sync users to Organization 3
  const updatedUsers = await db('users')
    .whereIn('email', [
      'admin@apponexthrms.com',
      'hr@apponexthrms.com',
      'employee@apponexthrms.com',
      'admin@apponext.com',
      'hr@apponext.com',
      'employee@apponext.com',
      'superadmin@apponext.com',
    ])
    .update({ organization_id: 3 });

  console.log(`Updated ${updatedUsers} user accounts to Organization 3 (Apponext HRMS)`);

  // Sync any orphaned employees in Org 1 or Org 2 to Org 3
  const updatedEmps = await db('employees')
    .whereIn('organization_id', [1, 2])
    .update({ organization_id: 3 });

  console.log(`Updated ${updatedEmps} employee records to Organization 3`);

  // Check counts
  const empCount = await db('employees').where('organization_id', 3).count('id as total').first();
  console.log(`Total Employees in Organization 3: ${(empCount as any)?.total}`);

  await db.destroy();
}

main().catch(console.error);
