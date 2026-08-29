import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

function todayDateString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mysqlNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Moves expired job openings to Closed and expired MRF requests to Completed/Closed.
 * A deadline is considered complete after that calendar date (today remains open).
 */
export class RecruitmentExpiryService {
  async closeExpiredRecords(ctx: TenantContext): Promise<void> {
    const db = getKnex();
    const today = todayDateString();
    const now = mysqlNow();

    try {
      const expiredJobs = await db('jobs')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .whereNotNull('expiry_date')
        .where('expiry_date', '<', today)
        .whereNotIn('status', ['closed', 'archived']);

      const closedMrfIds = new Set<number>();

      for (const job of expiredJobs) {
        await db('jobs').where('id', job.id).update({
          status: 'closed',
          closed_at: now,
          updated_at: now,
        });

        const mrfId = job.mrf_request_id ?? job.mrfRequestId;
        if (mrfId) {
          await db('mrf_requests')
            .where({ id: mrfId, organization_id: ctx.organizationId })
            .whereNull('deleted_at')
            .update({
              status: 'Closed',
              stage: 'Completed',
              updated_at: now,
            });
          closedMrfIds.add(Number(mrfId));
        }
      }

      const hasExpiry = await db.schema.hasColumn('mrf_requests', 'expiry_date').catch(() => false);
      const hasTarget = await db.schema.hasColumn('mrf_requests', 'target_closure_date').catch(() => false);

      if (hasExpiry || hasTarget) {
        const expiredMrfsQuery = db('mrf_requests')
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .whereRaw("LOWER(COALESCE(status, '')) = 'open'")
          .andWhere((q) => {
            if (hasTarget) {
              q.orWhere((inner) => {
                inner.whereNotNull('target_closure_date').andWhere('target_closure_date', '<', today);
              });
            }
            if (hasExpiry) {
              q.orWhere((inner) => {
                inner.whereNotNull('expiry_date').andWhere('expiry_date', '<', today);
              });
            }
          });

        const expiredMrfs = await expiredMrfsQuery;

        for (const mrf of expiredMrfs) {
          if (closedMrfIds.has(Number(mrf.id))) continue;

          await db('mrf_requests').where('id', mrf.id).update({
            status: 'Closed',
            stage: 'Completed',
            updated_at: now,
          });

          await db('jobs')
            .where({ organization_id: ctx.organizationId, mrf_request_id: mrf.id })
            .whereNull('deleted_at')
            .whereNotIn('status', ['closed', 'archived'])
            .update({
              status: 'closed',
              closed_at: now,
              updated_at: now,
            });
        }
      }
    } catch (err) {
      console.error('[RecruitmentExpiryService] Failed to close expired records:', err);
    }
  }
}

export const recruitmentExpiryService = new RecruitmentExpiryService();
