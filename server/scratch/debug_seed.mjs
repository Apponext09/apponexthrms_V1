import { initializeKnex, getKnex, closeKnex } from '../src/db/knex';

(async () => {
  try {
    initializeKnex();
    const db = getKnex();

    const ctx = { organizationId: 3, userId: 3 };

    const assignment = await db('employee_shift_assignments')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', 1)
      .where('is_current', true)
      .first();
    console.log('Assignment:', assignment);

    if (assignment) {
      const shift = await db('shift_templates')
        .where('organization_id', ctx.organizationId)
        .where('id', assignment.shiftId || assignment.shift_id)
        .first();
      console.log('Shift Template:', shift);
    }

    await closeKnex();
  } catch (err) {
    console.error('Error:', err);
  }
})();
