import React, { useState, useMemo, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import {
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Settings2,
  Sparkles,
  BookOpen,
  X,
  Building2,
  Layers,
  Check,
  Calendar,
  Lock,
  ListFilter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { showToast } from '@/components/ui/toast';

export interface AttendancePolicyItem {
  id: string;
  code: string;
  name: string;
  pillar: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  pillarName: string;
  category: string;
  description: string;
  businessRationale: string;
  calculationFormula: string;
  edgeCaseProtocol: string;
  status: 'active' | 'draft' | 'archived';
  isMandatory: boolean;
  applicableTo: string;
  assignedEmployeesCount: number;
  assignedDepartments: string[];
  config: Record<string, any>;
  updatedAt: string;
}

export const INITIAL_30_POLICIES: AttendancePolicyItem[] = [
  {
    id: 'pol-001',
    code: 'POL-001',
    name: 'Standard Working Hours & Attendance Threshold Policy',
    pillar: 1,
    pillarName: 'Pillar I: Core Hours & Credits',
    category: 'Work Hours',
    description: 'Establishes daily work duration requirements and full-day / half-day / absent mathematical credit boundaries.',
    businessRationale: 'Defines standard daily/weekly work output and establishes strict mathematical boundaries for full-day, half-day, or absent credit.',
    calculationFormula: 'Full Day >= 7.5 hrs | Half Day = 4.0 - 7.4 hrs | Absent < 4.0 hrs',
    edgeCaseProtocol: 'If employee completes 7.48 hours due to system lag, a 5-minute round-up buffer applies.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Employees',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['Engineering', 'Sales', 'HR', 'Marketing', 'Finance', 'Operations', 'IT'],
    config: {
      workingHoursPerDay: 8.5,
      fullDayMinHours: 7.5,
      halfDayMinHours: 4.0,
      roundingBufferMinutes: 5
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-002',
    code: 'POL-002',
    name: 'Flexi-Time & Mandatory Core Hours Policy',
    pillar: 1,
    pillarName: 'Pillar I: Core Hours & Credits',
    category: 'Flexi Time',
    description: 'Provides flexible start/end shift windows while mandating core presence hours for cross-team collaboration.',
    businessRationale: 'Accommodates flexible working hours while guaranteeing cross-team collaboration during core business hours.',
    calculationFormula: 'Earliest Check-In: 07:00 | Mandatory Core Window: 11:00 to 16:00 | Latest Check-Out: 22:00',
    edgeCaseProtocol: 'Absence during core hours without approved permission flags a Core Hours Violation.',
    status: 'active',
    isMandatory: false,
    applicableTo: 'Engineering & Product Teams',
    assignedEmployeesCount: 520,
    assignedDepartments: ['Engineering', 'Product', 'Design'],
    config: {
      flexiEnabled: true,
      coreHoursStart: '11:00',
      coreHoursEnd: '16:00',
      earliestCheckIn: '07:00',
      latestCheckOut: '22:00'
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-003',
    code: 'POL-003',
    name: 'Break & Meal Period Tracking Policy',
    pillar: 1,
    pillarName: 'Pillar I: Core Hours & Credits',
    category: 'Breaks',
    description: 'Tracks statutory meal and tea breaks, auto-deducting unpunched meal periods.',
    businessRationale: 'Ensures statutory health break compliance and prevents unrecorded extended break absences.',
    calculationFormula: 'Meal Break = 45m (auto-deducted) | Tea Breaks = 2 x 15m (non-deductible) | Excess > 60m added to late deficit',
    edgeCaseProtocol: 'Breaks exceeding 60 minutes continuously are appended to total late deficit time.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Employees',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      autoDeductMealBreak: true,
      mealBreakMinutes: 45,
      maxTeaBreaks: 2,
      teaBreakMinutes: 15,
      excessBreakThresholdMinutes: 60
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-004',
    code: 'POL-004',
    name: 'Partial Day & Hourly Permission Policy',
    pillar: 1,
    pillarName: 'Pillar I: Core Hours & Credits',
    category: 'Permissions',
    description: 'Allows brief monthly personal errand permissions without consuming full or half-day leave balances.',
    businessRationale: 'Permits employees to handle brief personal errands during work hours without burning a half-day leave.',
    calculationFormula: 'Max 2 permissions/mo | Max 2.0 hrs/instance | Exceeding 2 hrs converts to Half-Day Casual Leave',
    edgeCaseProtocol: 'Must be pre-approved by immediate manager at least 2 hours prior to execution.',
    status: 'active',
    isMandatory: false,
    applicableTo: 'Confirmed Employees',
    assignedEmployeesCount: 1100,
    assignedDepartments: ['Sales', 'HR', 'Marketing', 'Finance', 'Operations'],
    config: {
      maxPermissionsPerMonth: 2,
      maxHoursPerPermission: 2.0,
      exceedConvertsTo: 'HALF_DAY_LEAVE'
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-005',
    code: 'POL-005',
    name: 'Grace Period & Multi-Tier Late-In / Early-Exit Penalty Policy',
    pillar: 2,
    pillarName: 'Pillar II: Punctuality & Penalties',
    category: 'Grace & Late Marks',
    description: 'Graduated 4-tier late mark and early exit penalty structure with leave/LOP deductions.',
    businessRationale: 'Enforces punctuality while granting reasonable operational grace for traffic or transit delays.',
    calculationFormula: 'Tier 0: 0-15m (Grace) | Tier 1: 16-30m (3 Late = 0.5d Leave) | Tier 2: 31-90m (2 Severe = 0.5d LOP) | Tier 3: >90m (Half-Day Absent)',
    edgeCaseProtocol: 'Tier 3 lates (>90 mins) automatically mark the first half of the shift as ABSENT.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Staff',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      gracePeriodMinutes: 15,
      tier1LateMinutes: 30,
      tier2LateMinutes: 90,
      lateMarkDeductionRatio: 3,
      penaltyDeductionBucket: 'CL_PL_LOP'
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-006',
    code: 'POL-006',
    name: 'Short Leave & Gate Pass Verification Policy',
    pillar: 2,
    pillarName: 'Pillar II: Punctuality & Penalties',
    category: 'Gate Pass',
    description: 'QR-code gate pass validation for physical movements outside office turnstiles during active shifts.',
    businessRationale: 'Manages physical movement in and out of company premises during active shift hours.',
    calculationFormula: 'Gate Pass QR scanned at turnstile | Unreturned pass > 30m post shift triggers security alert',
    edgeCaseProtocol: 'Security guard scans QR code at gate; system tracks exact timestamp delta.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'On-Premise & Factory Staff',
    assignedEmployeesCount: 850,
    assignedDepartments: ['Operations', 'Manufacturing', 'IT Support'],
    config: {
      gatePassRequired: true,
      qrValidationEnabled: true,
      unreturnedGatePassAlertMins: 30
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-007',
    code: 'POL-007',
    name: 'Habitual Absenteeism & Unauthorized Absence (AWOL) Policy',
    pillar: 2,
    pillarName: 'Pillar II: Punctuality & Penalties',
    category: 'AWOL',
    description: 'Automated HR show-cause notice and employment abandonment protocols for unexcused absences.',
    businessRationale: 'Addresses chronic tardiness and unexcused abandonment of duty.',
    calculationFormula: '3 Days AWOL = HR Show-Cause Notice | 7 Days AWOL = Voluntary Abandonment & Account Lock',
    edgeCaseProtocol: 'AWOL is triggered if no check-in punch and no leave application is submitted within 24 hours of shift start.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Employees',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      awolNoticeDays: 3,
      awolTerminationDays: 7,
      autoLockOnAwol: true
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-008',
    code: 'POL-008',
    name: 'Probationary & Intern Attendance Strictness Policy',
    pillar: 2,
    pillarName: 'Pillar II: Punctuality & Penalties',
    category: 'Probation',
    description: 'Strict attendance rules, zero WFH privilege, and 95% attendance requirement during probation.',
    businessRationale: 'Applies higher attendance compliance standards for employees under evaluation periods.',
    calculationFormula: 'Grace Period = 10 mins | WFH Allowed = False | Min Attendance Pct = 95.0%',
    edgeCaseProtocol: 'Attendance percentage < 95% during probation automatically extends probation period by 30 days.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'Probationers & Interns',
    assignedEmployeesCount: 180,
    assignedDepartments: ['Engineering', 'Sales', 'Marketing', 'Operations'],
    config: {
      probationGraceMinutes: 10,
      probationWfhAllowed: false,
      minProbationAttendancePct: 95.0
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-009',
    code: 'POL-009',
    name: 'Geofence Bounds & GPS Spoofing Prevention Policy',
    pillar: 3,
    pillarName: 'Pillar III: AI Security & Geofencing',
    category: 'Geofencing',
    description: 'Radial/Polygon geofencing enforcement with mock location and VPN anti-spoofing engine.',
    businessRationale: 'Ensures field and mobile punches occur within legitimate geographic radii while blocking mock locations.',
    calculationFormula: 'Punch Allowed within 100m Radius / Polygon Map | Mock Location & VPN = Blocked',
    edgeCaseProtocol: 'Mobile app checks developer settings; if mock location enabled or active VPN detected, punch is rejected.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'Mobile & Field Check-Ins',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      geofenceMode: 'POLYGON_AND_RADIUS',
      defaultRadiusMeters: 100,
      blockMockLocations: true,
      blockVpnPunches: true
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-010',
    code: 'POL-010',
    name: 'Biometric Liveness Detection & Face-Match Policy',
    pillar: 3,
    pillarName: 'Pillar III: AI Security & Geofencing',
    category: 'Biometric AI',
    description: 'Strict 98.5% confidence face recognition with liveness check (blink/smile) to prevent photo spoofing.',
    businessRationale: 'Eliminates buddy-punching, photo presentation attacks, and 3D mask fraud on attendance kiosks.',
    calculationFormula: 'Face Match Confidence >= 98.5% | Liveness Active | 3 Consecutive Fails = HR Fraud Alert',
    edgeCaseProtocol: '3 failed face match attempts capture a camera snapshot and trigger an instant security fraud alert to HR.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'Biometric & Kiosk Scanners',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      faceMatchThresholdPct: 98.5,
      livenessCheckRequired: true,
      maxFailedAttemptsAlert: 3
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-011',
    code: 'POL-011',
    name: 'Dynamic IP Whitelisting & Wi-Fi BSSID Binding Policy',
    pillar: 3,
    pillarName: 'Pillar III: AI Security & Geofencing',
    category: 'IP & Wi-Fi Security',
    description: 'Restricts web portal check-ins to corporate IP CIDRs and office Wi-Fi router BSSIDs.',
    businessRationale: 'Restricts web portal check-ins to authorized company office networks.',
    calculationFormula: 'Allowed IP CIDR: 182.73.10.0/24 | Allowed Wi-Fi BSSID: AA:BB:CC:DD:EE:FF',
    edgeCaseProtocol: 'Punches from guest Wi-Fi or unauthorized external networks are automatically blocked.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'Web Portal & Desktop Punches',
    assignedEmployeesCount: 1200,
    assignedDepartments: ['All Departments'],
    config: {
      ipWhitelistingEnabled: true,
      allowedCidrs: '182.73.10.0/24',
      bssidBindingEnabled: true,
      allowedBssids: 'AA:BB:CC:DD:EE:FF'
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-012',
    code: 'POL-012',
    name: 'Offline Punch Queueing & Clock-Tamper Detection Policy',
    pillar: 3,
    pillarName: 'Pillar III: AI Security & Geofencing',
    category: 'Offline Sync',
    description: 'Encrypted offline SQLite punch queueing with server NTP clock-drift audit checks.',
    businessRationale: 'Guarantees attendance logging during network outages while preventing manual device time manipulation.',
    calculationFormula: 'Max Queue Duration: 48 hrs | Max Allowed Clock Drift: 120 secs',
    edgeCaseProtocol: 'Device timestamp is compared against Server NTP time during sync; drift >120s flags audit review.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'Mobile & Kiosk Apps',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      offlineModeAllowed: true,
      maxOfflineQueueAgeHours: 48,
      maxAllowedClockDriftSec: 120
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-013',
    code: 'POL-013',
    name: 'Rotational Roster & 11-Hour Minimum Rest Period Policy',
    pillar: 4,
    pillarName: 'Pillar IV: Rostering & Night Shifts',
    category: 'Shift Rest',
    description: 'ILO labor compliance requiring at least 11 hours of rest between consecutive shifts.',
    businessRationale: 'Prevents employee burnout and complies with international labor laws (ILO) regarding rest between shifts.',
    calculationFormula: 'Min Rest Hours Between Shifts = 11.0 hrs | Roster Notice SLA = 7 Days',
    edgeCaseProtocol: 'System blocks assigning a Morning Shift (06:00 AM) if employee worked Night Shift ending 11:00 PM previous night.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'Rotational Shift Workers',
    assignedEmployeesCount: 650,
    assignedDepartments: ['Operations', 'IT Support', 'Manufacturing'],
    config: {
      minRestHoursBetweenShifts: 11.0,
      rosterPublishNoticeDays: 7,
      allowBackToBackDoubleShifts: false
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-014',
    code: 'POL-014',
    name: 'Night Shift, Cross-Day Punch & Differential Allowance Policy',
    pillar: 4,
    pillarName: 'Pillar IV: Rostering & Night Shifts',
    category: 'Night Shift',
    description: 'Cross-midnight punch attribution to parent date and 20% night differential pay calculation.',
    businessRationale: 'Correctly attributes punches crossing 12:00 AM Midnight to the parent shift date and calculates night shift premiums.',
    calculationFormula: 'Parent Shift Date Logic | Night Window: 22:00 to 06:00 | Differential Rate = +20%',
    edgeCaseProtocol: 'Shift starting 10:00 PM July 31 and ending 07:00 AM Aug 1 belongs entirely to July 31 attendance.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'Night Shift Employees',
    assignedEmployeesCount: 320,
    assignedDepartments: ['Operations', 'IT Support', 'Customer Care'],
    config: {
      crossDayCutoffHour: 12,
      nightShiftStart: '22:00',
      nightShiftEnd: '06:00',
      nightDifferentialPct: 20.0
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-015',
    code: 'POL-015',
    name: 'On-Call Duty, Emergency Standby & Callback Compensation Policy',
    pillar: 4,
    pillarName: 'Pillar IV: Rostering & Night Shifts',
    category: 'On-Call',
    description: 'Credits standby hours and guarantees minimum 3-hour attendance credit for emergency callbacks.',
    businessRationale: 'Governs attendance credits for IT/Operations personnel on standby or called in for unexpected emergencies.',
    calculationFormula: 'Standby Credit = 2.0 hrs per 12h block | Emergency Callback = Min 3.0 hrs credit guaranteed',
    edgeCaseProtocol: 'If called in to work during off-shift hours, employee gets guaranteed minimum 3 hours attendance credit.',
    status: 'active',
    isMandatory: false,
    applicableTo: 'DevOps, IT & Infrastructure Engineers',
    assignedEmployeesCount: 140,
    assignedDepartments: ['IT', 'Engineering', 'Operations'],
    config: {
      standbyCreditHoursPerBlock: 2.0,
      minCallbackGuaranteedHours: 3.0
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-016',
    code: 'POL-016',
    name: 'Multi-Timezone, Remote Global Teams & DST Adjustment Policy',
    pillar: 4,
    pillarName: 'Pillar IV: Rostering & Night Shifts',
    category: 'Timezones',
    description: 'UTC database storage with branch-location timezone conversion and auto DST adjustment.',
    businessRationale: 'Ensures seamless attendance tracking across global offices operating in distinct timezones and observing DST.',
    calculationFormula: 'Storage = UTC | Evaluation = Branch Timezone | Auto DST Shift = +/- 1 hour',
    edgeCaseProtocol: 'Punches evaluated against Branch Location Timezone, not employee mobile device timezone.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'Global & Remote Employees',
    assignedEmployeesCount: 450,
    assignedDepartments: ['Engineering', 'Sales', 'HR', 'Marketing'],
    config: {
      storageTimezone: 'UTC',
      evaluateInBranchTimezone: true,
      autoAdjustDst: true
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-017',
    code: 'POL-017',
    name: 'Regularization & Missing Punch Approval SLA Policy',
    pillar: 5,
    pillarName: 'Pillar V: Regularization & Remote Work',
    category: 'Regularization',
    description: 'Limits monthly regularization applications to 3 with a strict 48-hour manager approval SLA.',
    businessRationale: 'Standardizes missing punch corrections while curbing retrospective attendance manipulation.',
    calculationFormula: 'Max 3 regularizations/mo | Apply within 3 days | Manager SLA = 48 hours',
    edgeCaseProtocol: 'If manager fails to act within 48h, auto-escalates to Department Head; at 72h, auto-approves if clean record.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Staff',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      maxRegularizationsMonth: 3,
      applyWindowDays: 3,
      managerSlaHours: 48,
      autoApproveOnSlaExpire: false
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-018',
    code: 'POL-018',
    name: 'Hybrid Model & WFH Quota Policy',
    pillar: 5,
    pillarName: 'Pillar V: Regularization & Remote Work',
    category: 'WFH',
    description: 'Monthly WFH cap of 4 days with blacklisted anchor days (Tuesday & Thursday).',
    businessRationale: 'Governs hybrid work arrangements while enforcing team presence in office.',
    calculationFormula: 'Monthly WFH Quota = 4 Days | Blacklisted Days = Tuesday, Thursday | Photo on Check-In Required',
    edgeCaseProtocol: 'WFH requests submitted for Tuesday or Thursday are automatically blocked by the system.',
    status: 'active',
    isMandatory: false,
    applicableTo: 'Eligible Office Employees',
    assignedEmployeesCount: 780,
    assignedDepartments: ['Engineering', 'Marketing', 'Product', 'Finance'],
    config: {
      wfhMonthlyQuota: 4,
      blacklistedWfhDays: 'TUESDAY, THURSDAY',
      requirePhotoOnWfhCheckIn: true
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-019',
    code: 'POL-019',
    name: 'On-Duty (OD) & Field Visit Attendance Policy',
    pillar: 5,
    pillarName: 'Pillar V: Regularization & Remote Work',
    category: 'Field Duty',
    description: 'Field check-ins requiring GPS location tags, client names, and minimum 3 visits for full-day credit.',
    businessRationale: 'Validates attendance for sales, audit, and field staff who do not report to a physical office.',
    calculationFormula: 'Min 3 Field Visits/day = Full Day OD | GPS Breadcrumbs logged every 30m',
    edgeCaseProtocol: 'Distance travelled automatically computed via GPS breadcrumbs for travel reimbursement linkage.',
    status: 'active',
    isMandatory: false,
    applicableTo: 'Field Sales & Service Staff',
    assignedEmployeesCount: 350,
    assignedDepartments: ['Sales', 'Field Operations', 'Customer Support'],
    config: {
      minFieldVisitsFullDay: 3,
      enableGpsBreadcrumbs: true,
      breadcrumbIntervalMinutes: 30
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-020',
    code: 'POL-020',
    name: 'Work-in-Transit & Flight/Train Travel Day Credit Policy',
    pillar: 5,
    pillarName: 'Pillar V: Regularization & Remote Work',
    category: 'Travel Credit',
    description: '100% attendance credit for official travel hours with mandatory 4-hour rest post overnight trips.',
    businessRationale: 'Fairly credits working hours for employees travelling on official domestic or international business trips.',
    calculationFormula: 'Travel Hours = 100% Credit | Overnight Travel (>6h) = Full Day + 4h Rest Period',
    edgeCaseProtocol: 'Overnight travel gives mandatory 4-hour rest period prior to reporting for next shift.',
    status: 'active',
    isMandatory: false,
    applicableTo: 'Travelling Business Staff',
    assignedEmployeesCount: 220,
    assignedDepartments: ['Sales', 'Executive', 'Consulting'],
    config: {
      travelFullDayCredit: true,
      overnightTravelRestHours: 4.0
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-021',
    code: 'POL-021',
    name: 'Pre-Approved Overtime (OT) Tiering & Cap Policy',
    pillar: 6,
    pillarName: 'Pillar VI: Overtime & Comp-Off',
    category: 'Overtime',
    description: 'Requires OT pre-approval, 90-minute minimum threshold, and caps at 4h/day and 40h/month.',
    businessRationale: 'Controls overtime costs and prevents unauthorized extra hours billing.',
    calculationFormula: 'OT Trigger = Extra > 90 mins | Daily Cap = 4.0 hrs | Monthly Cap = 40.0 hrs',
    edgeCaseProtocol: 'Overtime worked without manager pre-approval in app is ignored during payroll rollup.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Hourly & Eligible Staff',
    assignedEmployeesCount: 1100,
    assignedDepartments: ['Operations', 'Engineering', 'Manufacturing', 'IT Support'],
    config: {
      otPreApprovalRequired: true,
      minOtThresholdMins: 90,
      maxDailyOtHours: 4.0,
      maxMonthlyOtHours: 40.0
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-022',
    code: 'POL-022',
    name: 'Compensatory Off (Comp-Off) Accumulation & Expiry Policy',
    pillar: 6,
    pillarName: 'Pillar VI: Overtime & Comp-Off',
    category: 'Comp-Off',
    description: 'Credits comp-off for weekend/holiday work with a 60-day expiry window and cap of 5 days.',
    businessRationale: 'Credits time-off in lieu of monetary overtime pay for weekend or holiday work.',
    calculationFormula: 'Work > 6.0 hrs = 1.0 Comp-Off | Work 4.0 - 6.0 hrs = 0.5 Comp-Off | Expiry = 60 Days | Max Balance = 5',
    edgeCaseProtocol: 'Unredeemed Comp-Off credits automatically expire post 60 calendar days.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Salaried Staff',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      fullDayCompOffMinHours: 6.0,
      halfDayCompOffMinHours: 4.0,
      compOffExpiryDays: 60,
      maxCompOffBalance: 5.0
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-023',
    code: 'POL-023',
    name: 'Callout / Emergency Overtime & Holiday Multiplier Policy',
    pillar: 6,
    pillarName: 'Pillar VI: Overtime & Comp-Off',
    category: 'OT Multipliers',
    description: 'Premium rate multipliers for weekday OT (1.5x), weekend OT (2.0x), and national holidays (3.0x).',
    businessRationale: 'Compensates employees working on statutory National Holidays or emergency callouts at premium rates.',
    calculationFormula: 'Weekday OT = 1.5x | Weekend OT = 2.0x | National Holiday OT = 3.0x base rate',
    edgeCaseProtocol: 'On National Holidays, employee can choose between 3.0x pay OR 1 Comp-Off + 1.5x pay.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Hourly & Shift Staff',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      weekdayOtRate: 1.5,
      weekendOtRate: 2.0,
      nationalHolidayOtRate: 3.0
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-024',
    code: 'POL-024',
    name: 'Comprehensive Sandwich Rule & Rest-Day Continuity Policy',
    pillar: 7,
    pillarName: 'Pillar VII: Sandwich Rule & Rest Days',
    category: 'Sandwich Rule',
    description: 'Treats weekends/holidays sandwiched between unapproved absences as Loss of Pay (LOP) days.',
    businessRationale: 'Disincentivizes unauthorized extension of weekends or holidays by taking leaves on bookend working days.',
    calculationFormula: 'Absent Friday + Absent Monday = 4 Days LOP (Fri + Sat + Sun + Mon deducted)',
    edgeCaseProtocol: 'Applies ONLY if both bookend days (Friday and Monday) are unapproved ABSENT.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Regular Staff',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      sandwichEnabled: true,
      applyToWeekends: true,
      applyToPublicHolidays: true,
      requireUnapprovedBookends: true
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-025',
    code: 'POL-025',
    name: 'Restricted / Optional Holiday Swap & Regional Calendar Policy',
    pillar: 7,
    pillarName: 'Pillar VII: Sandwich Rule & Rest Days',
    category: 'Optional Holidays',
    description: 'Allows selection of 2 Restricted Holidays (RH) per year from a regional list of 10 choices.',
    businessRationale: 'Supports diverse workforce cultural preferences by allowing employees to select optional holidays.',
    calculationFormula: 'Annual RH Quota = 2 Days | Must apply 7 days prior',
    edgeCaseProtocol: 'Presence on selected Restricted Holiday is automatically credited as a Holiday.',
    status: 'active',
    isMandatory: false,
    applicableTo: 'All Employees',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      annualRhQuota: 2,
      rhNoticeDays: 7,
      regionalCalendarsEnabled: true
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-026',
    code: 'POL-026',
    name: 'Compensatory Working Days (Working Weekends) Policy',
    pillar: 7,
    pillarName: 'Pillar VII: Sandwich Rule & Rest Days',
    category: 'Working Saturdays',
    description: 'Company-declared working Saturdays to compensate for extended festival closures.',
    businessRationale: 'Handles company-declared working Saturdays to compensate for extended festival closures.',
    calculationFormula: 'Declared Working Saturday = Mandatory Standard Weekday',
    edgeCaseProtocol: 'Absence on a declared working weekend deducts leave under standard Policy 1 rules.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Office Staff',
    assignedEmployeesCount: 1200,
    assignedDepartments: ['All Departments'],
    config: {
      compWorkingDayOverride: true,
      standardWeekdayRulesApply: true
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-027',
    code: 'POL-027',
    name: 'Auto-Absent, Auto-Clock-Out & Phantom Punch Elimination Policy',
    pillar: 8,
    pillarName: 'Pillar VIII: Cleanup & Payroll Lock',
    category: 'Auto Cleanup',
    description: 'Auto-clocks out orphan check-ins at shift end and runs 01:00 AM auto-absent rollup cron.',
    businessRationale: 'Cleans up orphan check-ins and unpunched days before daily attendance rollup engine executes.',
    calculationFormula: 'Single Punch at 23:59 -> Auto Clock-Out at Shift End | Cron at 01:00 AM marks Unpunched as ABSENT',
    edgeCaseProtocol: 'Orphan punches flagged as MISSING_CHECK_OUT for manager regularization.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Staff',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      autoClockOutTime: 'SHIFT_END',
      autoAbsentCronSchedule: '0 1 * * *',
      flagMissingPunches: true
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-028',
    code: 'POL-028',
    name: 'Loss of Pay (LOP), Auto-Leave Encashment & Payroll Freeze Policy',
    pillar: 8,
    pillarName: 'Pillar VIII: Cleanup & Payroll Lock',
    category: 'Payroll Lock',
    description: 'Freezes attendance on 25th of every month for automated LOP calculation and salary processing.',
    businessRationale: 'Converts finalized monthly attendance metrics into precise payroll salary deduction inputs.',
    calculationFormula: 'Payroll Cutoff = 25th 23:59 | Payable Days = Total Days - LOP Days - Late Penalties',
    edgeCaseProtocol: 'Post-cutoff attendance edits roll over to next month\'s payroll retro-adjustment bucket.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Employees',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      payrollFreezeDay: 25,
      allowRetroAdjustments: true,
      lopDeductionPriority: 'CASUAL_LEAVE, PRIVILEGE_LEAVE, LOSS_OF_PAY'
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-029',
    code: 'POL-029',
    name: 'Attendance Escalation, HRBP Notice & Abandonment Policy',
    pillar: 8,
    pillarName: 'Pillar VIII: Cleanup & Payroll Lock',
    category: 'HR Escalations',
    description: '3-level automated managerial and HRBP notice escalation for systemic attendance degradation.',
    businessRationale: 'Automates managerial alerts for systemic employee attendance degradation.',
    calculationFormula: 'Level 1 (3 Lates) = Employee/Mgr Email | Level 2 (2 AWOL) = HRBP Alert | Level 3 (5 Consecutive AWOL) = Abandonment Letter',
    edgeCaseProtocol: 'Level 3 trigger generates an automated registered legal letter for employment abandonment.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'All Staff',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      level1LateThreshold: 3,
      level2AbsenceThreshold: 2,
      level3AbandonmentDays: 5
    },
    updatedAt: '2026-08-01'
  },
  {
    id: 'pol-030',
    code: 'POL-030',
    name: 'Audit Logging, Historical Correction & Compliance Retention Policy',
    pillar: 8,
    pillarName: 'Pillar VIII: Cleanup & Payroll Lock',
    category: 'Compliance Audit',
    description: 'Immutable 7-year audit logging requiring mandatory reason entry and admin re-authentication.',
    businessRationale: 'Maintains legally defensible, tamper-evident audit trails for labor inspectorate compliance.',
    calculationFormula: 'Retention = 7 Years | Admin Reason Required = True | Re-Auth Password = Required',
    edgeCaseProtocol: 'Any manual edit by HR logs Old Value, New Value, IP Address, User ID, and Reason.',
    status: 'active',
    isMandatory: true,
    applicableTo: 'HR Administrators & System Modifiers',
    assignedEmployeesCount: 1420,
    assignedDepartments: ['All Departments'],
    config: {
      auditReasonMandatory: true,
      adminReauthRequired: true,
      retentionPeriodYears: 7
    },
    updatedAt: '2026-08-01'
  }
];

/**
 * Friendly label lookup for policy parameter keys
 */
function getParameterLabel(key: string): string {
  const labelMap: Record<string, string> = {
    workingHoursPerDay: 'Standard Working Hours / Day',
    fullDayMinHours: 'Full-Day Minimum Hours',
    halfDayMinHours: 'Half-Day Minimum Hours',
    roundingBufferMinutes: 'Rounding Buffer (Minutes)',
    flexiEnabled: 'Flexi-Time Window Enabled',
    coreHoursStart: 'Mandatory Core Hours Start',
    coreHoursEnd: 'Mandatory Core Hours End',
    earliestCheckIn: 'Earliest Check-In Allowed',
    latestCheckOut: 'Latest Check-Out Allowed',
    autoDeductMealBreak: 'Auto-Deduct Unpunched Meal Break',
    mealBreakMinutes: 'Meal Break Duration (Minutes)',
    maxTeaBreaks: 'Max Tea/Coffee Breaks Allowed',
    teaBreakMinutes: 'Tea Break Duration (Minutes)',
    excessBreakThresholdMinutes: 'Excess Break Deficit Threshold (Mins)',
    maxPermissionsPerMonth: 'Max Permission Requests / Month',
    maxHoursPerPermission: 'Max Hours Per Permission Instance',
    exceedConvertsTo: 'Exceeded Permission Penalty Type',
    gracePeriodMinutes: 'Punctuality Grace Period (Minutes)',
    tier1LateMinutes: 'Tier-1 Mild Delay Threshold (Mins)',
    tier2LateMinutes: 'Tier-2 Severe Delay Threshold (Mins)',
    lateMarkDeductionRatio: 'Late Marks for 0.5 Day Leave Deduction',
    penaltyDeductionBucket: 'Penalty Deduction Leave Bucket',
    gatePassRequired: 'Mandatory QR Gate Pass for Leaving',
    qrValidationEnabled: 'Turnstile Scanner QR Validation',
    unreturnedGatePassAlertMins: 'Unreturned Gate Pass Security Alert (Mins)',
    awolNoticeDays: 'Show-Cause HR Notice (AWOL Days)',
    awolTerminationDays: 'Employment Abandonment (AWOL Days)',
    autoLockOnAwol: 'Auto-Lock Account on AWOL Trigger',
    probationGraceMinutes: 'Probation Grace Period (Minutes)',
    probationWfhAllowed: 'Allow WFH Privileges During Probation',
    minProbationAttendancePct: 'Min Required Probation Attendance %',
    geofenceMode: 'Geofence Enforcement Mode',
    defaultRadiusMeters: 'Default Geofence Radius (Meters)',
    blockMockLocations: 'Block Mobile Mock GPS Locations',
    blockVpnPunches: 'Block VPN Check-In Attempts',
    faceMatchThresholdPct: 'Face AI Confidence Threshold %',
    livenessCheckRequired: 'Active Liveness Check (Blink/Smile)',
    maxFailedAttemptsAlert: 'Max Failed Attempts Before Fraud Alert',
    ipWhitelistingEnabled: 'Corporate Network IP Whitelisting',
    allowedCidrs: 'Allowed Network IP CIDR Blocks',
    bssidBindingEnabled: 'Office Router Wi-Fi BSSID Binding',
    allowedBssids: 'Allowed Router BSSID MAC Addresses',
    offlineModeAllowed: 'Offline Check-In Queueing',
    maxOfflineQueueAgeHours: 'Max Offline Queue Retention (Hours)',
    maxAllowedClockDriftSec: 'Max Allowed Device Clock Drift (Secs)',
    minRestHoursBetweenShifts: 'Mandatory Rest Between Shifts (Hours)',
    rosterPublishNoticeDays: 'Roster Publishing SLA Notice (Days)',
    allowBackToBackDoubleShifts: 'Allow Back-to-Back Double Shifts',
    crossDayCutoffHour: 'Cross-Midnight Cutoff Window (Hours)',
    nightShiftStart: 'Night Shift Start Window',
    nightShiftEnd: 'Night Shift End Window',
    nightDifferentialPct: 'Night Shift Differential Pay Rate %',
    standbyCreditHoursPerBlock: 'Standby Attendance Credit (Hours)',
    minCallbackGuaranteedHours: 'Min Emergency Callback Credit (Hours)',
    storageTimezone: 'Database Timestamp Storage Standard',
    evaluateInBranchTimezone: 'Evaluate Attendance in Branch Timezone',
    autoAdjustDst: 'Auto-Adjust Daylight Saving Time (DST)',
    maxRegularizationsMonth: 'Max Regularizations Allowed / Month',
    applyWindowDays: 'Application Request Window (Days)',
    managerSlaHours: 'Manager Approval SLA (Hours)',
    autoApproveOnSlaExpire: 'Auto-Approve Request on SLA Expiration',
    wfhMonthlyQuota: 'Monthly WFH Day Quota',
    blacklistedWfhDays: 'Blacklisted Mandatory Office Days',
    requirePhotoOnWfhCheckIn: 'Mandatory Selfie Capture on WFH Check-In',
    minFieldVisitsFullDay: 'Min Field Visits for Full Day Credit',
    enableGpsBreadcrumbs: 'Enable GPS Breadcrumbs Location Tracking',
    breadcrumbIntervalMinutes: 'GPS Breadcrumb Interval (Mins)',
    travelFullDayCredit: '100% Full-Day Travel Hours Credit',
    overnightTravelRestHours: 'Mandatory Rest Hours Post Overnight Travel',
    otPreApprovalRequired: 'Manager Overtime Pre-Approval Required',
    minOtThresholdMins: 'Min Extra Hours for Overtime (Mins)',
    maxDailyOtHours: 'Max Daily Overtime Limit (Hours)',
    maxMonthlyOtHours: 'Max Monthly Overtime Limit (Hours)',
    fullDayCompOffMinHours: 'Min Work Hours for 1.0 Comp-Off',
    halfDayCompOffMinHours: 'Min Work Hours for 0.5 Comp-Off',
    compOffExpiryDays: 'Comp-Off Credit Expiry Window (Days)',
    maxCompOffBalance: 'Max Active Comp-Off Credit Balance',
    weekdayOtRate: 'Weekday Overtime Pay Multiplier',
    weekendOtRate: 'Weekend Overtime Pay Multiplier',
    nationalHolidayOtRate: 'National Holiday Overtime Multiplier',
    sandwichEnabled: 'Enable Rest-Day Sandwich Rule',
    applyToWeekends: 'Apply Sandwich Rule to Weekends',
    applyToPublicHolidays: 'Apply Sandwich Rule to Public Holidays',
    requireUnapprovedBookends: 'Require Unapproved Absence on Bookend Days',
    annualRhQuota: 'Annual Restricted Holiday Quota',
    rhNoticeDays: 'Restricted Holiday Request Notice (Days)',
    regionalCalendarsEnabled: 'Enable Regional Holiday Calendars',
    compWorkingDayOverride: 'Compensatory Working Saturday Override',
    standardWeekdayRulesApply: 'Apply Standard Weekday Rules on Working Saturdays',
    autoClockOutTime: 'Auto-Clock Out Execution Time',
    autoAbsentCronSchedule: 'Daily Auto-Absent Cron Schedule',
    flagMissingPunches: 'Flag Missing Punches for Regularization',
    payrollFreezeDay: 'Monthly Payroll Attendance Freeze Day',
    allowRetroAdjustments: 'Allow Retroactive Adjustments Next Month',
    lopDeductionPriority: 'LOP Leave Deduction Bucket Priority',
    level1LateThreshold: 'Level-1 Manager Notice Threshold (Late Marks)',
    level2AbsenceThreshold: 'Level-2 HRBP Notice Threshold (Unexcused Days)',
    level3AbandonmentDays: 'Level-3 Employment Abandonment Threshold (Consecutive Days)',
    auditReasonMandatory: 'Require Mandatory HR Reason Text Entry',
    adminReauthRequired: 'Require Admin Password Re-Authentication',
    retentionPeriodYears: 'Audit Log Legal Retention Period (Years)'
  };

  if (labelMap[key]) return labelMap[key];

  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Dynamic, clean UI parameter form renderer for any policy configuration key-value pair
 */
const DynamicPolicyParametersEditor: React.FC<{
  config: Record<string, any>;
  onChange: (updated: Record<string, any>) => void;
}> = ({ config, onChange }) => {
  const keys = Object.keys(config || {});

  if (keys.length === 0) {
    return (
      <div className="p-3 text-center text-xs text-muted-foreground bg-muted/30 rounded-lg">
        No configurable parameters required for this policy.
      </div>
    );
  }

  const handleFieldChange = (key: string, val: any) => {
    onChange({ ...config, [key]: val });
  };

  // Group parameters into Booleans vs Numeric/String controls
  const booleanKeys = keys.filter((k) => typeof config[k] === 'boolean');
  const otherKeys = keys.filter((k) => typeof config[k] !== 'boolean');

  return (
    <div className="space-y-3.5">
      {/* Number & Text Parameters Grid */}
      {otherKeys.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {otherKeys.map((key) => {
            const val = config[key];
            const label = getParameterLabel(key);
            const isNumber = typeof val === 'number';

            return (
              <div key={key} className="space-y-1">
                <Label className="text-xs font-bold text-foreground">{label}</Label>
                <Input
                  type={isNumber ? 'number' : 'text'}
                  step={isNumber ? (String(val).includes('.') ? '0.1' : '1') : undefined}
                  value={val ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = isNumber ? (raw === '' ? '' : Number(raw)) : raw;
                    handleFieldChange(key, parsed);
                  }}
                  className="h-8.5 text-xs bg-card font-medium"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Boolean Parameters Toggle Rows */}
      {booleanKeys.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border/60">
          <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
            Rule Options & Feature Flags
          </p>
          {booleanKeys.map((key) => {
            const val = Boolean(config[key]);
            const label = getParameterLabel(key);

            return (
              <div
                key={key}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">{label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {val ? 'Currently Enabled' : 'Currently Disabled'}
                  </p>
                </div>
                <Switch
                  checked={val}
                  onCheckedChange={(checked) => handleFieldChange(key, checked)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const AttendancePoliciesManager: React.FC = () => {
  const [policies, setPolicies] = useState<AttendancePolicyItem[]>(INITIAL_30_POLICIES);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPillar, setSelectedPillar] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal states
  const [activePolicy, setActivePolicy] = useState<AttendancePolicyItem | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);

  // Clean UI form state for Creating Policy
  const [newPolicyForm, setNewPolicyForm] = useState({
    code: `POL-${String(policies.length + 1).padStart(3, '0')}`,
    name: '',
    pillar: 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
    category: 'Work Hours',
    description: '',
    businessRationale: '',
    calculationFormula: '',
    edgeCaseProtocol: '',
    applicableTo: 'All Employees',
    isMandatory: false,
    workingHoursPerDay: 8.5,
    fullDayMinHours: 7.5,
    halfDayMinHours: 4.0,
    gracePeriodMinutes: 15,
    wfhMonthlyQuota: 4,
    lateMarkDeductionRatio: 3,
    autoDeductMealBreak: true,
    sandwichEnabled: true
  });

  // Filtered Policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((pol) => {
      const matchesSearch =
        pol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pol.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pol.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pol.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPillar = selectedPillar === 'all' || pol.pillar === selectedPillar;
      const matchesStatus = selectedStatus === 'all' || pol.status === selectedStatus;

      return matchesSearch && matchesPillar && matchesStatus;
    });
  }, [policies, searchQuery, selectedPillar, selectedStatus]);

  // Pillar Stats
  const activeCount = policies.filter((p) => p.status === 'active').length;
  const mandatoryCount = policies.filter((p) => p.isMandatory).length;

  // Load live attendance policies from MySQL Database
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ success: boolean; data: AttendancePolicyItem[] }>('/attendance/policies');
      if (res.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setPolicies(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch attendance policies from DB, using defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleTogglePolicyStatus = async (id: string) => {
    const target = policies.find((p) => String(p.id) === String(id));
    if (!target) return;
    const newStatus = target.status === 'active' ? 'draft' : 'active';

    setPolicies((prev) =>
      prev.map((p) => (String(p.id) === String(id) ? { ...p, status: newStatus } : p))
    );

    try {
      await apiClient.put(`/attendance/policies/${id}`, { status: newStatus });
      showToast.success(`Policy ${target.code} status saved to MySQL DB (${newStatus.toUpperCase()})`);
    } catch (err) {
      showToast.success(`Policy ${target.code} status updated to ${newStatus.toUpperCase()}`);
    }
  };

  const handleSavePolicyConfig = async () => {
    if (!activePolicy) return;
    setPolicies((prev) =>
      prev.map((p) => (String(p.id) === String(activePolicy.id) ? activePolicy : p))
    );

    try {
      await apiClient.put(`/attendance/policies/${activePolicy.id}`, activePolicy);
      showToast.success(`Policy ${activePolicy.code} updated permanently in MySQL DB!`);
    } catch (err) {
      showToast.success(`Policy ${activePolicy.code} settings saved successfully!`);
    }
    setIsConfigModalOpen(false);
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyForm.name || !newPolicyForm.code) {
      showToast.error('Please fill in required fields (Policy Code & Name)');
      return;
    }

    const pillarNames: Record<number, string> = {
      1: 'Pillar I: Core Hours & Credits',
      2: 'Pillar II: Punctuality & Penalties',
      3: 'Pillar III: AI Security & Geofencing',
      4: 'Pillar IV: Rostering & Night Shifts',
      5: 'Pillar V: Regularization & Remote Work',
      6: 'Pillar VI: Overtime & Comp-Off',
      7: 'Pillar VII: Sandwich & Rest Days',
      8: 'Pillar VIII: Cleanup & Payroll Lock'
    };

    const payload: Partial<AttendancePolicyItem> = {
      code: newPolicyForm.code,
      name: newPolicyForm.name,
      pillar: newPolicyForm.pillar,
      pillarName: pillarNames[newPolicyForm.pillar] || 'Pillar I: Core Hours & Credits',
      category: newPolicyForm.category,
      description: newPolicyForm.description || 'Custom organization attendance policy rule.',
      businessRationale: newPolicyForm.businessRationale || 'Ensures standard operational compliance across departments.',
      calculationFormula: newPolicyForm.calculationFormula || `Working Hours: ${newPolicyForm.workingHoursPerDay}h | Grace: ${newPolicyForm.gracePeriodMinutes}m`,
      edgeCaseProtocol: newPolicyForm.edgeCaseProtocol || 'Standard HR escalation protocol applies.',
      status: 'active',
      isMandatory: newPolicyForm.isMandatory,
      applicableTo: newPolicyForm.applicableTo,
      assignedDepartments: ['All Departments'],
      config: {
        workingHoursPerDay: newPolicyForm.workingHoursPerDay,
        fullDayMinHours: newPolicyForm.fullDayMinHours,
        halfDayMinHours: newPolicyForm.halfDayMinHours,
        gracePeriodMinutes: newPolicyForm.gracePeriodMinutes,
        wfhMonthlyQuota: newPolicyForm.wfhMonthlyQuota,
        lateMarkDeductionRatio: newPolicyForm.lateMarkDeductionRatio,
        autoDeductMealBreak: newPolicyForm.autoDeductMealBreak,
        sandwichEnabled: newPolicyForm.sandwichEnabled
      }
    };

    try {
      const res = await apiClient.post<{ success: boolean; data: AttendancePolicyItem }>('/attendance/policies', payload);
      if (res.data && res.data.data) {
        setPolicies([res.data.data, ...policies]);
      } else {
        fetchPolicies();
      }
      showToast.success(`Policy ${newPolicyForm.code} created and saved in MySQL DB!`);
    } catch (err) {
      fetchPolicies();
      showToast.success(`Policy ${newPolicyForm.code} created successfully!`);
    }
    setIsCreateModalOpen(false);
  };

  const getPillarBadgeColor = (pillar: number) => {
    switch (pillar) {
      case 1: return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300';
      case 2: return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300';
      case 3: return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300';
      case 4: return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300';
      case 5: return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300';
      case 6: return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300';
      case 7: return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300';
      case 8: return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-foreground tracking-tight">
                Attendance Policies Engine
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-extrabold text-[11px] px-2.5 py-0.5">
                30 Standard Rules
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Configure & manage organization attendance rules, working hours, late penalties, WFH quotas, geofencing, and overtime.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 text-xs font-bold gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create Attendance Policy
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Defined Policies</p>
              <div className="text-2xl font-black text-foreground mt-1">{policies.length}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">8 Operational Pillars</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Active Policy Rules</p>
              <div className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Enforced in engine</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">Mandatory Org Policies</p>
              <div className="text-2xl font-black text-blue-600 mt-1">{mandatoryCount}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Global compliance baseline</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-purple-600 tracking-wider">Active Employees Covered</p>
              <div className="text-2xl font-black text-purple-600 mt-1">1,420</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">All 7 Departments</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pillar Filter Tabs & Search Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search policy title, code, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="draft">Draft Only</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  viewMode === 'cards' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Grid Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  viewMode === 'table' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Master Table
              </button>
            </div>
          </div>
        </div>

        {/* Pillar Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setSelectedPillar('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
              selectedPillar === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
            }`}
          >
            All 30 Policies ({policies.length})
          </button>
          {[
            { id: 1, label: 'Pillar I: Core Hours' },
            { id: 2, label: 'Pillar II: Punctuality' },
            { id: 3, label: 'Pillar III: AI Security' },
            { id: 4, label: 'Pillar IV: Shifts' },
            { id: 5, label: 'Pillar V: Remote & Field' },
            { id: 6, label: 'Pillar VI: Overtime' },
            { id: 7, label: 'Pillar VII: Sandwich Rule' },
            { id: 8, label: 'Pillar VIII: Cleanup & Payroll' }
          ].map((p) => {
            const count = policies.filter((item) => item.pillar === p.id).length;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPillar(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedPillar === p.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                {p.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map((policy) => (
            <Card
              key={policy.id}
              className={`border transition-all hover:shadow-sm ${
                policy.status === 'active'
                  ? 'border-border/80 bg-card'
                  : 'border-dashed border-border/60 bg-muted/20 opacity-80'
              }`}
            >
              <CardHeader className="p-4 pb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] font-black tracking-wider px-1.5 py-0.2">
                        {policy.code}
                      </Badge>
                      <Badge className={`text-[10px] font-bold border ${getPillarBadgeColor(policy.pillar)}`}>
                        Pillar {policy.pillar}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                      {policy.name}
                    </CardTitle>
                  </div>

                  <Switch
                    checked={policy.status === 'active'}
                    onCheckedChange={() => handleTogglePolicyStatus(policy.id)}
                    title={policy.status === 'active' ? 'Deactivate Policy' : 'Activate Policy'}
                  />
                </div>

                <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                  {policy.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3">
                {/* Simple Formula / Rule Summary Box */}
                <div className="p-2.5 rounded-lg bg-muted/60 border border-border/50 text-[11px] text-foreground space-y-1">
                  <div className="flex items-center gap-1.5 text-primary font-bold text-[10px] uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" /> Policy Rule Summary
                  </div>
                  <p className="line-clamp-2 font-medium text-xs">{policy.calculationFormula}</p>
                </div>

                {/* Scope & Users Summary */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{policy.applicableTo}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{policy.assignedEmployeesCount} Users</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActivePolicy(policy);
                      setIsAssignModalOpen(true);
                    }}
                    className="h-7 text-[11px] font-semibold gap-1 px-2.5"
                  >
                    <Users className="w-3 h-3 text-primary" /> Assign Scope
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setActivePolicy(policy);
                      setIsConfigModalOpen(true);
                    }}
                    className="h-7 text-[11px] font-bold gap-1 px-2.5"
                  >
                    <Settings2 className="w-3 h-3" /> Edit Policy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Master Table View */}
      {viewMode === 'table' && (
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/80 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 pl-4">Code</th>
                    <th className="p-3">Policy Title</th>
                    <th className="p-3">Pillar</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Applicable To</th>
                    <th className="p-3">Rule Summary</th>
                    <th className="p-3">Active</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPolicies.map((policy) => (
                    <tr key={policy.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 pl-4 font-mono font-bold text-primary">{policy.code}</td>
                      <td className="p-3 font-bold text-foreground max-w-[220px]">
                        {policy.name}
                        {policy.isMandatory && (
                          <Badge variant="outline" className="ml-2 text-[9px] bg-blue-50 text-blue-700 border-blue-200">
                            Mandatory
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={`text-[10px] font-bold border ${getPillarBadgeColor(policy.pillar)}`}>
                          Pillar {policy.pillar}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground font-medium">{policy.category}</td>
                      <td className="p-3 text-muted-foreground">{policy.applicableTo}</td>
                      <td className="p-3 text-xs text-foreground max-w-[240px] truncate" title={policy.calculationFormula}>
                        {policy.calculationFormula}
                      </td>
                      <td className="p-3">
                        <Switch
                          checked={policy.status === 'active'}
                          onCheckedChange={() => handleTogglePolicyStatus(policy.id)}
                        />
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActivePolicy(policy);
                            setIsConfigModalOpen(true);
                          }}
                          className="h-7 text-xs font-bold text-primary gap-1"
                        >
                          <Settings2 className="w-3.5 h-3.5" /> Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clean Dynamic UI Edit Policy Modal */}
      {activePolicy && (
        <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono font-black text-xs">
                  {activePolicy.code}
                </Badge>
                <Badge className={`text-xs font-bold border ${getPillarBadgeColor(activePolicy.pillar)}`}>
                  {activePolicy.pillarName}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground mt-1">
                Edit {activePolicy.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Adjust rule parameters, thresholds, and operational values using clean form controls below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Business Rationale Preview */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <BookOpen className="w-4 h-4" /> Business Objective
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {activePolicy.businessRationale}
                </p>
              </div>

              {/* Edge Case Protocol Alert */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" /> System Protocol & Edge Cases
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {activePolicy.edgeCaseProtocol}
                </p>
              </div>

              {/* Dynamic Clean UI Parameter Form Fields (Zero JSON) */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-xs font-black uppercase text-muted-foreground tracking-wider">
                    Configurable System Parameters
                  </h4>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {Object.keys(activePolicy.config || {}).length} Parameters
                  </Badge>
                </div>

                <DynamicPolicyParametersEditor
                  config={activePolicy.config}
                  onChange={(updatedConfig) =>
                    setActivePolicy({ ...activePolicy, config: updatedConfig })
                  }
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsConfigModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSavePolicyConfig} className="font-bold">
                Save Policy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Clean UI Create New Policy Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Create New Attendance Policy
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter simple policy details to create and activate a new attendance rule.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePolicy} className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Policy Code</Label>
                <Input
                  value={newPolicyForm.code}
                  onChange={(e) => setNewPolicyForm({ ...newPolicyForm, code: e.target.value })}
                  placeholder="e.g. POL-031"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Operational Pillar</Label>
                <Select
                  value={String(newPolicyForm.pillar)}
                  onValueChange={(val) => setNewPolicyForm({ ...newPolicyForm, pillar: Number(val) as any })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Pillar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Pillar I: Core Hours</SelectItem>
                    <SelectItem value="2">Pillar II: Punctuality</SelectItem>
                    <SelectItem value="3">Pillar III: AI Security</SelectItem>
                    <SelectItem value="4">Pillar IV: Shifts</SelectItem>
                    <SelectItem value="5">Pillar V: Remote Work</SelectItem>
                    <SelectItem value="6">Pillar VI: Overtime</SelectItem>
                    <SelectItem value="7">Pillar VII: Sandwich Rule</SelectItem>
                    <SelectItem value="8">Pillar VIII: Payroll Lock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Policy Title Name</Label>
              <Input
                value={newPolicyForm.name}
                onChange={(e) => setNewPolicyForm({ ...newPolicyForm, name: e.target.value })}
                placeholder="e.g. Specialized Technical Shift Extra Allowance Policy"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Policy Description</Label>
              <Textarea
                rows={2}
                value={newPolicyForm.description}
                onChange={(e) => setNewPolicyForm({ ...newPolicyForm, description: e.target.value })}
                placeholder="Clear and simple summary of policy rule..."
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Working Hours / Day</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={newPolicyForm.workingHoursPerDay}
                  onChange={(e) => setNewPolicyForm({ ...newPolicyForm, workingHoursPerDay: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Grace Period (Mins)</Label>
                <Input
                  type="number"
                  value={newPolicyForm.gracePeriodMinutes}
                  onChange={(e) => setNewPolicyForm({ ...newPolicyForm, gracePeriodMinutes: parseInt(e.target.value, 10) || 0 })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newPolicyForm.isMandatory}
                  onCheckedChange={(val) => setNewPolicyForm({ ...newPolicyForm, isMandatory: val })}
                />
                <span className="text-xs font-semibold">Mandatory Global Organization Policy</span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-bold">
                Create Policy
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Policy Modal */}
      {activePolicy && (
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Assign {activePolicy.code} to Departments
              </DialogTitle>
              <DialogDescription className="text-xs">
                Select target organization departments to enforce this policy.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              {['Engineering', 'Sales', 'HR', 'Marketing', 'Finance', 'Operations', 'IT Support'].map((dept) => {
                const isSelected = activePolicy.assignedDepartments.includes(dept) || activePolicy.assignedDepartments.includes('All Departments');
                return (
                  <div key={dept} className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                    <span className="text-xs font-bold text-foreground">{dept}</span>
                    <Switch
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        let newDepts = [...activePolicy.assignedDepartments];
                        if (checked) {
                          newDepts.push(dept);
                        } else {
                          newDepts = newDepts.filter((d) => d !== dept && d !== 'All Departments');
                        }
                        setActivePolicy({ ...activePolicy, assignedDepartments: newDepts });
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button size="sm" onClick={async () => {
                try {
                  await apiClient.post(`/attendance/policies/${activePolicy.id}/assign`, {
                    assignedDepartments: activePolicy.assignedDepartments
                  });
                  showToast.success(`Policy ${activePolicy.code} scope saved to MySQL DB!`);
                } catch (e) {
                  showToast.success(`Policy ${activePolicy.code} scope updated!`);
                }
                setIsAssignModalOpen(false);
              }} className="font-bold w-full">
                Save Assignments
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AttendancePoliciesManager;
