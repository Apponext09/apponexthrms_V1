# ApponextHRMS — Leave Management Module
## Technical & Functional Documentation for Developers

---

## 1. Purpose & Scope

The Leave Management module governs how employees request time away from work, how balances accrue and deplete, and how approvals flow — feeding directly into Attendance (marking days as on-leave) and Payroll (Loss of Pay calculations). It must support any leave policy structure globally: statutory leave types (varying by country/region), organization-specific discretionary leave, and complex accrual/carry-forward/encashment rules — fully configurable rather than hardcoded to any single country's labor law.

Design goals:
- Any number of custom leave types per organization, each independently configurable.
- Multi-level, conditional approval workflows.
- Accurate balance ledger (accrual, usage, pending, adjustment) with full audit trail — leave balance must always be reconstructable from the transaction log, never just a mutable counter.
- Team-visibility and conflict management (avoid entire teams going on leave simultaneously).
- Seamless integration with Attendance (auto-marking) and Payroll (LOP).

---

## 2. Core Entities (Data Model)

### 2.1 `LeaveType` (Master)
| Field | Type | Description |
|---|---|---|
| leave_type_id | UUID | PK |
| code / name | String | e.g., CL, SL, EL/PL, ML, PTL, BRVL, MRGL, SAB, LOP, COMP_OFF, WFH_LEAVE |
| category | Enum | `PAID`, `UNPAID`, `STATUTORY`, `DISCRETIONARY` |
| gender_applicability | Enum | `ALL`, `MALE_ONLY`, `FEMALE_ONLY`, `OTHER` (for maternity/paternity-specific types) |
| unit | Enum | `FULL_DAY`, `HALF_DAY_ALLOWED`, `HOURLY` |
| requires_document_proof | Boolean | e.g., medical certificate for sick leave beyond N days |
| document_mandatory_after_days | Integer | Threshold |
| is_encashable | Boolean | — |
| is_carry_forward_allowed | Boolean | — |
| status | Enum | `ACTIVE`, `INACTIVE` |
| applicable_scope | Org/BU/Location/Employee-Category | Scoping (e.g., Sabbatical only for employees > 5 yrs tenure) |

### 2.2 `LeavePolicy` (per LeaveType, per scope)
| Field | Type | Description |
|---|---|---|
| policy_id | UUID | PK |
| leave_type_id | UUID | FK |
| accrual_method | Enum | `MONTHLY`, `QUARTERLY`, `ANNUAL_UPFRONT`, `ANNIVERSARY_BASED`, `ACCRUED_PER_HOURS_WORKED` |
| accrual_rate | Decimal | e.g., 1.25 days/month |
| annual_entitlement | Decimal | Total days/year at full eligibility |
| proration_on_joining | Boolean | Prorate first-year entitlement based on joining date |
| proration_on_exit | Boolean | Prorate final-year entitlement based on exit date |
| probation_restriction | Enum | `NOT_ALLOWED_DURING_PROBATION`, `ALLOWED_LIMITED`, `FULLY_ALLOWED` |
| max_balance_cap | Decimal | Nullable — ceiling beyond which accrual stops or excess lapses |
| carry_forward_max_days | Decimal | Nullable |
| carry_forward_expiry_months | Integer | Carried-forward days lapse after N months into new cycle |
| encashment_max_days | Decimal | Cap on encashable days at year-end/exit |
| negative_balance_allowed | Boolean | Can employee go into negative (advance leave)? |
| negative_balance_max_limit | Decimal | Cap if allowed |
| min_days_notice_required | Integer | Advance notice required before applying (e.g., 3 days for planned leave) |
| max_consecutive_days_allowed | Decimal | Nullable cap per single request |
| blackout_periods | Array<{start_date, end_date, reason}> | Dates leave cannot be applied (e.g., year-end close, peak season) |
| sandwich_rule_applicable | Boolean | If leave is taken before AND after a weekly-off/holiday, whether the off/holiday itself is also counted as leave |
| eligible_employee_categories | Array | Full-time / part-time / contract / intern eligibility |
| eligible_after_tenure_days | Integer | Minimum tenure before eligible (e.g., PL only after 90 days) |

