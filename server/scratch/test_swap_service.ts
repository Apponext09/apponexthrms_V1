import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import Knex from 'knex';
import { ShiftService } from '../src/modules/attendance/services/ShiftService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const db = Knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

// Configure Knex casing hook to match server behavior
const postProcessResponse = (result: any) => {
  if (!result) return result;
  if (Array.isArray(result)) {
    return result.map(row => postProcessRow(row));
  }
  return postProcessRow(result);
};

const postProcessRow = (row: any) => {
  if (typeof row !== 'object' || row === null) return row;
  const processed: any = {};
  for (const key of Object.keys(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    processed[camelKey] = row[key];
  }
  return processed;
};

// Override Knex instance postProcessResponse
(db as any).userParams = {};
db.on('query-response', (response, obj, builder) => {
  if (builder.client.config.postProcessResponse) {
    // Already handled by client config if set
  }
});

// Set up mock context
const ctx = {
  organizationId: 3,
  userId: 14 // User ID for narendragaikwad1419@gmail.com
};

const shiftService = new ShiftService();

(async () => {
  try {
    console.log('🚀 Invoking requestShiftSwap directly via service for employee 47 on 2026-07-01...');
    
    // We pass the db to repositories using the server configuration or manually mocking the repository db.
    // Actually, repositories read db from the global connection or from BaseRepository which uses Knex.
    // Let's check how BaseRepository imports Knex db:
    // In BaseRepository, it uses `import { db } from '../../db';` or similar.
    // So the repos will automatically use the active server database connection.
    
    const result = await shiftService.requestShiftSwap(ctx, 47, {
      requestShiftDate: '2026-07-01',
      requestedShiftId: 34,
      swapWithEmployeeId: 2, // John Doe
      swapShiftDate: '2026-07-01',
      reason: 'Direct service testing'
    });
    
    console.log('✅ Success! Result:', result);
  } catch (err: any) {
    console.error('❌ Service Error occurred:', err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    await db.destroy();
    process.exit(0);
  }
})();
