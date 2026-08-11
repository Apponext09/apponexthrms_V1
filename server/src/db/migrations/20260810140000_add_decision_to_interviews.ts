import { Knex } from 'knex';

/**
 * Migration: Add decision and decision_notes to interviews table
 * 
 * Stores recruiter interview outcomes ('advance', 'reject', 'hold')
 * and review notes directly on the interview record.
 */
export async function up(knex: Knex): Promise<void> {
  const hasInterviews = await knex.schema.hasTable('interviews');
  if (hasInterviews) {
    const hasDecision = await knex.schema.hasColumn('interviews', 'decision');
    const hasDecisionNotes = await knex.schema.hasColumn('interviews', 'decision_notes');
    const hasDecisionAt = await knex.schema.hasColumn('interviews', 'decision_at');

    await knex.schema.alterTable('interviews', (table) => {
      if (!hasDecision) {
        table.string('decision', 50).nullable().after('status');
      }
      if (!hasDecisionNotes) {
        table.text('decision_notes').nullable().after('decision');
      }
      if (!hasDecisionAt) {
        table.timestamp('decision_at').nullable().after('decision_notes');
      }
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasInterviews = await knex.schema.hasTable('interviews');
  if (hasInterviews) {
    const hasDecision = await knex.schema.hasColumn('interviews', 'decision');
    if (hasDecision) {
      await knex.schema.alterTable('interviews', (table) => {
        table.dropColumn('decision');
        table.dropColumn('decision_notes');
        table.dropColumn('decision_at');
      });
    }
  }
}
