import { getKnex } from './src/db/knex';

async function migrate() {
  const db = getKnex();

  // Find all employees
  const employees = await db('employees').whereNull('deleted_at');
  console.log(`Found ${employees.length} employees to verify.`);

  for (const emp of employees) {
    const orgId = emp.organizationId || emp.organization_id;
    if (!orgId) continue;

    // Get all leave types for this organization
    const orgLeaveTypes = await db('leave_types')
      .where('organization_id', orgId)
      .whereNull('deleted_at');

    if (orgLeaveTypes.length === 0) {
      continue;
    }

    // For each custom leave type in this organization
    for (const lt of orgLeaveTypes) {
      const code = lt.leaveCode || lt.leave_code;
      if (!code) continue;

      // Find wrong leave types with the same code (belonging to another organization)
      const wrongTypes = await db('leave_types')
        .where('leave_code', code)
        .whereNot('id', lt.id);

      const wrongTypeIds = wrongTypes.map(w => w.id);
      if (wrongTypeIds.length === 0) continue;

      // --- POLICY ASSIGNMENTS ---
      const correctAssignExists = await db('leave_policy_assignments')
        .where({ employee_id: emp.id, leave_type_id: lt.id })
        .first();

      if (correctAssignExists) {
        const deleted = await db('leave_policy_assignments')
          .where('employee_id', emp.id)
          .whereIn('leave_type_id', wrongTypeIds)
          .delete();
        if (deleted > 0) {
          console.log(`Deleted ${deleted} duplicate wrong policy assignments for Employee ${emp.id}`);
        }
      } else {
        const wrongAssigns = await db('leave_policy_assignments')
          .where('employee_id', emp.id)
          .whereIn('leave_type_id', wrongTypeIds);
        
        if (wrongAssigns.length > 0) {
          await db('leave_policy_assignments')
            .where('id', wrongAssigns[0].id)
            .update({ leave_type_id: lt.id });
          console.log(`Updated policy assignment ID ${wrongAssigns[0].id} for Employee ${emp.id} to correct leave_type_id ${lt.id} (${code})`);
          
          if (wrongAssigns.length > 1) {
            const restIds = wrongAssigns.slice(1).map(w => w.id);
            await db('leave_policy_assignments').whereIn('id', restIds).delete();
          }
        }
      }

      // --- BALANCES ---
      const correctBalExists = await db('leave_balances')
        .where({ employee_id: emp.id, leave_type_id: lt.id })
        .first();

      if (correctBalExists) {
        const deleted = await db('leave_balances')
          .where('employee_id', emp.id)
          .whereIn('leave_type_id', wrongTypeIds)
          .delete();
        if (deleted > 0) {
          console.log(`Deleted ${deleted} duplicate wrong balances for Employee ${emp.id}`);
        }
      } else {
        const wrongBals = await db('leave_balances')
          .where('employee_id', emp.id)
          .whereIn('leave_type_id', wrongTypeIds);

        if (wrongBals.length > 0) {
          await db('leave_balances')
            .where('id', wrongBals[0].id)
            .update({ leave_type_id: lt.id });
          console.log(`Updated balance ID ${wrongBals[0].id} for Employee ${emp.id} to correct leave_type_id ${lt.id} (${code})`);

          if (wrongBals.length > 1) {
            const restIds = wrongBals.slice(1).map(w => w.id);
            await db('leave_balances').whereIn('id', restIds).delete();
          }
        }
      }
    }
  }

  console.log('Migration completed successfully.');
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
