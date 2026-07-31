import { db } from '../db/knex';

async function run() {
  try {
    console.log('Fixing Privilege Leave encashment assignments for ALL organizations...');
    
    // 1. Get ALL Leave Type IDs for Privilege Leave (PL) across all orgs
    const plTypes = await db('leave_types').where('leave_code', 'PL');
    
    if (!plTypes || plTypes.length === 0) {
      console.log('Privilege Leave (PL) types not found');
      return;
    }

    const plTypeIds = plTypes.map(lt => lt.id);
    console.log(`Found PL Leave Type IDs: ${plTypeIds.join(', ')}`);

    // 2. Update assignments
    const result = await db('leave_policy_assignments')
      .whereIn('leave_type_id', plTypeIds)
      .update({
        encashment_enabled: 1,
        encashment_limit: 15
      });

    // 3. Also update the leave_types table so resolveOrCreateAssignment will default to 1 for new assignments
    await db('leave_types')
      .whereIn('id', plTypeIds)
      .update({
        encashment_enabled: 1,
        encashment_limit: 15
      });

    console.log(`Updated ${result} leave policy assignments to enable encashment for PL.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