### 2.3 `LeaveBalance` (ledger-derived summary, per employee per leave_type per cycle)
| Field | Type | Description |
|---|---|---|
| balance_id | UUID | PK |
| employee_id / leave_type_id / cycle_year | — | Composite scope |
| opening_balance | Decimal | Carried from previous cycle |
| accrued_to_date | Decimal | Sum of accrual transactions this cycle |
| used | Decimal | Sum of approved consumed leave |
| pending | Decimal | Sum of leave under approval (reserved, not yet deducted) |
| adjusted | Decimal | Manual HR corrections (with mandatory reason logged in ledger) |
| encashed | Decimal | — |
| lapsed | Decimal | Expired carry-forward/excess-cap amounts |
| available_balance | Decimal | Computed: opening + accrued + adjusted − used − pending − encashed − lapsed |

### 2.4 `LeaveLedgerEntry` (immutable transaction log — source of truth)
| Field | Type | Description |
|---|---|---|
| entry_id | UUID | PK |
| employee_id / leave_type_id | — | — |
| transaction_type | Enum | `ACCRUAL`, `USAGE`, `RESERVATION` (pending), `RESERVATION_RELEASE` (on reject/cancel), `CARRY_FORWARD`, `ENCASHMENT`, `LAPSE`, `MANUAL_ADJUSTMENT`, `COMP_OFF_CREDIT` |
| amount | Decimal | Signed (+/-) |
| reference_id | UUID | Links to LeaveRequest / payroll run / manual adjustment record |
| effective_date | Date | — |
| created_by | UUID | System or actor |
| remarks | Text | — |

### 2.5 `LeaveRequest`
| Field | Type | Description |
|---|---|---|
| request_id | UUID | PK |
| employee_id | UUID | FK |
| leave_type_id | UUID | FK |
| start_date / end_date | Date | — |
| is_half_day | Boolean | + `half_day_session` Enum (`FIRST_HALF`,`SECOND_HALF`) |
| is_hourly | Boolean | + `start_time`/`end_time` for hourly leave types |
| total_days_requested | Decimal | Computed excluding weekly offs/holidays unless sandwich rule applies |
| reason | Text | — |
| document_ref | String | Nullable |
| status | Enum | `DRAFT`, `PENDING_L1`, `PENDING_L2`, `APPROVED`, `REJECTED`, `CANCELLED`, `WITHDRAWN` |
| approval_chain | Array<{level, approver_id, status, timestamp, comment}> | — |
| applied_on | Timestamp | — |
| is_backdated | Boolean | Flag if applied after the leave date has passed (needs special handling — see 5.7) |

### 2.6 `HolidayCalendar`
| Field | Type | Description |
|---|---|---|
| holiday_id | UUID | PK |
| holiday_date | Date | — |
| holiday_name | String | — |
| holiday_type | Enum | `MANDATORY`, `OPTIONAL_FLOATER`, `RESTRICTED` |
| applicable_location_id | UUID | Region-specific calendars |
| max_optional_holidays_allowed | Integer | For floater-type — how many an employee may choose per year |

### 2.7 `CompOffLedger`
- Tracks comp-off earned (from OT/holiday/weekly-off work, sourced from Attendance module), expiry window (e.g., must be used within 60/90 days), and usage — modeled identically to `LeaveLedgerEntry` but as a distinct sub-type since it typically has its own expiry rule distinct from regular leave carry-forward rules.

---

## 3. Roles & Permissions Matrix

| Capability | Super Admin | HR Admin | Location HR | Reporting Manager | Employee | Payroll Admin |
|---|---|---|---|---|---|---|
| Create/edit Leave Types & Policies | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure holiday calendar | ✅ | ✅ | ✅ (regional additions) | ❌ | ❌ | ❌ |
| Apply for own leave | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve L1 (direct manager) | — | — | — | ✅ | — | — |
| Approve L2 (HR/skip-level, if configured) | ✅ | ✅ | ✅ | ❌ (unless also HR) | ❌ | ❌ |
| Cancel/withdraw own pending request | — | — | — | — | ✅ | — |
| Cancel approved leave (on behalf) | ✅ | ✅ | ✅ | ✅ (own team, with reason) | ✅ (own, before start date) | ❌ |
| View own leave balance | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View team leave balance/calendar | ✅ | ✅ | ✅ | ✅ (own team) | ❌ | ❌ |
| View org-wide leave data | ✅ | ✅ | ❌ (own location) | ❌ | ❌ | ✅ (aggregate for LOP) |
| Manual balance adjustment | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve encashment requests | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (processes payout) |
| Configure blackout periods | ✅ | ✅ | ✅ (own location) | ❌ | ❌ | ❌ |
| Override sandwich rule / policy exception (case-by-case) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Leave Types — Reference Set (fully configurable, not hardcoded)

