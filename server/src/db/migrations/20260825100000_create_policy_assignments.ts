import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create policy_assignments table if it does not exist
  const hasPolicyAssignments = await knex.schema.hasTable('policy_assignments');
  if (!hasPolicyAssignments) {
    await knex.schema.createTable('policy_assignments', (table) => {
      table.increments('id').primary();
      table.bigInteger('policy_id').unsigned().notNullable();
      table.string('role_code', 100).notNullable();
      table.bigInteger('organization_id').unsigned().nullable();
      table.timestamps(true, true);

      table.index(['policy_id', 'role_code']);
      table.index(['role_code', 'organization_id']);
    });
  }

  // 2. Populate policy_assignments from existing role_policies
  const hasRolePolicies = await knex.schema.hasTable('role_policies');
  if (hasRolePolicies) {
    const existingPolicies = await knex('role_policies').select('id', 'role_code', 'organization_id');
    for (const policy of existingPolicies) {
      if (!policy.role_code) continue;

      const assignmentExists = await knex('policy_assignments')
        .where({
          policy_id: policy.id,
          role_code: policy.role_code,
        })
        .first();

      if (!assignmentExists) {
        await knex('policy_assignments').insert({
          policy_id: policy.id,
          role_code: policy.role_code,
          organization_id: policy.organization_id || null,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        });
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('policy_assignments');
}
