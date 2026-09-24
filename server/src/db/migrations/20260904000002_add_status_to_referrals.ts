import type { Knex } from 'knex';

/**
 * Safely adds a `status` column to the referrals table if it does not already exist.
 * This aligns the schema with the service-layer insert which writes `status: 'submitted'`.
 */
export async function up(knex: Knex): Promise<void> {
  const hasStatus = await knex.schema.hasColumn('referrals', 'status');
  if (!hasStatus) {
    await knex.schema.alterTable('referrals', (table) => {
      table
        .enum('status', ['submitted', 'approved', 'hired', 'rejected', 'reward_paid'])
        .defaultTo('submitted')
        .nullable()
        .after('referral_reward_amount');
    });
    // Backfill existing rows: map referral_status to status
    await knex('referrals').where('referral_status', 'pending').update({ status: 'submitted' });
    await knex('referrals').where('referral_status', 'hired').update({ status: 'hired' });
    await knex('referrals').where('referral_status', 'rejected').update({ status: 'rejected' });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasStatus = await knex.schema.hasColumn('referrals', 'status');
  if (hasStatus) {
    await knex.schema.alterTable('referrals', (table) => {
      table.dropColumn('status');
    });
  }
}
