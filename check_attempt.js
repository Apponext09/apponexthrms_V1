const { getKnex } = require('./server/src/db/knex');

(async () => {
  const db = getKnex();
  try {
    const attempt = await db('assessment_attempts').where('uuid', 'fa68f0b7-f78a-48f6-938b-32aca47012c4').first();
    console.log('--- Attempt row ---');
    console.log(attempt);
    if (attempt) {
      const assessmentId = attempt.assessment_id || attempt.assessmentId;
      const applicationId = attempt.application_id || attempt.applicationId;
      console.log(`assessmentId: ${assessmentId}, applicationId: ${applicationId}`);

      const assessment = await db('assessments').where('id', assessmentId).first();
      console.log('--- Assessment row ---');
      console.log(assessment);

      const application = await db('applications').where('id', applicationId).first();
      console.log('--- Application row ---');
      console.log(application);

      if (application) {
        const candidateId = application.candidate_id || application.candidateId;
        console.log(`candidateId: ${candidateId}`);
        const candidate = await db('candidates').where('id', candidateId).first();
        console.log('--- Candidate row ---');
        console.log(candidate);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
})();
