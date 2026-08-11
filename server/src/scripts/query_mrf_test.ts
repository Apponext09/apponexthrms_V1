import { getKnex } from '../db/knex';

async function testQuery() {
  const db = getKnex();
  try {
    const mrfs = await db('mrf_requests').select('id', 'mr_number', 'requested_by').limit(5);
    console.log('--- mrf_requests sample ---');
    console.log(mrfs);

    const users = await db('users').select('id', 'first_name', 'last_name', 'employee_id').limit(10);
    console.log('--- users sample ---');
    console.log(users);

    const employees = await db('employees').select('id', 'first_name', 'last_name').limit(10);
    console.log('--- employees sample ---');
    console.log(employees);

    // Test the first join style: matching directly to employees
    const firstJoin = await db('mrf_requests')
      .leftJoin('employees as requester', 'mrf_requests.requested_by', 'requester.id')
      .select([
        'mrf_requests.id',
        'mrf_requests.mr_number',
        'mrf_requests.requested_by as requested_by_id',
        db.raw("CONCAT(requester.first_name, ' ', COALESCE(requester.last_name, '')) as requested_by_name")
      ])
      .limit(5);
    console.log('--- direct employees join ---');
    console.log(firstJoin);

    // Test the second join style: users -> employees
    const secondJoin = await db('mrf_requests')
      .leftJoin('users as requester_user', 'mrf_requests.requested_by', 'requester_user.id')
      .leftJoin('employees as requester', 'requester_user.employee_id', 'requester.id')
      .select([
        'mrf_requests.id',
        'mrf_requests.mr_number',
        'mrf_requests.requested_by as requested_by_id',
        db.raw("CONCAT(COALESCE(requester.first_name, requester_user.first_name), ' ', COALESCE(requester.last_name, requester_user.last_name, '')) as requested_by_name")
      ])
      .limit(5);
    console.log('--- users -> employees join ---');
    console.log(secondJoin);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

testQuery();
