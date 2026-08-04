import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { logger } from '@/common/lib/logger';
import { NotificationService } from '../../notifications/services/notification.service';
import type { TenantContext } from '../../../db/types';
import { LeaveApprovalService } from './LeaveApprovalService';
import { getOrgLeaveSettings } from '../utils/settingsResolver';
import { calculateFinancialYearStart, calculateFinancialYearEnd } from '../utils/dateUtils';

export class LeaveExpiryJobService {
  private db = getKnex();
  private notificationService = new NotificationService();

  /**
   * Safe initialization of templates in the DB for a specific organization
   */
  private async ensureTemplatesInitialized(trx: any, orgId: number, superadminId: number): Promise<void> {
    const templates = [
      {
        code: 'COMP_OFF_EXPIRY',
        name: 'Comp-off Expiry Alert',
        subject: 'Your Earned Comp-off Has Expired',
        body: 'Hello {{employeeName}}, your comp-off of {{hours}} hours earned on {{earnedDate}} has expired.',
      },
      {
        code: 'COMP_OFF_EXPIRY_WARN',
        name: 'Comp-off Expiry Warning',
        subject: 'URGENT: Comp-off Expiring in 7 Days',
        body: 'Hello {{employeeName}}, your comp-off of {{hours}} hours earned on {{earnedDate}} will expire in 7 days (on {{expiryDate}}). Please apply to use it.',
      },
      {
        code: 'CARRY_FORWARD_EXPIRY',
        name: 'Carried-forward Leave Expiry Alert',
        subject: 'Your Carried-forward Leaves Have Expired',
        body: 'Hello {{employeeName}}, {{days}} days of carried-forward {{leaveName}} have expired today.',
      },
      {
        code: 'CARRY_FORWARD_EXPIRY_WARN',
        name: 'Carried-forward Leave Expiry Warning',
        subject: 'Carried-forward Leaves Expiring in 7 Days',
        body: 'Hello {{employeeName}}, {{days}} days of carried-forward {{leaveName}} will expire in 7 days (on {{expiryDate}}). Please apply to use them.',
      },
    ];

    for (const t of templates) {
      // 1. Check template
      let templateRow = await trx('notification_templates')
        .where('organization_id', orgId)
        .where('template_code', t.code)
        .whereNull('deleted_at')
        .first();

      if (!templateRow) {
        const [insertedId] = await trx('notification_templates').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          template_code: t.code,
          template_name: t.name,
          category: 'system',
          channels: JSON.stringify(['inapp', 'email']),
          subject_line: t.subject,
          body_text: t.body,
          is_published: true,
          status: 'published',
          created_by: superadminId,
          updated_by: superadminId,
          created_at: new Date(),
          updated_at: new Date(),
        });
        
        templateRow = { id: insertedId };
      }

      // 2. Check event
      const eventRow = await trx('notification_events')
        .where('organization_id', orgId)
        .where('event_code', t.code)
        .whereNull('deleted_at')
        .first();

