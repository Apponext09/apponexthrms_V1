const { initializeKnex } = require('./server/src/db/knex');
const knex = initializeKnex();

async function run() {
  try {
    const app = await knex('applications').where('id', 51).first();
    console.log('App:', app);
    if (app) {
       const candidate = await knex('candidates').where('id', app.candidateId || app.candidate_id).first();
       console.log('Candidate:', candidate);
    }
  } catch (e) {
    console.error(e);
  } finally {
    knex.destroy();
  }
}
run();