The system ships with a configurable starter set that HR can rename, disable, or extend:
- **Casual Leave (CL)** — short-notice, personal reasons.
- **Sick Leave (SL)** — health-related, may require medical certificate beyond N days.
- **Earned/Privilege Leave (EL/PL)** — accrued, carry-forward and encashment eligible.
- **Maternity Leave** — extended duration, statutory-driven, gender/eligibility-restricted, job-protection flag.
- **Paternity Leave** — shorter fixed duration.
- **Bereavement Leave** — short, immediate, minimal approval friction.
- **Marriage Leave** — one-time-per-service or once-per-year, often requires proof.
- **Compensatory Off (Comp-Off)** — earned via extra work, distinct expiry logic.
- **Sabbatical Leave** — long-duration, tenure-gated, often unpaid or partially paid, requires senior approval.
- **Loss of Pay (LOP)** — used automatically when no other balance covers an absence, or applied voluntarily.
- **Work From Home ("Leave-like" request)** — optional module toggle; some orgs model WFH as an approval-workflow request rather than a leave type, configurable.
- **Restricted/Optional Holiday (Floater)** — employee chooses from a pool of optional holidays.
- **Study Leave / Exam Leave**, **Adoption Leave**, **Menstrual Leave**, **Voting/Jury Duty Leave**, **Quarantine/Medical Isolation Leave** — all supportable as custom types since the engine is generic.

---

## 5. Core Logic

### 5.1 Accrual Engine
- Runs as a scheduled job per policy's `accrual_method`:
  - `MONTHLY`: credits `accrual_rate` on a configured day each month (e.g., 1st) via a new `ACCRUAL` ledger entry.
  - `ANNUAL_UPFRONT`: credits full `annual_entitlement` at cycle start (e.g., Jan 1 or fiscal year start) — common for EL/PL in some regions.
  - `ANNIVERSARY_BASED`: credited on employee's joining-date anniversary rather than calendar year.
  - `ACCRUED_PER_HOURS_WORKED`: for part-time/hourly employees, computed from Attendance module's logged hours (e.g., 1 hour leave per 30 hours worked) — requires nightly reconciliation job pulling attendance totals.
- **Proration on joining**: new joiner mid-cycle gets `annual_entitlement × (remaining_months_in_cycle / total_months)`, rounded per policy (round up/down/nearest-half configurable).
- **Proration on exit**: on marking an employee as "Resigned/Terminated," recompute entitlement up to last working day; any excess already-used-but-unearned leave becomes a negative adjustment recovered in Full & Final settlement (Payroll module).
- **Max balance cap enforcement**: if accrual would push `available_balance` beyond `max_balance_cap`, excess is either withheld (accrual skipped that cycle) or auto-lapsed, per policy toggle — never silently exceed the cap.

