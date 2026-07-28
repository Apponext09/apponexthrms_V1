import mysql from 'mysql2/promise';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'apponexthrms'
    });

    console.log('Database Connected Successfully!');

    // Get all leave_balances
    const [bals] = await conn.execute('SELECT * FROM leave_balances');

    let updatedCount = 0;
    for (const b of bals) {
      const allocated = parseFloat(b.allocated_balance) || 0;
      const consumed = parseFloat(b.consumed_balance) || 0;
      const pending = parseFloat(b.pending_approval_balance) || 0;
      const calcAvailable = Math.max(0, allocated - consumed - pending);

      await conn.execute(
        'UPDATE leave_balances SET available_balance = ? WHERE id = ?',
        [calcAvailable, b.id]
      );
      updatedCount++;
    }

    console.log(`Synced available_balance for ${updatedCount} leave balance records!`);

    await conn.end();
  } catch (err) {
    console.error('Error syncing leave balances:', err);
  }
})();
