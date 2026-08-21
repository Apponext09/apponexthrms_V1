import { getKnex } from '../db/knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

async function main() {
  const db = getKnex();
  try {
    const logs = await db('resume_upload_logs').orderBy('created_at', 'desc').limit(10);
    console.log('=== RECENT RESUME UPLOAD LOGS ===');
    console.log(JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await db.destroy();
  }
}

main();
