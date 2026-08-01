import { getKnex } from '../../../db/knex';
import { getLogger } from '../../../common/lib/logger';

const logger = getLogger('AutoCheckOutService');

export class AutoCheckOutService {
  /**
   * Process auto check-outs for all active organizations
   */
  public static async processAutoCheckOuts(): Promise<{ processedCount: number }> {
    const db = getKnex();
    let totalProcessed = 0;

    try {
      // 1. Get all organizations
      const orgs = await db('organizations').select('id', 'name');

      for (const org of orgs) {
        try {
          // Fetch settings for this organization
          const settings = await db('organization_settings')
            .where('organization_id', org.id);

          const settingsMap: Record<string, any> = {};
          settings.forEach((s) => {
            let val = s.settingValue !== undefined ? s.settingValue : s.setting_value;
            if (typeof val === 'string') {
              try { val = JSON.parse(val); } catch (e) { /* keep as raw string */ }
            }
            settingsMap[s.settingKey || s.setting_key] = val;
          });

          // Check if auto check-out is enabled for this organization
          const isEnabled = Boolean(settingsMap['auto_checkout_enabled']);
          if (!isEnabled) {
            continue;
          }

          const bufferMinutes = Number(settingsMap['auto_checkout_buffer_minutes'] ?? 0);

          // Get current date & time
          const nowObj = new Date();
          const todayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;

          // 2. Fetch unclosed attendance records for today (check_out_time is null)
          const unclosedRecords = await db('attendance_records')
            .where('organization_id', org.id)
            .whereNull('check_out_time')
            .whereNotNull('check_in_time');

          for (const record of unclosedRecords) {
            try {
              const empId = record.employee_id || record.employeeId;

              // Find assigned shift or fallback to General Shift (09:00 AM - 06:00 PM)
              let shiftEndTimeStr = '18:00:00'; // Default 6:00 PM

              const assignment = await db('employee_shift_assignments')
                .where({ organization_id: org.id, employee_id: empId })
                .first();

              if (assignment?.shift_id || assignment?.shiftId) {
                const shiftId = assignment.shift_id || assignment.shiftId;
                const shiftTemplate = await db('shift_templates')
                  .where({ id: shiftId })
                  .first();

                if (shiftTemplate?.end_time || shiftTemplate?.endTime) {
                  shiftEndTimeStr = shiftTemplate.end_time || shiftTemplate.endTime;
                }
              }

              // Parse shift end datetime
              const [endH, endM, endS] = shiftEndTimeStr.split(':').map((v) => parseInt(v, 10) || 0);
              const shiftEndTarget = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate(), endH, endM, endS || 0);

              // Add buffer minutes
              shiftEndTarget.setMinutes(shiftEndTarget.getMinutes() + bufferMinutes);

              // If current time is past shift end target time
              if (nowObj >= shiftEndTarget) {
                // Calculate check-out timestamp string
                const formattedShiftEndOut = `${todayStr} ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

                // Compute work duration
                const checkInMs = new Date(record.check_in_time || record.checkInTime).getTime();
                const checkOutMs = shiftEndTarget.getTime();
                const grossMinutes = Math.max(0, Math.floor((checkOutMs - checkInMs) / (1000 * 60)));
                const breakMins = Number(record.break_time_minutes ?? 0);
                const workDurationMins = Math.max(0, grossMinutes - breakMins);

                // Update record with auto check-out
                await db('attendance_records')
                  .where({ id: record.id })
                  .update({
                    check_out_time: formattedShiftEndOut,
                    check_out_method: 'auto_shift_end',
                    duration_minutes: grossMinutes,
                    work_duration_minutes: workDurationMins,
                    updated_at: new Date(),
                  });

                totalProcessed++;
                logger.info(`Auto checked-out Employee ID ${empId} at shift end (${formattedShiftEndOut})`);
              }
            } catch (err) {
              logger.error(`Error processing auto check-out for record ${record.id}:`, err);
            }
          }
        } catch (orgErr) {
          logger.error(`Error processing auto check-out for org ${org.id}:`, orgErr);
        }
      }
    } catch (err) {
      logger.error('Error running processAutoCheckOuts:', err);
    }

    return { processedCount: totalProcessed };
  }
}

/**
 * Background runner interval for Auto Check-Out service
 */
export function startAutoCheckOutCron(intervalMs: number = 60000) {
  logger.info(`Starting Auto Check-Out worker service (Interval: ${intervalMs / 1000}s)`);

  const run = async () => {
    try {
      await AutoCheckOutService.processAutoCheckOuts();
    } catch (err) {
      logger.error('Auto Check-Out worker execution error:', err);
    }
  };

  // Run initial check after 5 seconds
  setTimeout(run, 5000);

  // Run periodic check
  setInterval(run, intervalMs);
}
