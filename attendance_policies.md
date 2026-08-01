# ApponextHRMS - Enterprise Attendance Policies Master Specification

## Executive Overview
Attendance Policies in **ApponextHRMS** form the operational backbone of workforce management, compliance, productivity tracking, and automated payroll generation. 

This document serves as the **Ultimate Enterprise Master Specification** covering **30 Comprehensive Attendance Policies** across 8 operational pillars. Each policy details business rationales, mathematical formulas, edge-case protocols, configurable parameters, system data models, and API interfaces tailored for ApponextHRMS.

---

## Table of Contents
1. [Pillar I: Core Work Hours & Time Credit Policies](#pillar-i-core-work-hours--time-credit-policies)
2. [Pillar II: Punctuality, Grace Periods & Absence Penalties](#pillar-ii-punctuality-grace-periods--absence-penalties)
3. [Pillar III: Multi-Channel Capture, Anti-Spoofing & AI Security](#pillar-iii-multi-channel-capture-anti-spoofing--ai-security)
4. [Pillar IV: Shift Rostering, Night Differential & Multi-Timezone Rules](#pillar-iv-shift-rostering-night-differential--multi-timezone-rules)
5. [Pillar V: Regularization, Remote Work & Field Duty Management](#pillar-v-regularization-remote-work--field-duty-management)
6. [Pillar VI: Overtime (OT), Comp-Off & Premium Rates](#pillar-vi-overtime-ot-comp-off--premium-rates)
7. [Pillar VII: Calendar Continuity, Sandwich Rules & Rest Days](#pillar-vii-calendar-continuity-sandwich-rules--rest-days)
8. [Pillar VIII: Automated Cleanup, Payroll Integration & Audit Compliance](#pillar-viii-automated-cleanup-payroll-integration--audit-compliance)
9. [Complete Data Schemas & Database Models](#complete-data-schemas--database-models)
10. [Master Policy Configuration Matrix](#master-policy-configuration-matrix)

---

## Pillar I: Core Work Hours & Time Credit Policies

### Policy 1: Standard Working Hours & Attendance Threshold Policy
* **Business Rationale:** Defines standard daily and weekly expected work output and establishes strict mathematical boundaries for full-day, half-day, or absent credit.
* **Mathematical Calculation:**
  $$\text{Effective Work Hours} = \text{Total Clock Duration} - \text{Deductible Break Duration}$$
  * **Full-Day Credit ($1.0$):** $\text{Effective Work Hours} \ge 7.5\text{ hrs}$
  * **Half-Day Credit ($0.5$):** $4.0\text{ hrs} \le \text{Effective Work Hours} < 7.5\text{ hrs}$
  * **Zero Credit / Absent ($0.0$):** $\text{Effective Work Hours} < 4.0\text{ hrs}$
* **Edge Case:** If an employee completes $7.48$ hours due to system lag, a $2$-minute round-up buffer applies.
* **Config Parameters:**
  ```json
  {
    "workingHoursPerDay": 8.5,
    "fullDayMinHours": 7.5,
    "halfDayMinHours": 4.0,
    "roundingBufferMinutes": 5
  }
  ```

### Policy 2: Flexi-Time & Mandatory Core Hours Policy
* **Business Rationale:** Accommodates flexible working hours while guaranteeing cross-team collaboration during core business hours.
* **Rules & Logic:**
  * **Earliest Check-In Allowed:** 07:00 AM; **Latest Check-Out Allowed:** 10:00 PM.
  * **Mandatory Core Hours Window:** 11:00 AM to 04:00 PM. Employees *must* be logged in throughout core hours regardless of when they start.
  * Absence during any part of core hours without approved short leave flags a `Core Hours Violation`.
* **Config Parameters:**
  ```json
  {
    "flexiEnabled": true,
    "coreHoursStart": "11:00",
    "coreHoursEnd": "16:00",
    "earliestCheckIn": "07:00",
    "latestCheckOut": "22:00"
  }
  ```

### Policy 3: Break & Meal Period Tracking Policy
* **Business Rationale:** Ensures statutory health break compliance and prevents unrecorded extended break absences.
* **Rules & Logic:**
  * Standard lunch break: 45 minutes (auto-deducted if not manually punched).
  * Tea/Coffee breaks: Up to two 15-minute breaks per day (non-deductible).
  * Extended break rule: Break duration exceeding 60 minutes continuously is automatically appended to total late/early-exit deficit time.
* **Config Parameters:**
  ```json
  {
    "autoDeductMealBreak": true,
    "mealBreakMinutes": 45,
    "maxTeaBreaks": 2,
    "teaBreakMinutes": 15,
    "excessBreakThresholdMinutes": 60
  }
  ```

### Policy 4: Partial Day & Hourly Permission Policy
* **Business Rationale:** Permits employees to handle brief personal errands during work hours without burning a half-day leave.
* **Rules & Logic:**
  * Maximum 2 hourly permissions per month (up to 2 hours per instance).
  * Permission must be pre-approved by immediate manager at least 2 hours prior.
  * Exceeding 2 hours automatically converts the request into a Half-Day Casual Leave.
* **Config Parameters:**
  ```json
  {
    "maxPermissionsPerMonth": 2,
    "maxHoursPerPermission": 2.0,
    "exceedConvertsTo": "HALF_DAY_LEAVE"
  }
  ```

---

## Pillar II: Punctuality, Grace Periods & Absence Penalties

### Policy 5: Grace Period & Multi-Tier Late-In / Early-Exit Penalty Policy
* **Business Rationale:** Enforces punctuality while granting reasonable operational grace for traffic or transit delays.
* **Graduated Penalty Tiers:**
  * **Tier 0 (Grace):** $0 - 15\text{ mins}$ post shift start $\rightarrow$ No penalty.
  * **Tier 1 (Mild Delay):** $16 - 30\text{ mins}$ late $\rightarrow$ Logged as `Late Mark`. 3 Late Marks in a month = 0.5 Day Leave Deduction.
  * **Tier 2 (Severe Delay):** $31 - 90\text{ mins}$ late $\rightarrow$ Logged as `Severe Late`. 2 Severe Lates = 0.5 Day LOP.
  * **Tier 3 (Half-Day Absent):** $> 90\text{ mins}$ late $\rightarrow$ First Half marked `ABSENT` automatically.
* **Config Parameters:**
  ```json
  {
    "gracePeriodMinutes": 15,
    "tier1LateMinutes": 30,
    "tier2LateMinutes": 90,
    "lateMarkDeductionRatio": 3, // 3 late marks = 0.5 day
    "penaltyDeductionBucket": "CL_PL_LOP"
  }
  ```

### Policy 6: Short Leave & Gate Pass Verification Policy
* **Business Rationale:** Manages physical movement in and out of company premises during active shift hours.
* **Rules & Logic:**
  * Gate Pass generated via mobile app QR code upon manager approval.
  * Security guard scans QR at turnstile/gate to record exact out-time and in-time.
  * Unreturned Gate Pass beyond shift end triggers an automatic security alert to HR.
* **Config Parameters:**
  ```json
  {
    "gatePassRequired": true,
    "qrValidationEnabled": true,
    "unreturnedGatePassAlertMins": 30
  }
  ```

### Policy 7: Habitual Absenteeism & Unauthorized Absence (AWOL) Policy
* **Business Rationale:** Addresses chronic tardiness and unexcused abandonment of duty.
* **Rules & Logic:**
  * **Unexcused Absence (AWOL):** No punch + No leave application within 24 hours of shift start.
  * **3 Consecutive Days AWOL:** Triggers Level-1 automated HR Show-Cause Notice via Email/SMS.
  * **7 Consecutive Days AWOL:** Deemed voluntary abandonment of employment; account locked for legal investigation.
* **Config Parameters:**
  ```json
  {
    "awolNoticeDays": 3,
    "awolTerminationDays": 7,
    "autoLockOnAwol": true
  }
  ```

### Policy 8: Probationary & Intern Attendance Strictness Policy
* **Business Rationale:** Applies higher attendance compliance standards for employees under evaluation periods.
* **Rules & Logic:**
  * Probationers/Interns are allowed zero late mark waivers per month (Grace period reduced to 10 mins).
  * WFH privileges disabled during the first 90 days of employment unless explicitly approved by HR Director.
  * Attendance percentage $< 95\%$ during probation automatically extends probation by 30 days.
* **Config Parameters:**
  ```json
  {
    "probationGraceMinutes": 10,
    "probationWfhAllowed": false,
    "minProbationAttendancePct": 95.0
  }
  ```

---

## Pillar III: Multi-Channel Capture, Anti-Spoofing & AI Security

### Policy 9: Geofence Bounds & GPS Spoofing Prevention Policy
* **Business Rationale:** Ensures field and mobile punches occur within legitimate geographic radii while blocking mock locations.
* **Rules & Logic:**
  * Radial Geofence: Punch allowed only within $R$ meters (e.g., $100\text{m}$) of branch latitude/longitude.
  * Polygon Geofence: Custom multi-point boundary maps for large manufacturing plants or tech parks.
  * Anti-Spoof Engine: Mobile app checks device developer settings; if `Mock Location Enabled` or VPN detected $\rightarrow$ Punch rejected & security log created.
* **Config Parameters:**
  ```json
  {
    "geofenceMode": "POLYGON_AND_RADIUS",
    "defaultRadiusMeters": 100,
    "blockMockLocations": true,
    "blockVpnPunches": true
  }
  ```

### Policy 10: Biometric Liveness Detection & Face-Match Policy
* **Business Rationale:** Eliminates buddy-punching, photo presentation attacks, and 3D mask fraud on attendance kiosks.
* **Rules & Logic:**
  * Face recognition requires active liveness check (blink/smile/depth sensor analysis).
  * Minimum confidence threshold score $\ge 98.5\%$.
  * Failed attempts ($3$ consecutive fails) capture a snapshot and send a Fraud Alert to HR.
* **Config Parameters:**
  ```json
  {
    "faceMatchThresholdPct": 98.5,
    "livenessCheckRequired": true,
    "maxFailedAttemptsAlert": 3
  }
  ```

### Policy 11: Dynamic IP Whitelisting & Wi-Fi BSSID Binding Policy
* **Business Rationale:** Restricts web portal check-ins to authorized company office networks.
* **Rules & Logic:**
  * Web portal punch requires request IP to match whitelisted static CIDR blocks.
  * Mobile app Wi-Fi punch validates office Router MAC Address (BSSID). Connected to guest Wi-Fi $\rightarrow$ Punch blocked.
* **Config Parameters:**
  ```json
  {
    "ipWhitelistingEnabled": true,
    "allowedCidrs": ["182.73.10.0/24"],
    "bssidBindingEnabled": true,
    "allowedBssids": ["AA:BB:CC:DD:EE:FF"]
  }
  ```

### Policy 12: Offline Punch Queueing & Clock-Tamper Detection Policy
* **Business Rationale:** Guarantees attendance logging during network outages while preventing manual device time manipulation.
* **Rules & Logic:**
  * Offline punches encrypted and stored in local device SQLite queue.
  * Device Clock Drift Check: Punch timestamp compared against Server NTP time upon sync. If drift $> 120\text{ seconds}$ $\rightarrow$ Flagged for audit review.
* **Config Parameters:**
  ```json
  {
    "offlineModeAllowed": true,
    "maxOfflineQueueAgeHours": 48,
    "maxAllowedClockDriftSec": 120
  }
  ```

---

## Pillar IV: Shift Rostering, Night Differential & Multi-Timezone Rules

### Policy 13: Rotational Roster & 11-Hour Minimum Rest Period Policy
* **Business Rationale:** Prevents employee burnout and complies with international labor laws (ILO) regarding rest between shifts.
* **Rules & Logic:**
  * **Mandatory Rest Period (11-Hour Rule):** Minimum 11 consecutive hours of rest required between end of previous shift and start of next shift.
  * System blocks assignment of a Morning Shift (06:00 AM) if employee worked Night Shift (ends 11:00 PM previous night).
  * Shift Roster change notice SLA: Roster published minimum 7 days in advance.
* **Config Parameters:**
  ```json
  {
    "minRestHoursBetweenShifts": 11.0,
    "rosterPublishNoticeDays": 7,
    "allowBackToBackDoubleShifts": false
  }
  ```

### Policy 14: Night Shift, Cross-Day Punch & Differential Allowance Policy
* **Business Rationale:** Correctly attributes punches crossing 12:00 AM Midnight to the parent shift date and calculates night shift compensation premiums.
* **Rules & Logic:**
  * **Parent Date Logic:** Shift starting at 10:00 PM on July 31 and ending at 07:00 AM on Aug 1 belongs entirely to **July 31**.
  * **Night Shift Premium:** Hours worked between 10:00 PM and 06:00 AM earn an extra $20\%$ differential hourly rate.
* **Config Parameters:**
  ```json
  {
    "crossDayCutoffHour": 12, // Cutoff window hours for next day punches
    "nightShiftStart": "22:00",
    "nightShiftEnd": "06:00",
    "nightDifferentialPct": 20.0
  }
  ```

### Policy 15: On-Call Duty, Emergency Standby & Callback Compensation Policy
* **Business Rationale:** Governs attendance credits for IT/Operations personnel on standby or called in for unexpected emergencies.
* **Rules & Logic:**
  * **Standby Allowance:** 2 hours of attendance credit given per 12-hour standby block (even if no callout occurs).
  * **Emergency Callback:** If called in to work during off-shift hours $\rightarrow$ Guaranteed minimum 3 hours attendance credit regardless of actual time spent.
* **Config Parameters:**
  ```json
  {
    "standbyCreditHoursPerBlock": 2.0,
    "minCallbackGuaranteedHours": 3.0
  }
  ```

### Policy 16: Multi-Timezone, Remote Global Teams & DST Adjustment Policy
* **Business Rationale:** Ensures seamless attendance tracking across global offices operating in distinct timezones and observing Daylight Saving Time.
* **Rules & Logic:**
  * All database timestamps stored in UTC (`TIMESTAMP WITH TIME ZONE`).
  * Attendance evaluation evaluates punches against the *Branch Location Timezone*, not employee mobile timezone.
  * Automatic DST shifting adjusts shift start/end times by $\pm 1$ hour on statutory transition dates.
* **Config Parameters:**
  ```json
  {
    "storageTimezone": "UTC",
    "evaluateInBranchTimezone": true,
    "autoAdjustDst": true
  }
  ```

---

## Pillar V: Regularization, Remote Work & Field Duty Management

### Policy 17: Regularization & Missing Punch Approval SLA Policy
* **Business Rationale:** Standardizes missing punch corrections while curbing retrospective attendance manipulation.
* **Rules & Logic:**
  * Max 3 regularizations allowed per calendar month.
  * Must be applied within 3 calendar days of occurrence.
  * **Manager Approval SLA:** 48 hours. If manager fails to act within 48 hours $\rightarrow$ Auto-escalated to Department Head; at 72 hours $\rightarrow$ System auto-approves if employee has clean record.
* **Config Parameters:**
  ```json
  {
    "maxRegularizationsMonth": 3,
    "applyWindowDays": 3,
    "managerSlaHours": 48,
    "autoApproveOnSlaExpire": false
  }
  ```

### Policy 18: Hybrid Model & WFH Quota Policy
* **Business Rationale:** Governs hybrid work arrangements while enforcing team presence in office.
* **Rules & Logic:**
  * **Monthly WFH Cap:** Max 4 days per month for eligible employees.
  * **Anchor Days Rule:** Tuesdays and Thursdays designated as mandatory In-Office days (WFH requests auto-blocked).
  * Remote Check-in requires webcam snapshot + task plan submission.
* **Config Parameters:**
  ```json
  {
    "wfhMonthlyQuota": 4,
    "blacklistedWfhDays": ["TUESDAY", "THURSDAY"],
    "requirePhotoOnWfhCheckIn": true
  }
  ```

### Policy 19: On-Duty (OD) & Field Visit Attendance Policy
* **Business Rationale:** Validates attendance for sales, audit, and field staff who do not report to a physical office.
* **Rules & Logic:**
  * Field Check-Ins require GPS location tag + Client Name + Purpose of Visit.
  * Minimum 3 field visits logged per day = Full Day OD Attendance Credit.
  * Distance travelled automatically computed via GPS breadcrumbs for travel reimbursement linkage.
* **Config Parameters:**
  ```json
  {
    "minFieldVisitsFullDay": 3,
    "enableGpsBreadcrumbs": true,
    "breadcrumbIntervalMinutes": 30
  }
  ```

### Policy 20: Work-in-Transit & Flight/Train Travel Day Credit Policy
* **Business Rationale:** Fairly credits working hours for employees travelling on official domestic or international business trips.
* **Rules & Logic:**
  * Travel during regular work hours $\rightarrow$ 100% Full-Day Attendance Credit.
  * Overnight travel (Flight/Train $> 6\text{ hours}$) $\rightarrow$ Full Day Credit + mandatory 4-hour rest period prior to next shift reporting.
* **Config Parameters:**
  ```json
  {
    "travelFullDayCredit": true,
    "overnightTravelRestHours": 4.0
  }
  ```

---

## Pillar VI: Overtime (OT), Comp-Off & Premium Rates

### Policy 21: Pre-Approved Overtime (OT) Tiering & Cap Policy
* **Business Rationale:** Controls overtime costs and prevents unauthorized extra hours billing.
* **Tiered OT Formula:**
  $$\text{OT Hours} = \max(0, \text{Actual Hours} - \text{Standard Hours} - \text{Buffer})$$
  * **Minimum threshold to trigger OT:** 1.5 extra hours.
  * **Daily OT Cap:** Maximum 4.0 OT hours per day.
  * **Monthly OT Cap:** Maximum 40.0 OT hours per month (Statutory compliance limit).
* **Config Parameters:**
  ```json
  {
    "otPreApprovalRequired": true,
    "minOtThresholdMins": 90,
    "maxDailyOtHours": 4.0,
    "maxMonthlyOtHours": 40.0
  }
  ```

### Policy 22: Compensatory Off (Comp-Off) Accumulation & Expiry Policy
* **Business Rationale:** Credits time-off in lieu of monetary overtime pay for weekend or holiday work.
* **Rules & Logic:**
  * Working $> 6$ hours on Weekend/Holiday = $1.0$ Comp-Off Credit.
  * Working $4.0 - 6.0$ hours = $0.5$ Comp-Off Credit.
  * **Comp-Off Expiry:** Credits lapse automatically after 60 calendar days if unredeemed. Max 5 active Comp-Off credits balance at any time.
* **Config Parameters:**
  ```json
  {
    "fullDayCompOffMinHours": 6.0,
    "halfDayCompOffMinHours": 4.0,
    "compOffExpiryDays": 60,
    "maxCompOffBalance": 5.0
  }
  ```

### Policy 23: Callout / Emergency Overtime & Holiday Multiplier Policy
* **Business Rationale:** Compenses employees working on statutory National Holidays or emergency callouts at premium rates.
* **Multiplier Schedule:**
  * **Regular Weekday OT:** $1.5\times$ base hourly rate.
  * **Scheduled Weekend OT:** $2.0\times$ base hourly rate.
  * **National Holiday OT (e.g., Independence Day):** $3.0\times$ base hourly rate OR $1.0\text{ Comp-Off} + 1.5\times\text{ Pay}$.
* **Config Parameters:**
  ```json
  {
    "weekdayOtRate": 1.5,
    "weekendOtRate": 2.0,
    "nationalHolidayOtRate": 3.0
  }
  ```

---

## Pillar VII: Calendar Continuity, Sandwich Rules & Rest Days

### Policy 24: Comprehensive Sandwich Rule & Rest-Day Continuity Policy
* **Business Rationale:** Disincentivizes unauthorized extension of weekends or holidays by taking leaves on bookend working days.
* **Sandwich Matrix:**
  | Friday Status | Saturday / Sunday | Monday Status | System Calculation Result |
  | :--- | :--- | :--- | :--- |
  | **ABSENT (Unapproved)** | Weekend | **ABSENT (Unapproved)** | **4 Days LOP** (Weekend Included) |
  | **ABSENT (Unapproved)** | Weekend | Present | **1 Day LOP** (Friday Only) |
  | Approved Leave | Weekend | **ABSENT (Unapproved)** | **1 Day LOP** (Monday Only) |
  | Approved Leave | Weekend | Approved Leave | **2 Days Leave** (Standard) |
* **Config Parameters:**
  ```json
  {
    "sandwichEnabled": true,
    "applyToWeekends": true,
    "applyToPublicHolidays": true,
    "requireUnapprovedBookends": true
  }
  ```

### Policy 25: Restricted / Optional Holiday Swap & Regional Calendar Policy
* **Business Rationale:** Supports diverse workforce cultural preferences by allowing employees to select optional holidays.
* **Rules & Logic:**
  * Employees granted 2 Restricted Holidays (RH) per calendar year from a regional list of 10 choices.
  * RH must be applied at least 7 days prior; presence on chosen RH is auto-credited as a Holiday.
* **Config Parameters:**
  ```json
  {
    "annualRhQuota": 2,
    "rhNoticeDays": 7,
    "regionalCalendarsEnabled": true
  }
  ```

### Policy 26: Compensatory Working Days (Working Weekends) Policy
* **Business Rationale:** Handles company-declared working Saturdays to compensate for extended festival closures (e.g., Diwali week).
* **Rules & Logic:**
  * Declared Compensatory Working Day acts as a mandatory standard weekday.
  * Absence on a declared working weekend deducts leave/LOP under standard Policy 1 rules.
* **Config Parameters:**
  ```json
  {
    "compWorkingDayOverride": true,
    "standardWeekdayRulesApply": true
  }
  ```

---

## Pillar VIII: Automated Cleanup, Payroll Integration & Audit Compliance

### Policy 27: Auto-Absent, Auto-Clock-Out & Phantom Punch Elimination Policy
* **Business Rationale:** Cleans up orphan check-ins and unpunched days before daily attendance rollup engine executes.
* **Rules & Logic:**
  * **Phantom Punch Fix:** Single Check-in with no Check-out by 23:59:59 $\rightarrow$ Auto-clock out inserted at `Shift End Time` + flagged `MISSING_CHECK_OUT`.
  * **Auto-Absent Engine:** Daily job runs at 01:00 AM for previous day. Unpunched employees without approved leave/OD/WFH $\rightarrow$ Flagged `ABSENT_UNEXCUSED`.
* **Config Parameters:**
  ```json
  {
    "autoClockOutTime": "SHIFT_END",
    "autoAbsentCronSchedule": "0 1 * * *",
    "flagMissingPunches": true
  }
  ```

### Policy 28: Loss of Pay (LOP), Auto-Leave Encashment & Payroll Freeze Policy
* **Business Rationale:** Converts finalized monthly attendance metrics into precise payroll salary deduction inputs.
* **Rules & Logic:**
  * **Attendance Lock Date:** 25th of every month at 11:59 PM. Post-cutoff edits roll over to next month's payroll retro-adjustment bucket.
  * **LOP Formula:**
    $$\text{Payable Days} = \text{Total Days in Month} - \text{Unexcused LOP Days} - \text{Late Penalty LOP}$$
* **Config Parameters:**
  ```json
  {
    "payrollFreezeDay": 25,
    "allowRetroAdjustments": true,
    "lopDeductionPriority": ["CASUAL_LEAVE", "PRIVILEGE_LEAVE", "LOSS_OF_PAY"]
  }
  ```

### Policy 29: Attendance Escalation, HRBP Notice & Abandonment Policy
* **Business Rationale:** Automates managerial alerts for systemic employee attendance degradation.
* **Rules & Logic:**
  * **Level 1 Alert:** 3 Late Marks in a month $\rightarrow$ Email to Employee & Manager.
  * **Level 2 Alert:** 2 Unexcused Absences $\rightarrow$ Email to Department Head & HRBP.
  * **Level 3 Alert:** 5 Consecutive Absences $\rightarrow$ Automatic registered letter trigger for employment abandonment.
* **Config Parameters:**
  ```json
  {
    "level1LateThreshold": 3,
    "level2AbsenceThreshold": 2,
    "level3AbandonmentDays": 5
  }
  ```

### Policy 30: Audit Logging, Historical Correction & Compliance Retention Policy
* **Business Rationale:** Maintains legally defensible, tamper-evident audit trails for labor inspectorate compliance.
* **Rules & Logic:**
  * Any attendance record modification by HR/Admin requires mandatory reason text entry + secondary admin password verification.
  * Immutable audit log stores: `Old Punch`, `New Punch`, `Modified By User ID`, `Timestamp`, `IP Address`, `Reason`.
  * Historical retention: Attendance records archived and retained for minimum 7 years.
* **Config Parameters:**
  ```json
  {
    "auditReasonMandatory": true,
    "adminReauthRequired": true,
    "retentionPeriodYears": 7
  }
  ```

---

## Complete Data Schemas & Database Migration Strategy

### 1. Existing Database Audit (ApponextHRMS Baseline)

ApponextHRMS currently possesses an initial version of `attendance_policies` and `attendance_policies_mapping` in `database/latest_DB/hrms.sql` and migration `20260713000009_create_attendance_policies.ts`:

* **Existing `attendance_policies` columns:**
  `id`, `uuid`, `organization_id`, `name`, `code`, `is_default`, `working_hours_per_day`, `grace_period_minutes`, `overtime_enabled`, `overtime_rules` (JSON), `shift_policies` (JSON), `status`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`.
* **Existing `attendance_policies_mapping` columns:**
  `id`, `uuid`, `organization_id`, `employee_id`, `attendance_policy_id`, `shift_id`, `grace_period_minutes`, `effective_from`, `effective_to`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`.

---

### 2. Database ALTER Strategy for Existing `attendance_policies` Table

To avoid dropping or recreating active production tables, we apply non-breaking `ALTER TABLE` statements to extend the existing `attendance_policies` table with explicit structured columns and a consolidated `rules_config` JSON bucket for fine-grained policy control.

#### Raw SQL ALTER Script (MySQL / MariaDB / PostgreSQL Compatible)

```sql
-- Step 1: Extend attendance_policies with structured threshold & rule columns
ALTER TABLE attendance_policies
  ADD COLUMN full_day_min_hours DECIMAL(4,2) DEFAULT 7.50 AFTER working_hours_per_day,
  ADD COLUMN half_day_min_hours DECIMAL(4,2) DEFAULT 4.00 AFTER full_day_min_hours,
  ADD COLUMN break_duration_minutes INT DEFAULT 45 AFTER grace_period_minutes,
  ADD COLUMN sandwich_rule_enabled TINYINT(1) DEFAULT 1 AFTER overtime_enabled,
  ADD COLUMN payroll_cutoff_day INT DEFAULT 25 AFTER status,
  ADD COLUMN rules_config JSON DEFAULT NULL AFTER shift_policies;

-- Step 2: Create Auxiliary Table for Short Leave / Gate Passes (Policy 6)
CREATE TABLE IF NOT EXISTS attendance_gate_passes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  organization_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  pass_date DATE NOT NULL,
  out_time TIMESTAMP NULL,
  in_time TIMESTAMP NULL,
  duration_minutes INT DEFAULT 0,
  purpose VARCHAR(255) NOT NULL,
  qr_code_token VARCHAR(255) NOT NULL UNIQUE,
  status ENUM('requested', 'approved', 'active', 'completed', 'expired', 'rejected') DEFAULT 'requested',
  approved_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Step 3: Create Auxiliary Table for Immutable Audit Trail (Policy 30)
CREATE TABLE IF NOT EXISTS attendance_audit_trail (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  organization_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  field_changed VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  modified_by BIGINT UNSIGNED NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (modified_by) REFERENCES users(id)
);
```

---

### 3. Production Knex Migration Script

Create file `database/migrations/20260801000001_enhance_attendance_policies.ts`:

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Enhance attendance_policies table
  const hasAttendancePolicies = await knex.schema.hasTable('attendance_policies');
  if (hasAttendancePolicies) {
    await knex.schema.alterTable('attendance_policies', (table) => {
      table.decimal('full_day_min_hours', 4, 2).defaultTo(7.50).after('working_hours_per_day');
      table.decimal('half_day_min_hours', 4, 2).defaultTo(4.00).after('full_day_min_hours');
      table.integer('break_duration_minutes').defaultTo(45).after('grace_period_minutes');
      table.boolean('sandwich_rule_enabled').defaultTo(true).after('overtime_enabled');
      table.integer('payroll_cutoff_day').defaultTo(25).after('status');
      table.json('rules_config').nullable().after('shift_policies');
    });
  }

  // 2. Create Gate Passes Table
  const hasGatePasses = await knex.schema.hasTable('attendance_gate_passes');
  if (!hasGatePasses) {
    await knex.schema.createTable('attendance_gate_passes', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.date('pass_date').notNullable();
      table.timestamp('out_time').nullable();
      table.timestamp('in_time').nullable();
      table.integer('duration_minutes').defaultTo(0);
      table.string('purpose', 255).notNullable();
      table.string('qr_code_token', 255).notNullable().unique();
      table.enum('status', ['requested', 'approved', 'active', 'completed', 'expired', 'rejected']).defaultTo('requested');
      table.bigInteger('approved_by').unsigned().nullable();
      table.timestamps(true, true);

      table.foreign('organization_id').references('organizations.id');
      table.foreign('employee_id').references('employees.id');
      table.foreign('approved_by').references('users.id');
    });
  }

  // 3. Create Audit Trail Table
  const hasAuditTrail = await knex.schema.hasTable('attendance_audit_trail');
  if (!hasAuditTrail) {
    await knex.schema.createTable('attendance_audit_trail', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.date('attendance_date').notNullable();
      table.string('field_changed', 100).notNullable();
      table.text('old_value').nullable();
      table.text('new_value').nullable();
      table.text('reason').notNullable();
      table.bigInteger('modified_by').unsigned().notNullable();
      table.string('ip_address', 45).nullable();
      table.string('user_agent', 255).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('employee_id').references('employees.id');
      table.foreign('modified_by').references('users.id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_audit_trail');
  await knex.schema.dropTableIfExists('attendance_gate_passes');
  
  const hasAttendancePolicies = await knex.schema.hasTable('attendance_policies');
  if (hasAttendancePolicies) {
    await knex.schema.alterTable('attendance_policies', (table) => {
      table.dropColumns(
        'full_day_min_hours',
        'half_day_min_hours',
        'break_duration_minutes',
        'sandwich_rule_enabled',
        'payroll_cutoff_day',
        'rules_config'
      );
    });
  }
}
```

---

### 4. Structure of `rules_config` JSON Column

The newly added `rules_config` JSON column inside `attendance_policies` allows storing all 30 policy parameters dynamically without needing further database migrations:

```json
{
  "flexiRules": {
    "enabled": true,
    "coreHoursStart": "11:00",
    "coreHoursEnd": "16:00"
  },
  "punctualityRules": {
    "tier1LateMinutes": 30,
    "tier2LateMinutes": 90,
    "lateMarkDeductionRatio": 3
  },
  "securityRules": {
    "geofenceMode": "POLYGON_AND_RADIUS",
    "defaultRadiusMeters": 100,
    "blockMockLocations": true,
    "blockVpnPunches": true,
    "faceMatchThresholdPct": 98.5,
    "ipWhitelistingEnabled": true,
    "allowedCidrs": ["182.73.10.0/24"]
  },
  "shiftRules": {
    "minRestHoursBetweenShifts": 11.0,
    "nightShiftStart": "22:00",
    "nightShiftEnd": "06:00",
    "nightDifferentialPct": 20.0
  },
  "wfhRules": {
    "monthlyQuota": 4,
    "blacklistedDays": ["TUESDAY", "THURSDAY"]
  },
  "sandwichRules": {
    "applyToWeekends": true,
    "applyToPublicHolidays": true
  },
  "cleanupRules": {
    "autoAbsentCronSchedule": "0 1 * * *",
    "autoClockOutTime": "SHIFT_END"
  }
}
```

---

## Master Policy Configuration Matrix

| # | Policy Category & Name | Primary Key System Parameter | Default Enterprise Standard Value |
| :--- | :--- | :--- | :--- |
| **1** | Standard Work Hours & Credit | `fullDayMinHours` / `halfDayMinHours` | `7.5 hrs Full-Day / 4.0 hrs Half-Day` |
| **2** | Flexi-Time & Core Hours | `coreHoursStart` – `coreHoursEnd` | `Mandatory Core Hours: 11:00 AM – 04:00 PM` |
| **3** | Break & Meal Monitoring | `mealBreakMinutes` / `autoDeduct` | `45 mins Auto-Deducted Lunch Break` |
| **4** | Partial Day Permission | `maxPermissionsPerMonth` | `2 Permissions/month (Max 2 hrs each)` |
| **5** | Multi-Tier Grace & Late Marks | `gracePeriodMinutes` / `lateRatio` | `15 mins Grace / 3 Late Marks = 0.5 Day Leave` |
| **6** | Gate Pass & Short Leave | `gatePassRequired` / `qrScan` | `QR Security Scan Mandatory for Mid-Shift Exit` |
| **7** | AWOL & Habitual Absence | `awolNoticeDays` / `lockDays` | `3 Days AWOL = Show Cause / 7 Days = Termination` |
| **8** | Probation Strictness | `probationGraceMinutes` | `10 mins Grace / 0 WFH Allowed in first 90 days` |
| **9** | Geofence & GPS Anti-Spoof | `geofenceRadiusMeters` | `100m Geofence Radius + Mock Location Block` |
| **10**| Biometric Face & Liveness | `livenessCheckRequired` | `Face Match >= 98.5% + Active Liveness` |
| **11**| IP & BSSID Whitelisting | `allowedCidrs` / `allowedBssids` | `Office Static IP + Router BSSID Binding` |
| **12**| Offline Queue & Clock Drift | `maxAllowedClockDriftSec` | `48-hr Queue / Max 120s Clock Drift` |
| **13**| 11-Hour Minimum Rest Period | `minRestHoursBetweenShifts` | `11 Hours Mandatory Rest between shifts` |
| **14**| Night Shift & Differential | `nightDifferentialPct` | `Cross-day parent date + 20% Night Shift Pay` |
| **15**| On-Call Duty & Callout | `minCallbackGuaranteedHours` | `3 Hours Guaranteed Pay for Emergency Callout` |
| **16**| Multi-Timezone & DST | `evaluateInBranchTimezone` | `UTC Storage + Branch Local Evaluation` |
| **17**| Regularization Approval SLA | `regularizationCutoffDays` | `Apply within 3 Days / 48-hr Manager SLA` |
| **18**| Hybrid Model & WFH Quota | `wfhMonthlyQuota` | `4 WFH Days/month (Blacklisted Tue/Thu)` |
| **19**| On-Duty (OD) Field Visits | `minFieldVisitsFullDay` | `3 Verified Client Visits = Full Day OD` |
| **20**| Work-In-Transit Credit | `overnightTravelRestHours` | `Full-Day Travel Credit + 4-hr Post-Travel Rest` |
| **21**| Pre-Approved Overtime Cap | `maxDailyOtHours` / `maxMonthly` | `Min 90 mins OT / Max 4 hrs/day & 40 hrs/month` |
| **22**| Comp-Off Expiry & Balance | `compOffExpiryDays` / `maxBal` | `60 Days Expiry / Max 5 Active Credits` |
| **23**| Holiday Multipliers | `nationalHolidayOtRate` | `3.0x Pay for Working on National Holidays` |
| **24**| Sandwich Rule Enforcement | `sandwichEnabled` | `Fri + Mon Absent = 4 Days LOP (Weekend Included)` |
| **25**| Restricted Holiday Swap | `annualRhQuota` | `2 Restricted Holidays per year from Regional List` |
| **26**| Compensatory Working Days | `compWorkingDayOverride` | `Festival Compensatory Saturday = Full Weekday` |
| **27**| Auto-Absent & Auto-Clock-Out| `autoAbsentCronSchedule` | `Midnight Auto-Absent Job / Shift End Clock-Out` |
| **28**| LOP & Payroll Cutoff Freeze | `payrollFreezeDay` | `25th Payroll Cutoff / Priority: CL -> PL -> LOP` |
| **29**| HRBP Escalation Alert | `level3AbandonmentDays` | `3 Late = Mgr Alert / 5 AWOL = HR Legal Notice` |
| **30**| Audit Logging & Compliance | `retentionPeriodYears` | `Immutable Audit Log / 7-Year Labor Retention` |

---
*Enterprise Architecture Master Document - Designed for ApponextHRMS Platform Implementation.*
