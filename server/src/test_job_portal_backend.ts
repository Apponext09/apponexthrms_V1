import { JobReferenceService } from './modules/recruitment/services/JobReferenceService';

async function test() {
  const service = new JobReferenceService();
  try {
    console.log('Testing getFilterData...');
    const filters = await service.getFilterData();
    console.log('Filters result:', JSON.stringify(filters, null, 2));

    console.log('Testing listOpenings...');
    const openings = await service.listOpenings();
    console.log('Openings result count:', openings.items.length);
    console.log('Openings items:', JSON.stringify(openings.items, null, 2));

    console.log('Testing getPublicJobData for MR-4...');
    const jobData = await service.getPublicJobData('MR-4');
    console.log('JobData MR-4:', JSON.stringify(jobData, null, 2));
  } catch (err) {
    console.error('Error running test:', err);
  }
  process.exit(0);
}

test();
