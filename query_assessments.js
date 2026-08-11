const { getKnex } = require('./server/src/db/knex');

(async () => {
  const db = getKnex();
  try {
    const assessments = await db('assessments').select('*');
    console.log('--- Assessments list in DB ---');
    console.log(JSON.stringify(assessments, null, 2));
  } catch (error) {
    console.error('Error fetching assessments:', error);
  } finally {
    process.exit(0);
  }
})();
