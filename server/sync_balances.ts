import { getKnex } from './src/db/knex';

async function sync() {
  const db = getKnex();

  // Fetch all active leave balances
  const balances = await db('leave_balances as lb')
    .join('leave_types as lt', 'lt.id', 'lb.leave_type_id')
    .select('lb.id', 'lb.employee_id', 'lb.leave_type_id', 'lb.consumed_balance', 'lt.annual_quota', 'lt.leave_code');

  console.log(`Found ${balances.length} balance records to sync.`);

  for (const bal of balances) {
    // Knex postProcessResponse converts snake_case to camelCase
    const quota = (bal as any).annualQuota ?? (bal as any).annual_quota ?? 0;
    const consumed = parseFloat((bal as any).consumedBalance ?? bal.consumed_balance ?? 0) || 0;
    const leaveCode = (bal as any).leaveCode ?? (bal as any).leave_code;
    const newAvailable = quota - consumed;

    await db('leave_balances')
      .where('id', bal.id)
      .update({
        opening_balance: quota,
        available_balance: newAvailable
      });
    console.log(`Synced balance ID ${bal.id} (Type: ${leaveCode}): Opening set to ${quota}, Consumed: ${consumed}, Available: ${newAvailable}`);
  }

  console.log('Synchronization completed.');
  process.exit(0);
}

sync().catch(err => {
  console.error(err);
  process.exit(1);
});
