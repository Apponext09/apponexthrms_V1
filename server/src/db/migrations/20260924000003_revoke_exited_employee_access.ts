import type { Knex } from 'knex';

/** Backfill accounts that were exited before lifecycle revocation was enforced. */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('employees')) || !(await knex.schema.hasTable('users'))) return;
  const exitedUsers = await knex('users as u')
    .join('employees as e', function () {
      this.on('u.employee_id', '=', 'e.id').andOn('u.organization_id', '=', 'e.organization_id');
    })
    .whereIn('e.status', ['exit', 'alumni', 'inactive'])
    .where('u.status', '!=', 'inactive')
    .pluck('u.id') as number[];
  if (!exitedUsers.length) return;

  await knex('users').whereIn('id', exitedUsers).update({ status: 'inactive', updated_at: new Date() });
  if (await knex.schema.hasTable('auth_sessions')) {
    await knex('auth_sessions').whereIn('user_id', exitedUsers).whereNull('revoked_at').update({
      revoked_at: new Date(), revoked_reason: 'employee_exit_backfill',
    });
  }
}

export async function down(): Promise<void> {
  // Never automatically restore credentials on rollback.
}
