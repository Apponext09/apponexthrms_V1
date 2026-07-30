import { initializeKnex, getKnex } from './src/db/knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function syncAllBalances() {
  initializeKnex();
  const db = getKnex();
  try {
    console.log('Fetching all leave balance records...');
    const balances = await db('leave_balances');
    
    console.log(`Found ${balances.length} balance records. Recalculating and syncing...`);
    
    for (const bal of balances) {
      // 1. Get sum of approved leaves for this employee and leave type
      const [approvedSum] = await db('leave_applications')
        .where({
          employee_id: bal.employeeId || bal.employee_id,
          leave_type_id: bal.leaveTypeId || bal.leave_type_id,
          status: 'approved'
        })
        .whereNull('deleted_at')
        .sum('total_days as total');
      
      const consumed = parseFloat(approvedSum?.total || 0);

      // 2. Get sum of pending leaves (submitted, pending, pending_manager, pending_hr, etc.)
      const [pendingSum] = await db('leave_applications')
        .where({
          employee_id: bal.employeeId || bal.employee_id,
          leave_type_id: bal.leaveTypeId || bal.leave_type_id
        })
        .whereIn('status', ['submitted', 'pending', 'pending_manager', 'pending_hr', 'pending_hr_override'])
        .whereNull('deleted_at')
        .sum('total_days as total');
      
      const pending = parseFloat(pendingSum?.total || 0);

      // 3. Recalculate available balance: opening + credited - consumed - pending
      const opening = parseFloat(bal.openingBalance || bal.opening_balance || 0);
      const credited = parseFloat(bal.creditedBalance || bal.credited_balance || 0);
      const available = Math.max(0, opening + credited - consumed - pending);

      console.log(`Syncing Employee ID ${bal.employeeId || bal.employee_id}, Leave Type ID ${bal.leaveTypeId || bal.leave_type_id}:`);
      console.log(`  - Opening: ${opening}`);
      console.log(`  - Consumed (Approved): ${consumed} (Old: ${bal.consumedBalance || bal.consumed_balance})`);
      console.log(`  - Pending (Submitted): ${pending} (Old: ${bal.pendingApprovalBalance || bal.pending_approval_balance})`);
      console.log(`  - Available (Calculated): ${available} (Old: ${bal.availableBalance || bal.available_balance})`);

      await db('leave_balances')
        .where('id', bal.id)
        .update({
          consumed_balance: consumed,
          pending_approval_balance: pending,
          available_balance: available,
          updated_at: new Date()
        });
    }
    console.log('All leave balances successfully recalculated and synced!');
  } catch (err) {
    console.error('Failed to sync balances:', err);
  } finally {
    process.exit(0);
  }
}

syncAllBalances();
