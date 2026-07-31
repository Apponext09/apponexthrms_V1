import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env' });
dotenv.config({ path: '../.env' });

const config = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
  },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts',
  },
};

const connection = knex(config);

async function main() {
  try {
    console.log('Running all pending migrations...');
    const [batchNo, log] = await connection.migrate.latest();
    if (log.length === 0) {
      console.log('No pending migrations to run.');
    } else {
      console.log(`Successfully run ${log.length} migrations in batch ${batchNo}:`);
      console.log(log.join('\n'));
    }
  } finally {
    await connection.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
