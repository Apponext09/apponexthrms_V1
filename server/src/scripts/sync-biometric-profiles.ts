import { initializeKnex, closeKnex } from '../db/knex';
import { BiometricService } from '../modules/attendance/services/BiometricService';

async function main() {
  const organizationId = Number(process.argv[2]);
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    throw new Error('Usage: npm run biometric:sync --workspace=@apponexthrms/server -- <organizationId>');
  }

  initializeKnex();
  const result = await new BiometricService().syncExistingEmployeePhotos({
    organizationId,
    userId: 0,
    sessionUuid: 'biometric-profile-sync',
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeKnex());