      if (!eventRow) {
        await trx('notification_events').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          event_code: t.code,
          event_name: t.name,
          default_template_id: templateRow.id,
          is_enabled: true,
          created_by: superadminId,
          updated_by: superadminId,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  /**
   * Run warning and expiry checks for all organizations
   */
  async runExpiryJobs(): Promise<{ compOffExpired: number; compOffWarned: number; carryForwardExpired: number; carryForwardWarned: number }> {
    logger.info('Starting Leave & Comp-off Expiry background cron processing');

    const orgs = await this.db('organizations').whereNull('deleted_at');
    const result = {
      compOffExpired: 0,
      compOffWarned: 0,
      carryForwardExpired: 0,
      carryForwardWarned: 0,
      escalatedCount: 0,
    };

    for (const org of orgs) {
      try {
        // Resolve a default superadmin or system user ID for logs/creators
        let defaultUser = await this.db('users')
          .where('organization_id', org.id)
          .whereNull('deleted_at')
          .orderBy('id', 'asc')
          .first();

        if (!defaultUser) {
          defaultUser = await this.db('users')
            .whereNull('deleted_at')
            .orderBy('id', 'asc')
            .first();
        }

        if (!defaultUser) {
          logger.warn(`Skipping expiry job for org ${org.id}: No active users found in database.`);
          continue;
        }

        const systemUserId = Number(defaultUser.id);
        const ctx: TenantContext = {
          organizationId: Number(org.id),
          userId: systemUserId,
          roles: ['Super Admin'],
        };

        const summary = await this.db.transaction(async (trx) => {
          // Auto-seed templates if missing
          await this.ensureTemplatesInitialized(trx, org.id, systemUserId);

          const summaryInner = {
            compOffExpired: 0,
            compOffWarned: 0,
            carryForwardExpired: 0,
            carryForwardWarned: 0,
          };

          const todayStr = new Date().toISOString().split('T')[0];
          
          const warningDate = new Date();
          warningDate.setDate(warningDate.getDate() + 7);
          const warningDateStr = warningDate.toISOString().split('T')[0];

          // -------------------------------------------------------------
          // A. COMP-OFF EXPIRY PROCESSING
          // -------------------------------------------------------------
          // 1. Mark expired comp-offs
          const expiredCompOffs = await trx('comp_off_balances as cob')
            .join('employees as e', 'cob.employee_id', 'e.id')
            .leftJoin('users as u', 'u.employee_id', 'e.id')
            .where('cob.organization_id', org.id)
            .where('cob.status', 'available')
            .where('cob.comp_off_expires_at', '<', todayStr)
            .whereNull('cob.deleted_at')
            .select('cob.*', 'e.first_name', 'e.last_name', 'u.id as user_id');

          for (const co of expiredCompOffs) {
            await trx('comp_off_balances').where('id', co.id).update({
              status: 'expired',
              updated_at: new Date(),
            });

            summaryInner.compOffExpired++;

            // Create ledger entry reflecting expiration
            await trx('leave_ledger_entries').insert({
              uuid: uuidv4(),
              organization_id: org.id,
              employee_id: co.employee_id,
              leave_type_id: 1, // Fallback leave type id
              transaction_type: 'EXPIRY',
              amount: -parseFloat(co.comp_off_earned_hours) / 8, // hours to days
              reference_id: `compoff_expiry:${co.id}`,
              effective_date: new Date(),
              created_by: systemUserId,
              remarks: `Earned comp-off of ${co.comp_off_earned_hours} hours expired`,
              created_at: new Date(),
              updated_at: new Date(),
            });

            if (co.user_id) {
              await this.notificationService.sendNotification(ctx, {
                eventCode: 'COMP_OFF_EXPIRY',
                recipientId: co.user_id,
                variables: {
                  employeeName: `${co.first_name} ${co.last_name}`.trim(),
                  hours: co.comp_off_earned_hours,
                  earnedDate: new Date(co.comp_off_earned_date).toLocaleDateString(),
                },
              }).catch((e) => logger.warn('Failed to queue comp-off expiry notification', e));
            }
          }

          // 2. Warn comp-offs expiring in 7 days
          const warnCompOffs = await trx('comp_off_balances as cob')
            .join('employees as e', 'cob.employee_id', 'e.id')
            .leftJoin('users as u', 'u.employee_id', 'e.id')
            .where('cob.organization_id', org.id)
            .where('cob.status', 'available')
            .where('cob.comp_off_expires_at', '=', warningDateStr)
            .whereNull('cob.deleted_at')
            .select('cob.*', 'e.first_name', 'e.last_name', 'u.id as user_id');

          for (const co of warnCompOffs) {
            summaryInner.compOffWarned++;
            if (co.user_id) {
              await this.notificationService.sendNotification(ctx, {
                eventCode: 'COMP_OFF_EXPIRY_WARN',
                recipientId: co.user_id,
                variables: {
                  employeeName: `${co.first_name} ${co.last_name}`.trim(),
                  hours: co.comp_off_earned_hours,
                  earnedDate: new Date(co.comp_off_earned_date).toLocaleDateString(),
                  expiryDate: new Date(co.comp_off_expires_at).toLocaleDateString(),
                },
              }).catch((e) => logger.warn('Failed to queue comp-off warning notification', e));
            }
          }

          // -------------------------------------------------------------
          // B. CARRY-FORWARD EXPIRY PROCESSING
          // -------------------------------------------------------------
          // 1. Mark expired carry-forward records
          const expiredCFs = await trx('leave_carry_forward as lcf')
            .join('employees as e', 'lcf.employee_id', 'e.id')
            .leftJoin('users as u', 'u.employee_id', 'e.id')
            .join('leave_types as lt', 'lcf.leave_type_id', 'lt.id')
            .where('lcf.organization_id', org.id)
            .where('lcf.expiry_date', '<', todayStr)
            .whereNull('lcf.deleted_at')
            .select('lcf.*', 'e.first_name', 'e.last_name', 'u.id as user_id', 'lt.leave_name');

          for (const cf of expiredCFs) {
            // Check if we already created an EXPIRY ledger record for this carry-forward record
            const alreadyProcessed = await trx('leave_ledger_entries')
              .where('organization_id', org.id)
              .where('reference_id', `carryforward_expiry:${cf.id}`)
              .first();

            if (!alreadyProcessed) {
              summaryInner.carryForwardExpired++;

              // Log EXPIRED transaction in ledger
              await trx('leave_ledger_entries').insert({
                uuid: uuidv4(),
                organization_id: org.id,
                employee_id: cf.employee_id,
                leave_type_id: cf.leave_type_id,
                transaction_type: 'EXPIRY',
                amount: -parseFloat(cf.carried_forward_days),
                reference_id: `carryforward_expiry:${cf.id}`,
                effective_date: new Date(),
                created_by: systemUserId,
                remarks: `Carried-forward balance of ${cf.carried_forward_days} days expired`,
                created_at: new Date(),
                updated_at: new Date(),
              });

              // Deduct from current employee leave_balances
              const balance = await trx('leave_balances')
                .where({
                  employee_id: cf.employee_id,
                  leave_type_id: cf.leave_type_id,
                  financial_year_start: cf.to_financial_year_start,
                })
                .forUpdate()
                .first();

              if (balance) {
                const currentCF = parseFloat(balance.carry_forward_balance || balance.carryForwardBalance || 0);
                const currentAvail = parseFloat(balance.available_balance || balance.availableBalance || 0);
                const newCF = Math.max(0, currentCF - parseFloat(cf.carried_forward_days));
                const newAvail = Math.max(0, currentAvail - parseFloat(cf.carried_forward_days));

                await trx('leave_balances')
                  .where('id', balance.id)
                  .update({
                    carry_forward_balance: newCF,
                    available_balance: newAvail,
                    updated_at: new Date(),
                  });
              }

              if (cf.user_id) {
                await this.notificationService.sendNotification(ctx, {
                  eventCode: 'CARRY_FORWARD_EXPIRY',
                  recipientId: cf.user_id,
                  variables: {
                    employeeName: `${cf.first_name} ${cf.last_name}`.trim(),
                    days: cf.carried_forward_days,
                    leaveName: cf.leave_name || 'Leaves',
                  },
                }).catch((e) => logger.warn('Failed to queue carry-forward expiry notification', e));
              }
            }
          }

          // 2. Warn carry-forward expiring in 7 days
          const warnCFs = await trx('leave_carry_forward as lcf')
            .join('employees as e', 'lcf.employee_id', 'e.id')
            .leftJoin('users as u', 'u.employee_id', 'e.id')
            .join('leave_types as lt', 'lcf.leave_type_id', 'lt.id')
            .where('lcf.organization_id', org.id)
            .where('lcf.expiry_date', '=', warningDateStr)
            .whereNull('lcf.deleted_at')
            .select('lcf.*', 'e.first_name', 'e.last_name', 'u.id as user_id', 'lt.leave_name');

          for (const cf of warnCFs) {
            summaryInner.carryForwardWarned++;
            if (cf.user_id) {
              await this.notificationService.sendNotification(ctx, {
                eventCode: 'CARRY_FORWARD_EXPIRY_WARN',
                recipientId: cf.user_id,
                variables: {
                  employeeName: `${cf.first_name} ${cf.last_name}`.trim(),
                  days: cf.carried_forward_days,
                  leaveName: cf.leave_name || 'Leaves',
                  expiryDate: new Date(cf.expiry_date).toLocaleDateString(),
                },
              }).catch((e) => logger.warn('Failed to queue carry-forward warning notification', e));
            }
          }

          // -------------------------------------------------------------
          // C. YEAR-END CARRY-FORWARD ROLLOVER PROCESSING
          // -------------------------------------------------------------
          const employees = await trx('employees')
            .where('organization_id', org.id)
            .where('status', 'active')
            .whereNull('deleted_at');

          for (const emp of employees) {
            const settings = await getOrgLeaveSettings(org.id, emp.current_location_id || emp.currentLocationId);
            const startMonth = settings.holidayYearStartMonth;

            const today = new Date();
            const todayMonth = today.getMonth() + 1; // 1-indexed
            const todayDate = today.getDate();

            if (todayMonth === startMonth && todayDate === 1) {
              const currentYear = today.getFullYear();
              const newCycleStart = `${currentYear}-${String(startMonth).padStart(2, '0')}-01`;
              const newCycleEnd = calculateFinancialYearEnd(newCycleStart);
              const prevCycleStart = `${currentYear - 1}-${String(startMonth).padStart(2, '0')}-01`;
              const prevCycleEnd = calculateFinancialYearEnd(prevCycleStart);

              const assignments = await trx('leave_policy_assignments')
                .where({
                  organization_id: org.id,
                  employee_id: emp.id,
                  is_active: true,
                })
                .whereNull('deleted_at');

              for (const assignment of assignments) {
                const alreadyRolledOver = await trx('leave_carry_forward')
                  .where({
                    organization_id: org.id,
                    employee_id: emp.id,
                    leave_type_id: assignment.leave_type_id,
                    to_financial_year_start: newCycleStart,
                  })
                  .whereNull('deleted_at')
                  .first();

                if (alreadyRolledOver) continue;

                const prevBalance = await trx('leave_balances')
                  .where({
                    organization_id: org.id,
                    employee_id: emp.id,
                    leave_type_id: assignment.leave_type_id,
                    financial_year_start: prevCycleStart,
                  })
                  .whereNull('deleted_at')
                  .first();

                if (prevBalance) {
                  const unused = parseFloat(prevBalance.available_balance || prevBalance.availableBalance || 0);
                  let cfAmount = 0;
                  
                  if (assignment.carry_forward_enabled && unused > 0) {
                    const limit = assignment.carry_forward_limit !== null ? parseFloat(assignment.carry_forward_limit) : unused;
                    cfAmount = Math.min(unused, limit);
                  }

                  const expiredAmount = unused - cfAmount;

                  if (cfAmount > 0) {
                    await trx('leave_carry_forward').insert({
                      uuid: uuidv4(),
                      organization_id: org.id,
                      employee_id: emp.id,
                      from_financial_year_end: prevCycleEnd,
                      to_financial_year_start: newCycleStart,
                      leave_type_id: assignment.leave_type_id,
                      carried_forward_days: cfAmount,
                      expiry_date: newCycleEnd,
                      created_by: systemUserId,
                      updated_by: systemUserId,
                      created_at: new Date(),
                      updated_at: new Date(),
                    });

                    await trx('leave_ledger_entries').insert({
                      uuid: uuidv4(),
                      organization_id: org.id,
                      employee_id: emp.id,
                      leave_type_id: assignment.leave_type_id,
                      transaction_type: 'ACCRUAL',
                      amount: cfAmount,
                      effective_date: newCycleStart,
                      reference_id: `CF-${emp.id}-${assignment.leave_type_id}-${newCycleStart}`,
                      remarks: `Carry forward from previous cycle ending ${prevCycleEnd}`,
                      created_by: systemUserId,
                      created_at: new Date(),
                      updated_at: new Date(),
                    });
                  }

                  if (expiredAmount > 0) {
                    await trx('leave_ledger_entries').insert({
                      uuid: uuidv4(),
                      organization_id: org.id,
                      employee_id: emp.id,
                      leave_type_id: assignment.leave_type_id,
                      transaction_type: 'EXPIRY',
                      amount: -expiredAmount,
                      effective_date: prevCycleEnd,
                      reference_id: `EXP-${emp.id}-${assignment.leave_type_id}-${prevCycleEnd}`,
                      remarks: `Unused leaves expired at year-end`,
                      created_by: systemUserId,
                      created_at: new Date(),
                      updated_at: new Date(),
                    });
                  }

                  const newBalance = await trx('leave_balances')
                    .where({
                      organization_id: org.id,
                      employee_id: emp.id,
                      leave_type_id: assignment.leave_type_id,
                      financial_year_start: newCycleStart,
                    })
                    .whereNull('deleted_at')
                    .first();

                  const policy = await trx('leave_policies').where('id', assignment.leave_policy_id).first();
                  let scalePercent = null;
                  if (policy && policy.earned_leave_entitlement_percent !== null) {
                    scalePercent = parseFloat(policy.earned_leave_entitlement_percent);
                  }

                  let baseQuota = assignment.annual_quota || 0;
                  if (scalePercent !== null) {
                    baseQuota = baseQuota * (scalePercent / 100);
                  }

                  if (!newBalance) {
                    await trx('leave_balances').insert({
                      uuid: uuidv4(),
                      organization_id: org.id,
                      employee_id: emp.id,
                      leave_type_id: assignment.leave_type_id,
                      financial_year_start: newCycleStart,
                      financial_year_end: newCycleEnd,
                      opening_balance: baseQuota,
                      credited_balance: 0,
                      consumed_balance: 0,
                      available_balance: baseQuota + cfAmount,
                      carry_forward_balance: cfAmount,
                      encashed_balance: 0,
                      expired_balance: expiredAmount,
                      pending_approval_balance: 0,
                      created_by: systemUserId,
                      updated_by: systemUserId,
                      created_at: new Date(),
                      updated_at: new Date(),
                    });
                  } else {
                    await trx('leave_balances')
                      .where('id', newBalance.id)
                      .update({
                        carry_forward_balance: cfAmount,
                        expired_balance: parseFloat(newBalance.expired_balance || 0) + expiredAmount,
                        available_balance: baseQuota + parseFloat(newBalance.credited_balance || 0) + cfAmount - parseFloat(newBalance.consumed_balance || 0) - parseFloat(newBalance.encashed_balance || 0),
                        updated_by: systemUserId,
                        updated_at: new Date(),
                      });
                  }
                }
              }
            }
          }

          return summaryInner;
        });

        result.compOffExpired += summary.compOffExpired;
        result.compOffWarned += summary.compOffWarned;
        result.carryForwardExpired += summary.carryForwardExpired;
        result.carryForwardWarned += summary.carryForwardWarned;

        // Auto-escalations scanner
        const approvalService = new LeaveApprovalService();
        const escResult = await approvalService.scanAndProcessAutoEscalations(ctx);
        result.escalatedCount += escResult.escalatedCount;

      } catch (err) {
        logger.error(`Failed to process expiry jobs for organization #${org.id}`, err);
      }
    }

    logger.info('Leave & Comp-off Expiry background cron jobs completed', result);
    return result;
  }
}
