import { runRecruitmentIntegrationTest } from './run_integration_tests';

async function main() {
  try {
    await runRecruitmentIntegrationTest();
    console.log('🏁 Integration test script finished.');
  } catch (err: any) {
    console.error('❌ Integration test failed:', err);
  } process.exit(0);
}

main();
