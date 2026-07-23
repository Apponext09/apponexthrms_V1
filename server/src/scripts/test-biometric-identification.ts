import axios from 'axios';
import { db, initializeKnex, closeKnex } from '../db/knex';

async function main() {
  const organizationId = Number(process.argv[2]);
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    throw new Error(
      'Usage: npm run biometric:test-identification --workspace=@apponexthrms/server -- <organizationId>'
    );
  }

  initializeKnex();
  const profiles = await db('employee_biometric_profiles')
    .select(
      'employee_id',
      'employee_name',
      'face_vector',
      'embedding_model',
      'profile_photo'
    )
    .where({
      organization_id: organizationId,
      is_active: true,
      embedding_model: 'dlib_resnet_v1_128',
    });
  const candidates = profiles.map((profile: any) => ({
    employee_id: String(profile.employeeId),
    employee_name: profile.employeeName,
    face_vector:
      typeof profile.faceVector === 'string'
        ? JSON.parse(profile.faceVector)
        : profile.faceVector,
    model_version: profile.embeddingModel,
  }));

  for (const profile of profiles as any[]) {
    const response = await axios.post(
      `${process.env.BIOMETRIC_SERVICE_URL || 'http://127.0.0.1:8000'}/v1/faces/identify`,
      {
        image: profile.profilePhoto,
        candidates,
      },
      {
        headers: process.env.BIOMETRIC_SERVICE_API_KEY
          ? { 'X-Biometric-Key': process.env.BIOMETRIC_SERVICE_API_KEY }
          : {},
        timeout: 30000,
      }
    );
    const result = response.data;
    console.log({
      expectedEmployeeId: String(profile.employeeId),
      identifiedEmployeeId: result.employee_id,
      employeeName: result.employee_name,
      matched: result.matched,
      distance: result.distance,
      separation: result.separation,
      matchScore: result.match_score,
    });
    if (!result.matched || String(result.employee_id) !== String(profile.employeeId)) {
      throw new Error(`Identification assertion failed for ${profile.employeeName}.`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeKnex());

