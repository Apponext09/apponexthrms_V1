import { db } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { getLogger } from '../../../common/lib/logger';

const logger = getLogger('AttendancePolicyService');

export interface AttendancePolicyRecord {
  id: number;
  uuid?: string;
  organizationId: number;
  code: string;
  name: string;
  pillar: number;
  pillarName: string;
  category: string;
  description: string;
  businessRationale: string;
  calculationFormula: string;
  edgeCaseProtocol: string;
  status: 'active' | 'draft' | 'archived';
  isMandatory: boolean;
  applicableTo: string;
  assignedEmployeesCount?: number;
  assignedDepartments?: string[];
  config: Record<string, any>;
  updatedAt?: string;
}

export class AttendancePolicyService {
  /**
   * Get all attendance policies for an organization, seeding initial 30 if empty
   */
  public async getPolicies(ctx: TenantContext): Promise<AttendancePolicyRecord[]> {
    const hasTable = await db.schema.hasTable('attendance_policies');
    if (!hasTable) {
      logger.warn('attendance_policies table missing in DB.');
      return [];
    }

    // Check existing rows for organization
    const rows = await db('attendance_policies')
      .where({ organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .orderBy('id', 'asc');

    if (rows.length === 0) {
      logger.info(`Seeding initial 30 attendance policies for organization ${ctx.organizationId}...`);
      await this.seedInitialPolicies(ctx);
      const seeded = await db('attendance_policies')
        .where({ organization_id: ctx.organizationId })
        .whereNull('deleted_at')
        .orderBy('id', 'asc');
      return seeded.map((r) => this.mapRowToRecord(r));
    }

    return rows.map((r) => this.mapRowToRecord(r));
  }

  /**
   * Create a new attendance policy in MySQL DB
   */
  public async createPolicy(ctx: TenantContext, payload: Partial<AttendancePolicyRecord>): Promise<AttendancePolicyRecord> {
    const code = (payload.code || `POL-${Date.now()}`).trim();
    const name = (payload.name || 'Custom Attendance Policy').trim();
    const pillar = payload.pillar || 1;

    const rowData = {
      organization_id: ctx.organizationId,
      code,
      name,
      working_hours_per_day: payload.config?.workingHoursPerDay || 8.5,
      grace_period_minutes: payload.config?.gracePeriodMinutes || 15,
      overtime_enabled: Boolean(payload.config?.otPreApprovalRequired ?? true),
      status: payload.status === 'draft' ? 'inactive' : 'active',
      is_default: Boolean(payload.isMandatory || false),
      rules_config: JSON.stringify({
        pillar,
        pillarName: payload.pillarName || `Pillar ${pillar}`,
        category: payload.category || 'General',
        description: payload.description || '',
        businessRationale: payload.businessRationale || '',
        calculationFormula: payload.calculationFormula || '',
        edgeCaseProtocol: payload.edgeCaseProtocol || '',
        applicableTo: payload.applicableTo || 'All Employees',
        isMandatory: Boolean(payload.isMandatory),
        assignedDepartments: payload.assignedDepartments || ['All Departments'],
        config: payload.config || {}
      }),
      created_by: ctx.userId || 1,
      updated_by: ctx.userId || 1,
      created_at: new Date(),
      updated_at: new Date()
    };

    const [insertedId] = await db('attendance_policies').insert(rowData);
    const created = await db('attendance_policies').where({ id: insertedId }).first();
    return this.mapRowToRecord(created);
  }

  /**
   * Update an existing attendance policy in MySQL DB
   */
  public async updatePolicy(ctx: TenantContext, id: number | string, payload: Partial<AttendancePolicyRecord>): Promise<AttendancePolicyRecord> {
    const existing = await db('attendance_policies')
      .where({ organization_id: ctx.organizationId })
      .where((builder) => {
        if (/^\d+$/.test(String(id))) {
          builder.where({ id: Number(id) });
        } else {
          builder.where({ code: String(id) });
        }
      })
      .first();

    if (!existing) {
      throw new Error(`Attendance policy ${id} was not found.`);
    }

    let existingConfig: Record<string, any> = {};
    if (existing.rules_config) {
      try {
        existingConfig = typeof existing.rules_config === 'string' ? JSON.parse(existing.rules_config) : existing.rules_config;
      } catch (e) { /* fallback */ }
    }

    const updatedConfig = {
      ...existingConfig,
      ...(payload.pillar ? { pillar: payload.pillar } : {}),
      ...(payload.pillarName ? { pillarName: payload.pillarName } : {}),
      ...(payload.category ? { category: payload.category } : {}),
      ...(payload.description ? { description: payload.description } : {}),
      ...(payload.businessRationale ? { businessRationale: payload.businessRationale } : {}),
      ...(payload.calculationFormula ? { calculationFormula: payload.calculationFormula } : {}),
      ...(payload.edgeCaseProtocol ? { edgeCaseProtocol: payload.edgeCaseProtocol } : {}),
      ...(payload.applicableTo ? { applicableTo: payload.applicableTo } : {}),
      ...(payload.isMandatory !== undefined ? { isMandatory: payload.isMandatory } : {}),
      ...(payload.assignedDepartments ? { assignedDepartments: payload.assignedDepartments } : {}),
      config: {
        ...(existingConfig.config || {}),
        ...(payload.config || {})
      }
    };

    const updateData: Record<string, any> = {
      rules_config: JSON.stringify(updatedConfig),
      updated_by: ctx.userId || 1,
      updated_at: new Date()
    };

    if (payload.name) updateData.name = payload.name;
    if (payload.status) updateData.status = payload.status === 'draft' ? 'inactive' : 'active';
    if (payload.isMandatory !== undefined) updateData.is_default = payload.isMandatory;
    if (payload.config?.workingHoursPerDay) updateData.working_hours_per_day = payload.config.workingHoursPerDay;
    if (payload.config?.gracePeriodMinutes) updateData.grace_period_minutes = payload.config.gracePeriodMinutes;

    await db('attendance_policies').where({ id: existing.id }).update(updateData);
    const updated = await db('attendance_policies').where({ id: existing.id }).first();
    return this.mapRowToRecord(updated);
  }

  /**
   * Assign policy scope to departments/employees
   */
  public async assignPolicyScope(ctx: TenantContext, id: number | string, departments: string[]): Promise<{ success: boolean; assignedDepartments: string[] }> {
    await this.updatePolicy(ctx, id, { assignedDepartments: departments });
    return { success: true, assignedDepartments: departments };
  }

  /**
   * Helper: Map DB table row to record payload
   */
  private mapRowToRecord(row: any): AttendancePolicyRecord {
    let parsedConfig: any = {};
    if (row.rules_config) {
      try {
        parsedConfig = typeof row.rules_config === 'string' ? JSON.parse(row.rules_config) : row.rules_config;
      } catch (e) {
        parsedConfig = {};
      }
    }

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      pillar: parsedConfig.pillar || 1,
      pillarName: parsedConfig.pillarName || 'Pillar I: Core Hours & Credits',
      category: parsedConfig.category || 'General',
      description: parsedConfig.description || row.name,
      businessRationale: parsedConfig.businessRationale || 'Standard organization compliance rule.',
      calculationFormula: parsedConfig.calculationFormula || `Working Hours: ${row.working_hours_per_day}h | Grace: ${row.grace_period_minutes}m`,
      edgeCaseProtocol: parsedConfig.edgeCaseProtocol || 'Standard HR escalation protocol applies.',
      status: row.status === 'inactive' ? 'draft' : 'active',
      isMandatory: Boolean(row.is_default || parsedConfig.isMandatory),
      applicableTo: parsedConfig.applicableTo || 'All Employees',
      assignedEmployeesCount: 1420,
      assignedDepartments: parsedConfig.assignedDepartments || ['All Departments'],
      config: parsedConfig.config || {
        workingHoursPerDay: Number(row.working_hours_per_day || 8.5),
        gracePeriodMinutes: Number(row.grace_period_minutes || 15)
      },
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString().split('T')[0] : '2026-08-01'
    };
  }

  /**
   * Seed initial 30 master policies into database for tenant
   */
  private async seedInitialPolicies(ctx: TenantContext): Promise<void> {
    const initialSeed = [
      { code: 'POL-001', name: 'Standard Working Hours & Attendance Threshold Policy', pillar: 1, pillarName: 'Pillar I: Core Hours & Credits', category: 'Work Hours', description: 'Establishes daily work duration requirements and full-day / half-day / absent mathematical credit boundaries.', formula: 'Full Day >= 7.5 hrs | Half Day = 4.0 - 7.4 hrs | Absent < 4.0 hrs', config: { workingHoursPerDay: 8.5, fullDayMinHours: 7.5, halfDayMinHours: 4.0, gracePeriodMinutes: 15 } },
      { code: 'POL-002', name: 'Flexi-Time & Mandatory Core Hours Policy', pillar: 1, pillarName: 'Pillar I: Core Hours & Credits', category: 'Flexi Time', description: 'Provides flexible start/end shift windows while mandating core presence hours for cross-team collaboration.', formula: 'Earliest Check-In: 07:00 | Mandatory Core Window: 11:00 to 16:00 | Latest Check-Out: 22:00', config: { flexiEnabled: true, coreHoursStart: '11:00', coreHoursEnd: '16:00' } },
      { code: 'POL-003', name: 'Break & Meal Period Tracking Policy', pillar: 1, pillarName: 'Pillar I: Core Hours & Credits', category: 'Breaks', description: 'Tracks statutory meal and tea breaks, auto-deducting unpunched meal periods.', formula: 'Meal Break = 45m (auto-deducted) | Tea Breaks = 2 x 15m (non-deductible)', config: { autoDeductMealBreak: true, mealBreakMinutes: 45 } },
      { code: 'POL-004', name: 'Partial Day & Hourly Permission Policy', pillar: 1, pillarName: 'Pillar I: Core Hours & Credits', category: 'Permissions', description: 'Allows brief monthly personal errand permissions without consuming full or half-day leave balances.', formula: 'Max 2 permissions/mo | Max 2.0 hrs/instance', config: { maxPermissionsPerMonth: 2, maxHoursPerPermission: 2.0 } },
      { code: 'POL-005', name: 'Grace Period & Multi-Tier Late-In / Early-Exit Penalty Policy', pillar: 2, pillarName: 'Pillar II: Punctuality & Penalties', category: 'Grace & Late Marks', description: 'Graduated 4-tier late mark and early exit penalty structure with leave/LOP deductions.', formula: 'Tier 0: 0-15m (Grace) | Tier 1: 16-30m (3 Late = 0.5d Leave) | Tier 2: 31-90m (2 Severe = 0.5d LOP) | Tier 3: >90m (Half-Day Absent)', config: { gracePeriodMinutes: 15, lateMarkDeductionRatio: 3 } },
      { code: 'POL-006', name: 'Short Leave & Gate Pass Verification Policy', pillar: 2, pillarName: 'Pillar II: Punctuality & Penalties', category: 'Gate Pass', description: 'QR-code gate pass validation for physical movements outside office turnstiles during active shifts.', formula: 'Gate Pass QR scanned at turnstile | Unreturned pass > 30m post shift triggers security alert', config: { gatePassRequired: true } },
      { code: 'POL-007', name: 'Habitual Absenteeism & Unauthorized Absence (AWOL) Policy', pillar: 2, pillarName: 'Pillar II: Punctuality & Penalties', category: 'AWOL', description: 'Automated HR show-cause notice and employment abandonment protocols for unexcused absences.', formula: '3 Days AWOL = HR Show-Cause Notice | 7 Days AWOL = Voluntary Abandonment & Account Lock', config: { awolNoticeDays: 3, awolTerminationDays: 7 } },
      { code: 'POL-008', name: 'Probationary & Intern Attendance Strictness Policy', pillar: 2, pillarName: 'Pillar II: Punctuality & Penalties', category: 'Probation', description: 'Strict attendance rules, zero WFH privilege, and 95% attendance requirement during probation.', formula: 'Grace Period = 10 mins | WFH Allowed = False | Min Attendance Pct = 95.0%', config: { probationGraceMinutes: 10, probationWfhAllowed: false } },
      { code: 'POL-009', name: 'Geofence Bounds & GPS Spoofing Prevention Policy', pillar: 3, pillarName: 'Pillar III: AI Security & Geofencing', category: 'Geofencing', description: 'Radial/Polygon geofencing enforcement with mock location and VPN anti-spoofing engine.', formula: 'Punch Allowed within 100m Radius / Polygon Map | Mock Location & VPN = Blocked', config: { defaultRadiusMeters: 100, blockMockLocations: true } },
      { code: 'POL-010', name: 'Biometric Liveness Detection & Face-Match Policy', pillar: 3, pillarName: 'Pillar III: AI Security & Geofencing', category: 'Biometric AI', description: 'Strict 98.5% confidence face recognition with liveness check (blink/smile) to prevent photo spoofing.', formula: 'Face Match Confidence >= 98.5% | Liveness Active | 3 Consecutive Fails = HR Fraud Alert', config: { faceMatchThresholdPct: 98.5, livenessCheckRequired: true } },
      { code: 'POL-011', name: 'Dynamic IP Whitelisting & Wi-Fi BSSID Binding Policy', pillar: 3, pillarName: 'Pillar III: AI Security & Geofencing', category: 'IP & Wi-Fi Security', description: 'Restricts web portal check-ins to corporate IP CIDRs and office Wi-Fi router BSSIDs.', formula: 'Allowed IP CIDR: 182.73.10.0/24 | Allowed Wi-Fi BSSID: AA:BB:CC:DD:EE:FF', config: { ipWhitelistingEnabled: true, allowedCidrs: '182.73.10.0/24' } },
      { code: 'POL-012', name: 'Offline Punch Queueing & Clock-Tamper Detection Policy', pillar: 3, pillarName: 'Pillar III: AI Security & Geofencing', category: 'Offline Sync', description: 'Encrypted offline SQLite punch queueing with server NTP clock-drift audit checks.', formula: 'Max Queue Duration: 48 hrs | Max Allowed Clock Drift: 120 secs', config: { offlineModeAllowed: true, maxOfflineQueueAgeHours: 48 } },
      { code: 'POL-013', name: 'Rotational Roster & 11-Hour Minimum Rest Period Policy', pillar: 4, pillarName: 'Pillar IV: Rostering & Night Shifts', category: 'Shift Rest', description: 'ILO labor compliance requiring at least 11 hours of rest between consecutive shifts.', formula: 'Min Rest Hours Between Shifts = 11.0 hrs | Roster Notice SLA = 7 Days', config: { minRestHoursBetweenShifts: 11.0 } },
      { code: 'POL-014', name: 'Night Shift, Cross-Day Punch & Differential Allowance Policy', pillar: 4, pillarName: 'Pillar IV: Rostering & Night Shifts', category: 'Night Shift', description: 'Cross-midnight punch attribution to parent date and 20% night differential pay calculation.', formula: 'Parent Shift Date Logic | Night Window: 22:00 to 06:00 | Differential Rate = +20%', config: { nightShiftStart: '22:00', nightShiftEnd: '06:00', nightDifferentialPct: 20.0 } },
      { code: 'POL-015', name: 'On-Call Duty, Emergency Standby & Callback Compensation Policy', pillar: 4, pillarName: 'Pillar IV: Rostering & Night Shifts', category: 'On-Call', description: 'Credits standby hours and guarantees minimum 3-hour attendance credit for emergency callbacks.', formula: 'Standby Credit = 2.0 hrs per 12h block | Emergency Callback = Min 3.0 hrs credit guaranteed', config: { standbyCreditHoursPerBlock: 2.0, minCallbackGuaranteedHours: 3.0 } },
      { code: 'POL-016', name: 'Multi-Timezone, Remote Global Teams & DST Adjustment Policy', pillar: 4, pillarName: 'Pillar IV: Rostering & Night Shifts', category: 'Timezones', description: 'UTC database storage with branch-location timezone conversion and auto DST adjustment.', formula: 'Storage = UTC | Evaluation = Branch Timezone | Auto DST Shift = +/- 1 hour', config: { storageTimezone: 'UTC', evaluateInBranchTimezone: true } },
      { code: 'POL-017', name: 'Regularization & Missing Punch Approval SLA Policy', pillar: 5, pillarName: 'Pillar V: Regularization & Remote Work', category: 'Regularization', description: 'Limits monthly regularization applications to 3 with a strict 48-hour manager approval SLA.', formula: 'Max 3 regularizations/mo | Apply within 3 days | Manager SLA = 48 hours', config: { maxRegularizationsMonth: 3, applyWindowDays: 3, managerSlaHours: 48, autoApproveOnSlaExpire: false } },
      { code: 'POL-018', name: 'Hybrid Model & WFH Quota Policy', pillar: 5, pillarName: 'Pillar V: Regularization & Remote Work', category: 'WFH', description: 'Monthly WFH cap of 4 days with blacklisted anchor days (Tuesday & Thursday).', formula: 'Monthly WFH Quota = 4 Days | Blacklisted Days = Tuesday, Thursday | Photo on Check-In Required', config: { wfhMonthlyQuota: 4, blacklistedWfhDays: 'TUESDAY, THURSDAY' } },
      { code: 'POL-019', name: 'On-Duty (OD) & Field Visit Attendance Policy', pillar: 5, pillarName: 'Pillar V: Regularization & Remote Work', category: 'Field Duty', description: 'Field check-ins requiring GPS location tags, client names, and minimum 3 visits for full-day credit.', formula: 'Min 3 Field Visits/day = Full Day OD | GPS Breadcrumbs logged every 30m', config: { minFieldVisitsFullDay: 3, enableGpsBreadcrumbs: true } },
      { code: 'POL-020', name: 'Work-in-Transit & Flight/Train Travel Day Credit Policy', pillar: 5, pillarName: 'Pillar V: Regularization & Remote Work', category: 'Travel Credit', description: '100% attendance credit for official travel hours with mandatory 4-hour rest post overnight trips.', formula: 'Travel Hours = 100% Credit | Overnight Travel (>6h) = Full Day + 4h Rest Period', config: { travelFullDayCredit: true, overnightTravelRestHours: 4.0 } },
      { code: 'POL-021', name: 'Pre-Approved Overtime (OT) Tiering & Cap Policy', pillar: 6, pillarName: 'Pillar VI: Overtime & Comp-Off', category: 'Overtime', description: 'Requires OT pre-approval, 90-minute minimum threshold, and caps at 4h/day and 40h/month.', formula: 'OT Trigger = Extra > 90 mins | Daily Cap = 4.0 hrs | Monthly Cap = 40.0 hrs', config: { otPreApprovalRequired: true, minOtThresholdMins: 90, maxDailyOtHours: 4.0, maxMonthlyOtHours: 40.0 } },
      { code: 'POL-022', name: 'Compensatory Off (Comp-Off) Accumulation & Expiry Policy', pillar: 6, pillarName: 'Pillar VI: Overtime & Comp-Off', category: 'Comp-Off', description: 'Credits comp-off for weekend/holiday work with a 60-day expiry window and cap of 5 days.', formula: 'Work > 6.0 hrs = 1.0 Comp-Off | Work 4.0 - 6.0 hrs = 0.5 Comp-Off | Expiry = 60 Days | Max Balance = 5', config: { fullDayCompOffMinHours: 6.0, halfDayCompOffMinHours: 4.0, compOffExpiryDays: 60, maxCompOffBalance: 5.0 } },
      { code: 'POL-023', name: 'Callout / Emergency Overtime & Holiday Multiplier Policy', pillar: 6, pillarName: 'Pillar VI: Overtime & Comp-Off', category: 'OT Multipliers', description: 'Premium rate multipliers for weekday OT (1.5x), weekend OT (2.0x), and national holidays (3.0x).', formula: 'Weekday OT = 1.5x | Weekend OT = 2.0x | National Holiday OT = 3.0x base rate', config: { weekdayOtRate: 1.5, weekendOtRate: 2.0, nationalHolidayOtRate: 3.0 } },
      { code: 'POL-024', name: 'Comprehensive Sandwich Rule & Rest-Day Continuity Policy', pillar: 7, pillarName: 'Pillar VII: Sandwich Rule & Rest Days', category: 'Sandwich Rule', description: 'Treats weekends/holidays sandwiched between unapproved absences as Loss of Pay (LOP) days.', formula: 'Absent Friday + Absent Monday = 4 Days LOP (Fri + Sat + Sun + Mon deducted)', config: { sandwichEnabled: true, applyToWeekends: true, applyToPublicHolidays: true } },
      { code: 'POL-025', name: 'Restricted / Optional Holiday Swap & Regional Calendar Policy', pillar: 7, pillarName: 'Pillar VII: Sandwich Rule & Rest Days', category: 'Optional Holidays', description: 'Allows selection of 2 Restricted Holidays (RH) per year from a regional list of 10 choices.', formula: 'Annual RH Quota = 2 Days | Must apply 7 days prior', config: { annualRhQuota: 2, rhNoticeDays: 7 } },
      { code: 'POL-026', name: 'Compensatory Working Days (Working Weekends) Policy', pillar: 7, pillarName: 'Pillar VII: Sandwich Rule & Rest Days', category: 'Working Saturdays', description: 'Company-declared working Saturdays to compensate for extended festival closures.', formula: 'Declared Working Saturday = Mandatory Standard Weekday', config: { compWorkingDayOverride: true } },
      { code: 'POL-027', name: 'Auto-Absent, Auto-Clock-Out & Phantom Punch Elimination Policy', pillar: 8, pillarName: 'Pillar VIII: Cleanup & Payroll Lock', category: 'Auto Cleanup', description: 'Auto-clocks out orphan check-ins at shift end and runs 01:00 AM auto-absent rollup cron.', formula: 'Single Punch at 23:59 -> Auto Clock-Out at Shift End | Cron at 01:00 AM marks Unpunched as ABSENT', config: { autoClockOutTime: 'SHIFT_END', autoAbsentCronSchedule: '0 1 * * *' } },
      { code: 'POL-028', name: 'Loss of Pay (LOP), Auto-Leave Encashment & Payroll Freeze Policy', pillar: 8, pillarName: 'Pillar VIII: Cleanup & Payroll Lock', category: 'Payroll Lock', description: 'Freezes attendance on 25th of every month for automated LOP calculation and salary processing.', formula: 'Payroll Cutoff = 25th 23:59 | Payable Days = Total Days - LOP Days - Late Penalties', config: { payrollFreezeDay: 25, allowRetroAdjustments: true } },
      { code: 'POL-029', name: 'Attendance Escalation, HRBP Notice & Abandonment Policy', pillar: 8, pillarName: 'Pillar VIII: Cleanup & Payroll Lock', category: 'HR Escalations', description: '3-level automated managerial and HRBP notice escalation for systemic attendance degradation.', formula: 'Level 1 (3 Lates) = Employee/Mgr Email | Level 2 (2 AWOL) = HRBP Alert | Level 3 (5 Consecutive AWOL) = Abandonment Letter', config: { level1LateThreshold: 3, level2AbsenceThreshold: 2, level3AbandonmentDays: 5 } },
      { code: 'POL-030', name: 'Audit Logging, Historical Correction & Compliance Retention Policy', pillar: 8, pillarName: 'Pillar VIII: Cleanup & Payroll Lock', category: 'Compliance Audit', description: 'Immutable 7-year audit logging requiring mandatory reason entry and admin re-authentication.', formula: 'Retention = 7 Years | Admin Reason Required = True | Re-Auth Password = Required', config: { auditReasonMandatory: true, adminReauthRequired: true, retentionPeriodYears: 7 } }
    ];

    for (const item of initialSeed) {
      const rowData = {
        organization_id: ctx.organizationId,
        code: item.code,
        name: item.name,
        working_hours_per_day: item.config?.workingHoursPerDay || 8.5,
        grace_period_minutes: item.config?.gracePeriodMinutes || 15,
        overtime_enabled: true,
        status: 'active',
        is_default: true,
        rules_config: JSON.stringify({
          pillar: item.pillar,
          pillarName: item.pillarName,
          category: item.category,
          description: item.description,
          businessRationale: item.description,
          calculationFormula: item.formula,
          edgeCaseProtocol: 'Standard HR escalation protocol applies.',
          applicableTo: 'All Employees',
          isMandatory: true,
          assignedDepartments: ['All Departments'],
          config: item.config
        }),
        created_by: ctx.userId || 1,
        updated_by: ctx.userId || 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('attendance_policies').insert(rowData);
      } catch (e) {
        // Skip duplicates if partially seeded
      }
    }
  }
}
