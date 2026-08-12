import { getKnex } from '../common/lib/knex';

async function dumpReferralsSchema() {
  const db = getKnex();
  try {
    const [cols] = await db.raw('SHOW COLUMNS FROM referrals');
    console.log('\n=== REFERRALS TABLE SCHEMA ===');
    for (const col of cols) {
      console.log(`${col.Field} | ${col.Type} | Null=${col.Null} | Key=${col.Key} | Default=${col.Default} | Extra=${col.Extra}`);
    }

    const [appCols] = await db.raw('SHOW COLUMNS FROM applications');
    console.log('\n=== APPLICATIONS TABLE SCHEMA ===');
    for (const col of appCols) {
      console.log(`${col.Field} | ${col.Type} | Null=${col.Null} | Key=${col.Key} | Default=${col.Default} | Extra=${col.Extra}`);
    }

    const [candCols] = await db.raw('SHOW COLUMNS FROM candidates');
    console.log('\n=== CANDIDATES TABLE SCHEMA ===');
    for (const col of candCols) {
      console.log(`${col.Field} | ${col.Type} | Null=${col.Null} | Key=${col.Key} | Default=${col.Default} | Extra=${col.Extra}`);
    }

    const [jobCols] = await db.raw('SHOW COLUMNS FROM jobs');
    console.log('\n=== JOBS TABLE SCHEMA ===');
    for (const col of jobCols) {
      console.log(`${col.Field} | ${col.Type} | Null=${col.Null} | Key=${col.Key} | Default=${col.Default} | Extra=${col.Extra}`);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await db.destroy();
  }
}

dumpReferralsSchema();
