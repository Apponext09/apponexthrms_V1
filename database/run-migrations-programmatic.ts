import knex from 'knex';
import config from './knexfile';

const db = knex(config.development);

async function run() {
  console.log('🔄 Running latest migrations...');
  const [batchNo, log] = await db.migrate.latest({
    directory: './migrations',
  });
  if (log.length === 0) {
    console.log('Already up to date');
  } else {
    console.log(`✅ Batch ${batchNo} run: ${log.length} migrations`);
    console.log(log.join('\n'));
  }
}

run()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => db.destroy());