### 5.2 Application Workflow
1. Employee selects leave type, date range (or half-day/hourly), sees real-time computed `total_days_requested` (auto-excluding weekly offs/holidays within range unless sandwich rule active) and current `available_balance` before submitting.
2. System pre-validates: sufficient balance (unless negative balance allowed), tenure eligibility, gender applicability, blackout period conflict, `min_days_notice_required`, `max_consecutive_days_allowed`, overlapping existing approved/pending leave.
3. On submit: creates `LeaveRequest` (status `PENDING_L1`) + a `RESERVATION` ledger entry (reserves the balance so it can't be double-booked by another simultaneous request) → `pending` balance increases immediately, `available_balance` decreases immediately even before approval.
4. Routes to approval chain (see 5.3).
5. On final approval: `RESERVATION` entry converted to `USAGE` entry; Attendance module notified to mark those dates `ON_LEAVE`.
6. On rejection at any level: `RESERVATION_RELEASE` entry created, balance restored, employee notified with rejector's comment.
7. On employee-initiated withdrawal (only allowed pre-approval, or pre-start-date per policy): same release logic.
8. On cancellation of an already-approved leave (before start date, or with special "leave curtailment" flow if already ongoing): balance restored proportionally, Attendance record for affected future dates reverted from `ON_LEAVE` to normal expected-shift status.

### 5.3 Approval Chain Engine
- Generic N-level configurable chain, not hardcoded to 2 levels:
  - Level 1: Direct Reporting Manager (resolved dynamically from org hierarchy).
  - Level 2 (optional, policy-driven): required only for leave types/durations above a threshold (e.g., Sabbatical always needs HR + Department Head; CL under 2 days needs only manager).
  - Skip-level/HR override: HR Admin can approve directly at any stage (emergency/escalation).
- **Conditional routing rules** (configurable):
  - If manager doesn't act within `auto_escalation_days`, auto-escalate to their manager or HR.
  - If requesting employee IS a manager/approver themselves, route to their own manager (skip-self logic) or a designated backup approver.
  - Delegate approval: manager on leave themselves can designate a temporary delegate approver for their team.
- Every approval/rejection action is timestamped and comment-capturable, stored in `approval_chain` for full audit visibility to the employee.

### 5.4 Half-Day / Hourly Leave Logic
- Half-day: `total_days_requested = 0.5`; `half_day_session` determines whether it aligns with first or second half of the employee's shift (pulled from Shift module — a half-day boundary must be shift-aware, not a fixed clock time, since shifts vary).
- Multiple half-days across a range (e.g., first-half Mon, second-half Tue) — supported as either two separate half-day requests or one composite request with per-date session selection, developer's choice of UX but data model must support per-date granularity, not just one session flag for the whole range.
- Hourly leave: for orgs allowing leave in hour blocks (common in flexible-hours cultures) — deducts from balance in hour units, requires `unit = HOURLY` on the LeaveType and balance stored/displayed in hours (or fractional days, configurable).

### 5.5 Carry-Forward & Year-End Processing
- Scheduled year-end (or policy-cycle-end) batch job per `LeaveType`:
  1. Compute `available_balance` at cycle close.
  2. Amount up to `carry_forward_max_days` → new `CARRY_FORWARD` ledger entry crediting next cycle's opening balance.
  3. Amount beyond `encashment_max_days` eligibility (if `is_encashable`) → routed to encashment request/auto-payout per policy (either automatic or requires employee opt-in, configurable).
  4. Remaining excess (not carried, not encashed) → `LAPSE` entry, balance forfeited.
  5. Carried-forward amounts get their own `carry_forward_expiry_months` tracked separately in the ledger so they can lapse independently mid-next-cycle if unused (common rule: "carried leave must be used within Q1 of the new year or it lapses").

### 5.6 Comp-Off Logic
- Triggered from Attendance module when: employee works on a weekly-off/holiday, or accrues approved overtime beyond a policy-defined threshold that's configured to convert to comp-off instead of/alongside monetary OT.
- `COMP_OFF_CREDIT` ledger entry created automatically with its own `expiry_date` (e.g., +60 days).
- Comp-off usage follows the same `LeaveRequest` flow but against the Comp-Off "leave type," consumed FIFO (oldest comp-off credits expire/get used first) to minimize forfeiture.
- Expiry batch job runs periodically to lapse unused comp-off past its expiry window, notifying the employee in advance (e.g., 7-day warning).

### 5.7 Backdated / Retroactive Leave Applications
- Some orgs allow applying for leave after the fact (e.g., employee was sick and unable to apply in advance). Must be explicitly policy-gated (`allow_backdated_application`, with a max lookback window).
- Backdated approval must trigger a **re-computation of the already-finalized Attendance record** for that date (converting an `ABSENT` or `MISSING_PUNCH` status to `ON_LEAVE`) — and if payroll for that period is already locked, must flag for a payroll correction/arrears cycle rather than silently editing locked payroll data.

### 5.8 Team Leave Calendar & Conflict Management
- Manager/HR view: calendar showing all team members' approved + pending leave, color-coded.
- **Concurrent leave cap**: policy can define `max_team_members_on_leave_simultaneously` (absolute number or %) per team/department/date — system warns (or hard-blocks, configurable) at application time if approving this request would breach the cap, giving the approver informed context rather than blind approval.
- Blackout periods (5.2 above) enforced at the application stage itself, not just at approval.

### 5.9 Sandwich Rule Logic
- If enabled for a leave type: a weekly-off or holiday that falls **between** two leave-covered days (e.g., leave Fri + Mon, weekend Sat-Sun in between) is also counted and deducted as leave, since the employee was effectively absent for the whole stretch.
- Must be computed dynamically at request-submission time based on the Shift module's weekly-off pattern for that employee (not a fixed calendar assumption), since rotational-shift employees may have different off-days than fixed-shift employees.

---

## 6. Integration Points

| Module | Interaction |
|---|---|
| Shifts | Determines which calendar dates are "working days" (weekly off pattern) for accurate leave-day computation and half-day session alignment |
| Attendance | Approved leave auto-marks `AttendanceRecord.status = ON_LEAVE`; comp-off credited FROM attendance-derived OT/holiday-work data |
| Payroll | Unapproved absences with no leave cover become LOP; approved LOP leave type directly reduces payable days; encashment amounts flow as a payroll earning component; leave balance at exit feeds Full & Final settlement |
| Compliance | Statutory leave entitlement audit (e.g., proving maternity/paternity minimums are being honored) generated from policy + ledger data |

---

## 7. Notifications

| Event | Recipient | Channel |
|---|---|---|
| Leave applied | Approver(s) | In-app + Email |
| Leave approved/rejected | Employee | Push + Email |
| Approval pending > X days (escalation) | Next-level approver / HR | Email |
| Balance running low (below configurable threshold) | Employee | In-app banner |
| Carry-forward about to lapse | Employee | Email, T-14 days |
| Comp-off about to expire | Employee | Push, T-7 days |
| Team leave conflict warning | Approver at time of approval | In-app inline warning |
| Blackout period conflict | Employee at time of application | In-app inline error |

---

## 8. Reports

### 8.1 Standard Report Catalog
1. **Leave Balance Report** — org-wide, filterable by type/department/employee.
2. **Leave Trend/Utilization Report** — usage patterns by month, type, department (capacity planning input).
3. **Absenteeism Report** — unplanned leave/LOP frequency, flags patterns for HR intervention.
4. **Leave Liability Report** — financial liability of accrued-but-unused encashable leave (for finance/accounting balance sheet provisioning).
5. **Statutory Compliance Report** — e.g., maternity leave duration compliance, minimum sick-leave entitlement compliance, region-specific.
6. **Approval Turnaround Time Report** — average time-to-approve per manager (process efficiency metric).
7. **Comp-Off Ledger Report** — earned/used/expired comp-off tracking.
8. **Leave Ledger/Transaction Report** — full raw transaction history (accrual/usage/adjustment/lapse) per employee for audit and dispute resolution.
9. **Carry-Forward & Lapse Report** — amounts carried forward vs. lapsed at each cycle-end, by employee/department/leave type.
10. **Encashment Report** — encashment requests/payouts by period, cross-referenced with Payroll disbursement.
11. **Leave Type-Wise Distribution Report** — proportion of leave days taken by type (CL vs SL vs EL etc.) org-wide or by department.
12. **Pending Approvals Report** — all leave requests currently awaiting action, aging by number of days pending, by approver.
13. **Manual Adjustment Audit Report** — every HR-initiated manual balance adjustment, reason, actor, for compliance audit.
14. **Team Leave Calendar/Conflict Report** — historical view of overlapping team leave and how conflicts were resolved.
15. **Blackout Period Violation/Override Report** — leave applied or approved during blackout periods, with override reason if applicable.
16. **Sandwich Rule Application Report** — instances where the sandwich rule was triggered, days additionally deducted.
17. **Probation-Period Leave Report** — leave taken by employees still within probation, cross-checked against policy eligibility rules.
18. **Gender-Specific Statutory Leave Report** — maternity/paternity leave usage and duration compliance tracking.
19. **Negative Balance Report** — employees currently in negative/advance leave balance, amount, and recovery status.
20. **Backdated Application Report** — all retroactively-applied leave requests, approval status, and payroll-correction linkage.
21. **Holiday Calendar Utilization Report** — optional/floater holiday selections by employee/location.
22. **Leave Application Channel Report** — breakdown of how leave was applied (web/mobile/chatbot/HR-assisted) for adoption tracking.
23. **Employee Leave History Report** — complete chronological leave record for a single employee (useful for HR queries, appraisals, exit documentation).

### 8.2 Custom & Self-Service Report Builder
- **Report Builder UI**: filter/drag-and-drop interface over entities (LeaveRequest, LeaveBalance, LeaveLedgerEntry, CompOffLedger, HolidayCalendar) allowing selection of fields, filters (date range, leave type, department, location, employee, status), grouping, and aggregation (sum of days taken, count of requests, average approval time, etc.).
- **Saved & Shared Custom Reports**: name, save, and share report definitions with specific roles/users, or keep private.
- **Scheduled Delivery**: recurring auto-generation and delivery of any standard or custom report via email/in-app to specified recipients (e.g., HR auto-receiving a monthly leave-liability report).
- **Export Formats**: CSV, Excel (XLSX), PDF at minimum, via an extensible export-adapter architecture.
- **Permission-Scoped Query Engine**: enforces the same role/location/department scoping defined in Section 3 regardless of how the custom report is constructed.
- **API/BI-Tool Access**: documented reporting API or read-replica/data-warehouse connection for external BI tools (Power BI, Tableau, Looker).
- **Cross-Module Report Joins (where applicable)**: since Leave data is frequently analyzed alongside Attendance and Payroll (e.g., "LOP days vs. leave-balance-exhaustion correlation"), the report builder should support joining Leave data with Attendance/Payroll read-models where the user has permission across both domains.

---

## 9. Edge Cases Checklist

- Employee applies for leave spanning a period where their shift/roster changes mid-way (e.g., moves from a 5-day-week team to a 6-day-week team) — leave day computation must use the correct weekly-off pattern active on each specific date, not a single static pattern for the whole range.
- Two leave requests submitted for overlapping dates before the first is approved — second request must be blocked or clearly flagged as a duplicate/overlap at submission.
- Employee's leave policy changes mid-year (e.g., promoted to a grade with a richer policy) — existing ledger must NOT be recalculated retroactively; only future accruals use the new policy, with a clear ledger entry marking the policy transition point.
- Negative balance allowed, employee resigns before "earning back" the negative balance — Full & Final settlement (Payroll) must recover the equivalent pay for unearned leave taken.
- Maternity leave overlapping a probation period — policy must explicitly define whether statutory leave entitlements override probation restrictions (statutory entitlements typically must, regardless of internal policy defaults — flag this as a compliance-critical configuration).
- Public holiday falls on an employee's weekly-off day — policy toggle for whether they get a compensatory holiday elsewhere (`holiday_falls_on_off_day_compensation`).
- Leave request approved, then employee is terminated for cause before the leave start date — system must auto-cancel future-dated approved leave on exit-date processing and restore/void the reservation appropriately.
- Multi-country organization where the same LeaveType code (e.g., "Sick Leave") has entirely different statutory rules per country — policy must resolve by `location_id`/country first, never a single global default silently misapplied.


---

## 10. Advanced, AI-Driven & Future-Ready Capabilities (Optional Add-On Layer)

> **Note on optionality:** Everything below is an **optional, pluggable enhancement**, not a core requirement. The Leave module must be fully functional and production-ready using only the deterministic policy/ledger/approval-chain logic in Sections 1–9 — no AI dependency needed to launch. AI-driven capabilities (forecasting, NLU application, approval recommendations, sentiment signals) should be implemented behind clean provider interfaces with rule-based defaults, so an organization can adopt them incrementally, disable them entirely, or swap in a different AI provider without touching core leave-processing logic.

### 10.1 AI-Powered Leave Forecasting & Burnout Prevention *(optional)*
- **Attrition/burnout risk model**: correlates leave patterns (declining leave utilization, sudden spikes in sick leave, unused-EL accumulation trending toward forfeiture) with historical attrition data to flag at-risk employees for proactive HR/manager conversations — surfaced as an aggregate/anonymized team-level signal by default, individual-level visibility gated by HR policy to avoid misuse as surveillance.
- **Leave demand forecasting**: predicts peak leave-application periods (holiday seasons, school-vacation-aligned dates, year-end encashment rush) so HR can proactively communicate blackout periods or staffing plans ahead of time rather than reactively.
- **Optimal leave suggestion**: nudges employees who are under-utilizing leave balance (about to lapse) with a proactive, non-intrusive suggestion, supporting wellbeing objectives while reducing year-end encashment liability spikes for the business.

### 10.2 Conversational Leave Application *(optional)*
- **Natural-language leave application**: "I need next Monday and Tuesday off for a family function" parsed via NLU into a structured `LeaveRequest` (dates, inferred leave type, reason), presented to the employee for one-tap confirmation rather than manual form-filling — accessible via chatbot, WhatsApp/Teams/Slack integration, or voice assistant.
- **Smart leave-type suggestion**: based on the stated reason/context (e.g., "I'm not feeling well" → suggests Sick Leave; "getting married" → suggests Marriage Leave), reducing employee friction in selecting the correct policy-compliant leave type.

### 10.3 Intelligent Approval Assistance *(optional)*
- **Approval recommendation engine**: surfaces contextual information to the approving manager at decision time — current team leave-calendar conflicts, the employee's recent leave pattern, remaining balance, and any blackout-period proximity — as an approval-decision-support panel rather than requiring the manager to manually cross-check each factor.
- **Auto-approval eligibility scoring**: for low-risk requests (ample balance, no team conflict, within standard notice period, non-blackout), the system can recommend (or per policy, execute) fast-track/auto-approval, reserving manager attention for genuinely judgment-requiring cases.

### 10.4 Sentiment & Wellbeing Signals *(optional, opt-in, privacy-governed)*
- Optional, anonymized aggregate sentiment analysis on leave reason text (e.g., detecting rising stress-related language patterns across a team) surfaced only as a team-level wellbeing dashboard metric to HR — never as individual profiling, and fully governed by explicit organizational consent/privacy policy configuration.

### 10.5 Predictive Team Coverage Optimization *(optional)*
- When multiple team members request overlapping leave, an optimization suggestion engine can propose alternative date ranges that satisfy all employees' underlying constraints (where flexible) while respecting the team's minimum-coverage rule — presented as a suggestion to the approver, never auto-applied without consent.

### 10.6 Self-Service Document Intelligence *(optional)*
- OCR/document-AI extraction from uploaded supporting documents (e.g., medical certificates) to auto-validate date ranges match the claimed leave period and flag mismatches for HR review, reducing manual document-checking overhead while retaining human sign-off on the final decision.

### 10.7 Global Statutory Auto-Updates *(recommended as a data-subscription service; non-AI, does not require ML)*
- A maintained, regularly-updated statutory leave-entitlement reference library (per country/region) that can be subscribed to, so when a jurisdiction changes a mandated minimum (e.g., extends statutory maternity leave duration), the platform can alert HR admins to review and update the relevant `LeavePolicy` rather than silently drifting out of compliance.

---

## 11. Backend Architecture & Scalability Guidelines

### 11.1 Ledger-First Design (Event Sourcing Pattern)
- `LeaveBalance` must always be a **derived/materialized view**, never the primary source of truth — the immutable `LeaveLedgerEntry` stream is authoritative. This allows safe replay/recomputation of balances if a bug is found in calculation logic, full historical auditability, and supports building new balance-reporting views without risk of corrupting the underlying truth.
- Recommend a CQRS-style split: writes go through a command/validation service that appends ledger entries; reads are served from a fast, pre-aggregated balance projection table updated asynchronously (or synchronously within the same transaction for strong consistency, depending on scale needs) on each ledger write.

### 11.2 Concurrency & Race-Condition Handling
- Balance **reservation** (Section 5.2) must be implemented with proper transactional locking or optimistic concurrency control to prevent two simultaneous leave applications from both passing a balance-sufficiency check against the same not-yet-decremented balance (classic double-spend problem) — critical at scale with high concurrent self-service usage (e.g., everyone applying for leave around a public holiday announcement).

### 11.3 Workflow Engine Abstraction
- Implement the multi-level approval chain (Section 5.3) as a **generic, configurable workflow engine** (state machine definitions per policy) rather than hardcoded approval-level logic in application code — this is the same engine that should be reused across Leave, Attendance Regularization, Reimbursement, and other approval-driven flows across the platform, avoiding duplicated bespoke approval logic per module.

### 11.4 Scheduled Job Reliability
- Accrual, carry-forward, comp-off expiry, and blackout-period jobs must run as **idempotent, resumable, distributed-lock-protected** scheduled jobs (not naive cron on a single instance) to ensure correctness at scale across multiple time zones and to avoid double-crediting on job retries/overlaps.

### 11.5 Multi-Region & Timezone-Aware Cycles
- Leave cycles, accrual dates, and year-end processing must operate correctly per employee's `location_id` timezone/fiscal-year configuration, not a single global cutover instant — batch jobs should process organizations/locations in their own local "end of cycle" moment.

### 11.6 API-First Extensibility
- Expose leave balance, application, and approval operations via versioned APIs so the module can integrate with external calendar systems, Slack/Teams bots, and third-party workforce-planning tools — consistent with the platform-wide API-first principle.
