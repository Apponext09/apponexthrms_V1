import { runRecruitmentIntegrationTest } from './src/scripts/run_integration_tests';
import { initializeKnex } from './src/db/knex';

initializeKnex();
runRecruitmentIntegrationTest().then(() => {
  console.log('Test completed.');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
