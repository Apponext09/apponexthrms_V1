# HRMS – Master Modules: Testing, Integration & Fix Tracker

Audit started **2026-09-09**. Scope: verify every Master (configuration/reference data) works end‑to‑end
(UI → API → backend → DB → dependent modules) and fix what is broken, before moving to Employee /
Attendance / Leave / Payroll / Recruitment / Reports.

Method: live testing against the running dev server (`localhost:5000`) + local MySQL `app_hrms`
(org **4** – "Kosqu Technolab", 4 employees), plus code‑level review. No mock data, no UI‑only checks.

---

## 0. Architecture summary (verified)

| Layer | Location |
|---|---|
| Backend | `server/` – Express + Knex (MySQL `mysql2`). Modules under `server/src/modules/<mod>`. Routes mounted in `server/src/routes/v1.ts` under `/api/v1`. |
| Frontend | `client/` – React + Vite + react‑router. Feature folders `client/src/features/<feat>`. Role‑scoped route files `client/src/routes/*.routes.tsx`. |
| Auth | JWT **RS256**. `authenticate` middleware → `req.user` (claims: `sub`, `oid`, `sid`, `cid?`). `resolveTenant` → `req.ctx` = `{ organizationId, userId, companyId, role, roles }`. **`req.ctx` is the only authoritative tenant source.** |
| DB migrations | `server/src/db/migrations/`. ⚠️ Migration runner is **unusable** on this DB (knex_migrations only has batch‑1 rows; `npm run migrate` tries to re‑run destructive migrations). New migrations are applied manually + a `knex_migrations` row inserted. |
| Knex quirk | `getKnex()` sets a global `postProcessResponse` that **recursively camelCases every key**, *including keys inside JSON columns*. Any code reading `row.snake_case` after a query gets `undefined`. This is the root cause of several bugs below. |

### The two parallel "Master" systems

| # | System | Tables | Routes | UI | Consumed by other modules? |
|---|---|---|---|---|---|
| **A** | **Master Builder** (dynamic / user‑defined) | `custom_masters`, `custom_master_fields`, `custom_master_records`, `custom_master_validation_rules`, `custom_master_autofill_mappings`, `custom_master_choice_lists` | `/api/v1/master-builder/*` (`server/src/modules/master-builder/`) | `MasterBuilderPage`, `MasterBuilderDetailPage`, `DynamicMasterView` (`client/src/features/master-builder/`) + "Master Builder" tab in Masters Hub | **NO.** Grep confirms zero server consumers outside the module. `employee_linkage` is stored but never read. |
| **B** | **Fixed / built‑in masters** | `departments`, `designations`, `grades`, `locations`, `branches`, `company`, `employee_types`, `employee_statuses`, `shift_templates`, `holiday_calendars`/`holidays`, `breaks`, `leave_types`, `kra_forms`, `roles_responsibilities`, `notification_templates`, `notification_merge_codes`, `resource_plans`, `events`, `salary_components`, `ot_rules`, `cost_centers` … | mostly `/api/v1/settings/*` (`server/src/modules/settings/settings.routes.ts`, 4 248 lines) + `/api/v1/master/holiday-calendars/*` | `MastersHubPage` (`client/src/features/settings/pages/`) with a dedicated `*MasterForm` component per master | **YES** – employee, attendance, leave, payroll, recruitment, reports all read these tables. |

**Key finding:** the "Master Builder → Master Data → Master Menu → Other Modules" chain in the brief
is **not implemented for System A**. System A is presently a standalone CRUD tool. The masters that
actually feed the HRMS are System B. Both surface under the same "Masters" menu, which hides the split.

---

## A. Master inventory

### System A – Master Builder (dynamic)

| Master (seeded) | code | Frontend | Backend | API | DB | CRUD | Used By | Status |
|---|---|---|---|---|---|---|---|---|
| Employment Status | `employment_status` | Yes (DynamicMasterView) | Yes | Yes | `custom_master_records` (master_id 6) | Complete\* | — (not wired) | ⚠️ orphan |
| Employment Type | `employment_type` | Yes | Yes | Yes | master_id 7 | Complete\* | — | ⚠️ orphan |
| Test | `test1` | Yes | Yes | Yes | master_id 8 | Complete\* | — | ⚠️ orphan |
| Company (replica) | `custom_company` | Yes | Yes | Yes | master_id 9 | Complete\* | — | ⚠️ orphan |
| *user‑defined* | any | Yes | Yes | Yes | dynamic | Complete\* | — | OK for standalone use |

\* CRUD now complete **after Slice 1 fixes below**. "Not wired" = creating/editing these does not affect
the Employee module or any other module.

### System B – Fixed masters (from routes + DB tables; per‑master deep test = later slices)

| Master | API base | DB table | Dedicated UI form | Consumed by |
|---|---|---|---|---|
| Company | `/settings/companies` | `company` | `CompanyMasterForm` | employee, payroll, letters, id‑card |
| Location | `/settings/locations` | `locations` (+ syncs `attendance_locations`, `attendance_geofences`) | `LocationMasterForm` | employee, attendance (geofence), holidays |
| Branch | `/settings/branches` | `branches` | `BranchesPage` | employee, org structure |
| Department | `/settings/departments` | `departments` (+ `department_managers`) | `DepartmentMasterForm` | employee, attendance, leave, payroll, reports |
| Sub‑department | derived (`departments.parent_department_id`) | `departments` | — | employee |
| Designation | `/settings/designations` | `designations` | `DesignationMaster` | employee, payroll, recruitment, reports |
| Grade / Pay Grade | `/settings/grades`, `/settings/pay-grades` | `grades` | `GradeMasterCustomUI` | employee, payroll |
| Employment Type | `/settings/employment-types` | `employee_types` | `EmploymentTypeMasterCustomUI` | employee, payroll, leave eligibility |
| Employee Status | `/settings/employee-statuses` | `employee_statuses` | `EmployeeStatusMasterForm` | employee lifecycle |
| General Shift | `/settings/shifts` | `shift_templates` | `GeneralShiftMasterForm` | attendance, roster |
| Roster Shift | (shift routes) | `shift_templates`, `shift_rotations` | `RosterShiftMasterForm` | attendance |
| OT Rule | `/settings/ot-rules` (ot-rules module) | `ot_rules`, `ot_rule_eligibility` | `OTRulePage` | payroll, attendance |
| Break | `/settings/breaks` | `breaks` | `BreakMasterForm` | attendance |
| Holiday Calendar | `/master/holiday-calendars`, `/settings/holiday-calendars` | `holiday_calendars`, `holidays`, weekly‑off, assignments | `HolidayMasterForm`, `HolidayCalendarsPage` | attendance, leave, payroll (LOP) |
| Leave Type | `/settings/leave-types` | `leave_types` | `OrgLeaveSettings` / leave settings | leave, payroll |
| KRA Form | `/settings/kras` | `kra_forms` | `KraMasterForm` | performance |
| Roles & Responsibility | `/settings/roles-responsibilities` | `roles_responsibilities` | `RolesResponsibilityMasterForm` | employee JD, RBAC (display only) |
| Notification Template | `/settings/notification-templates` | `notification_templates` (+ versions) | `NotificationTemplateMasterForm` | notifications, letters, offers |
| Notification Merge Code | `/settings/merge-codes` | `notification_merge_codes` | `NotificationMergeCodeMasterForm` | notification templates |
| Letter & Offer Template | `/settings/offer-templates` | `notification_templates` (filtered) + 4 hard‑coded defaults | `OfferTemplateMasterForm` | recruitment offers, letters |
| Resource Plan | `/settings/resource-plans` | `resource_plans` | `ResourcePlanMasterForm` | planning |
| Event | `/settings/events` | `events`, `event_attendees` | `EventMasterForm` | engagement, dashboard |
| Salary Component | payroll module | `salary_components` | payroll settings | payroll (core) |
| Cost Center | (repo exists) | `cost_centers` | — | payroll, reports |
| ID Card Template | `/settings/id-card/templates` | id card tables | `IdCardDesignerPage` | id‑card issuance |
| Scope Masters (aggregate) | `/settings/scope-masters` | reads many of the above | — (dropdown feed) | leave year, policy filters, reports |

---

## B–E. Test results

### Slice 6 — Templates & System masters + Cost Center API: **DONE**

Live suite `scratchpad/s6_test.mjs`: **38/38 green**. Regression: Slice 1 30/30, Slice 2 28/28,
Slice 3 30/30, Slice 4 32/32, Slice 5 24/24.

**A. Audit — template masters (mostly already sound):**

| Master | Table | API | State |
|---|---|---|---|
| Notification Template | `notification_templates` | `/settings/notification-templates` (`GenericSettingsController` + zod: `template_name`, `subject`, `email_notification`) | ✅ tenant-safe (BaseRepository scoping), zod 400s, soft-delete. `codeField=''` → no code uniqueness (name-keyed). |
| Merge Codes | `notification_merge_codes` | `/settings/merge-codes` (`GenericSettingsController` + zod: `module_name`, `sub_module_name`) | ✅ same pattern. Merge codes are **descriptive strings** (`{{employee.name}}` etc.) stored for the template editor — resolution happens in the notification/letter render layer, not here. |
| Letter / Offer Template | `notification_templates` (filtered `%Offer%`) + 4 hard-coded presets | `/settings/offer-templates` (inline) | ✅ list returns presets + DB rows, create/delete work. Generic (no fixed document types). |
| Event | `events` | `/settings/events` (`EventController`) | ⚠️ **was 500 on every create** — fixed (see B). |
| Resource Plan | `resource_plans` | `/settings/resource-plans` (inline) | ⚠️ **no `organization_id` column, un-scoped GET (cross-tenant leak), IDOR PUT/DELETE, 500 on create** — all fixed (see B). |
| ID Card Template | id-card tables | `/settings/id-card/templates` (`IdCardTemplateController`) — full versioning/publish/rollback | ✅ list works; rich controller, not deep-tested this slice. |

**B. Bugs fixed — Slice 6:**

| # | File | Issue | Root cause | Fix |
|---|---|---|---|---|
| **S6-1** | `EventController.create` | `POST /settings/events` → **500 FK violation on every create** (`events_organizer_id_foreign`) | `organizer_id` was set to `ctx.userId` — a **user** id, not an **employee** id (the FK target) | resolve caller's `employee_id` (or honour explicit `organizerId`), verify it belongs to the org, else `null` |
| **S6-2** | `settings.routes.ts` `/resource-plans` GET | returned **every tenant's** resource plans (only optionally filtered by `companyId`) | table had **no `organization_id` column**; handler had no org filter | migration `20260910150000` adds `organization_id` + `deleted_at`; GET scoped to org (legacy NULL included) |
| **S6-3** | `/resource-plans` PUT + DELETE | `where({ id })` only — cross-org IDOR write/delete; DELETE was a **hard delete** | missing tenant scope | tenant-scoped; 404 if not found; DELETE → soft-delete |
| **S6-4** | `/resource-plans` POST | **500** `Column 'company_id' cannot be null` + no `organization_id` on the row | `company_id` is `NOT NULL varchar`; org never set | default `company_id` to `''`, set `organization_id`, set timestamps, require a dept or designation → 400, → **201** |

**C. Cost Center API — built (S5-R1):** `cost_centers` table + `CostCenterRepository` + `employees.cost_center_id` FK existed with **no HTTP surface**. New `CostCenterController` (`GenericSettingsController` + zod), routes `GET/POST/PUT/PATCH/DELETE /settings/cost-centers` + `/:id/restore`. Verified E2E (`s6_test.mjs`, 16 assertions):

| Check | Result |
|---|---|
| list / get / get-missing | 200 / 200 / **404** |
| missing name / missing code / negative budget | **400** each |
| create → persisted with `organization_id`, `budget_amount` | ✅ |
| duplicate code | **409** (not raw `ER_DUP_ENTRY` 500) |
| invalid parent id / self-parent | **400** each |
| **delete while assigned to an employee** (`employees.cost_center_id`) | **409** (`assertMasterNotInUse`) + also blocks if it has child cost centers |
| delete unused → then re-create with the freed code | 200 → **201** (S2-R2 pattern) |
| **`POST /employees {costCenterId}` → `employees.cost_center_id` FK** | ✅ persisted, verified by direct DB read |
| no token | **401** |

### DB — Slice 6

| Migration (all applied manually + `knex_migrations` row) | Change |
|---|---|
| `20260910140000_cost_centers_active_code_unique.ts` | `cost_centers.active_code` generated column + `UNIQUE(org, active_code)` (S2-R2 pattern, 7th table) |
| `20260910150000_resource_plans_org_scope.ts` | `resource_plans` gains `organization_id` (+ index) and `deleted_at` — the table had neither |

### Slice 6 remaining

| ID | Sev | Issue |
|---|---|---|
| S6-R1 | **Medium** | **Attendance calc-math E2E (S5-R4 / S4-R3) still not done.** `check-in`/`check-out` use server "now" and there is no punch-time-injection or test-clock abstraction in the codebase. Verifying grace/late/early/OT/cross-midnight/break/holiday/weekly-off/leave *values* needs either a new test-only guarded endpoint or direct `AttendanceService` unit tests with an injected clock — a focused sub-project. Punch **mechanics** (record creation, `shift_id` snapshot, no negative durations) are verified. |
| S6-R2 | Low | Merge-code / template rendering security (XSS, `{{...}}` arbitrary property access, cross-tenant data in render) — the render layer lives in `notifications`/`letters` modules, not audited this slice. Master CRUD stores the strings safely. |
| S6-R3 | Low | `resource_plans` columns are all `varchar(255)` (ids included) and the table has no FKs — a schema-quality issue, not a functional bug. |
| S6-R4 | Low | ID Card Template controller (versioning/publish/rollback/duplicate) not deep-tested. |
| R-1 (carried) | Medium | `resolveTenant` `\|\| 8` org fallback. |

### Slice 5 — Leave & Payroll masters + attendance punch: **DONE**

Live suite `scratchpad/s5_test.mjs`: **24/24 green**. Regression: Slice 1 30/30, Slice 2 28/28,
Slice 3 30/30, Slice 4 32/32.

**A. Audit findings:**

| Master | Table | API | Notes |
|---|---|---|---|
| **Leave Type** | `leave_types` | `/settings/leave-types` (inline in `settings.routes.ts`) | rich master (quota, carry-forward, encashment, negative-balance/pool, paid_type, JSON allocation/application/payroll settings). `POST` auto-creates a default `leave_policies` row + auto-assigns balances to all employees. `UNIQUE(org, leave_code)`. Table was **empty** (0 rows) for org 4. |
| **Leave Policy** | `leave_policies` + `leave_policy_assignments` | driven implicitly by leave-type create/update | not a standalone CRUD master — policy is auto-managed. Left as-is. |
| **Salary Component** | **two tables** — `payroll_components` (client uses this, via `/payroll/component-definitions` → `PayrollComponentDefinitionService`) **and** `pay_component_definitions` (legacy `/payroll/components` → `PayComponentService`) | both live | dual-table situation (S5-R2). Payroll module is post-4-slice-hardened — **not modified this slice**; both list endpoints return 200 / `{success,data}`. Classification via `classifyComponent()` (Slice 2) unchanged. |
| **Salary Structure / Slab / Revision** | `salary_structures`, `salary_slabs`, `salary_revisions` | `/payroll/salary-structure`, `/payroll/slabs`, `/payroll/salary-revisions` | all gated by `requirePermission('structure:*')` / `revision:*` (Slice-3 RBAC). Slice-1 IDOR on revisions intact. Audited, not modified. |
| **Cost Center** | `cost_centers` + `CostCenterRepository` | **NONE** | ⚠️ **no HTTP route anywhere** — `employees.cost_center_id` FK exists and `EmployeeService` writes it, but there is no way to create/list cost centers via API. Gap S5-R1. |
| **Pay Frequency** | — | — | no `pay_frequency` table or route found; payroll is monthly-only via `payroll_cycles` / `resolvePeriodContext()`. Gap S5-R3 (documented, not a regression). |

**B. Bugs fixed — Slice 5** (all in `settings.routes.ts` leave-type handlers):

| # | Issue | Root cause | Fix |
|---|---|---|---|
| **S5-1** | `POST /settings/leave-types` with a missing `leave_code` → `Cannot read properties of undefined (reading 'toUpperCase')` **500** | no presence validation | `leave_name` + `leave_code` required → **400**; normalize once |
| **S5-2** | duplicate `leave_code` → **400** ("Please edit the existing one") | wrong status | → **409** |
| **S5-3** | **`DELETE /settings/leave-types/:id` had `where({ id })` with no `organization_id`** — cross-org IDOR: any org admin could soft-delete another org's leave type by id; also always 200 (no 404), no in-use guard | missing tenant scope + guard | tenant-scoped existence → **404**; in-use guard (any `consumed_balance`/`pending_approval_balance` > 0, or an open `leave_applications` row) → **409**; scoped soft-delete |
| **S5-4** | `PUT /settings/leave-types/:id` — `where({ id })` on both the lookup and the update (cross-org read+write IDOR); `leave_code` renamable onto an existing code → **500** (`ER_DUP_ENTRY`) | missing tenant scope + dup check | tenant-scoped lookup + update; rename onto an existing code → **409** |
| **S5-5** | soft-deleted leave type kept its code in `UNIQUE(org, leave_code)` → recreate with freed code → **500** | all-rows unique index (same as S2-R2) | migration `20260910120000_leave_types_active_code_unique.ts` — `active_code` generated column + `UNIQUE(org, active_code)` (**applied manually**). Verified: code reuse after delete → 201. |

**C. Attendance punch — verified E2E (`s5_test.mjs`):** shift created → assigned to employee 20 → `POST /attendance/check-in` → `attendance_records` row created (`status=present`, **`shift_id` snapshots the assigned shift**, non-negative durations) → `POST /attendance/check-out` → 200. The punch → record → shift-snapshot chain works. Deep timing math (grace/late/early/OT/cross-midnight *values*) still not verified — see S5-R4.

**D. Formula sandbox (Slice-1 regression):** `POST /payroll/calculate-structure-preview` with `constructor.constructor("return process")()` → the payload does not leak a `process`/`Function` — sandbox holds. (Also covered by Slice-1 `PayrollFormulaEvaluator.test.ts`, 15 tests.)

### DB — Slice 5

- Migration `20260910120000_leave_types_active_code_unique.ts` — `leave_types.active_code` STORED generated column + `leave_types_organization_id_leave_code_unique` → `leave_types_org_active_code_uq (organization_id, active_code)`. Applied manually + `knex_migrations` row. No data loss (table was empty).
- Confirmed leave FKs: `leave_balances.leave_type_id`, `leave_applications.leave_type_id`, `leave_policy_assignments.leave_type_id`, `leave_accruals`, `leave_ledger_entries`, `leave_carry_forward`, `leave_lop_records`. `leave_balances` has `UNIQUE(employee_id, leave_type_id, financial_year_start)`.

### Slice 5 remaining

| ID | Sev | Issue |
|---|---|---|
| S5-R1 | **Medium** | **Cost Center master has no API** — table + repo + `employees.cost_center_id` FK exist, but no route to manage cost centers. Either wire a `/settings/cost-centers` CRUD or remove the FK from the employee form. |
| S5-R2 | Low | Salary component lives in **two tables** (`payroll_components` vs `pay_component_definitions`) with two services. `PayComponentService.createComponent` (legacy) has no dup-code check → `ER_DUP_ENTRY` 500 possible; not fixed (payroll-slice territory, client doesn't use it). |
| S5-R3 | Low | No configurable pay frequency — payroll is monthly-only. Fine if intentional; the brief lists it as a master. |
| S5-R4 | **Medium** | Deep attendance-calc E2E (inject punch times → assert `work_duration_minutes` / `is_late` / `overtime_minutes` for normal/grace/late/early/OT/cross-midnight/holiday/weekly-off/leave days) — **still not run**. `check-in`/`check-out` use server "now"; needs a service-level punch simulator or a regularization-based harness. Carries S4-R3. |
| S5-R5 | Low | `leave_types POST` auto-creates a default leave policy + auto-assigns balances to every employee — makes a brand-new type immediately "allocated" (though 0-usage, so still deletable after the S5-3 guard refinement). Worth confirming this auto-assign is intended. |
| R-1 (carried) | Medium | `resolveTenant` `\|\| 8` org fallback. |

### Slice 4 — Time & Attendance masters: **DONE**

Masters: Shift (`shift_templates`), Break (`breaks`), OT Rule (`ot_rules`), Holiday Calendar
(`holiday_calendars`), Holiday (`holidays`), Weekly Off (`weekly_off_rules`), Employee Shift
Assignment (`employee_shift_assignments`). Live suite `scratchpad/s4_test.mjs`: **33/33 green**.
Regression: Slice 1 30/30, Slice 2 28/28, Slice 3 30/30.

**A. Existing architecture (audited — no duplicate engines):**

| Master | Table | CRUD API | Notes |
|---|---|---|---|
| Shift | `shift_templates` | `/attendance/shifts` (`ShiftService`) — create/get/list/update/`:id/status`/delete/`assign` | `/settings/shifts` is a **read-only alias** over the same table. `shift_type` ENUM = `fixed \| flexible \| night \| roster`. Real validation already present (times, duration, grace, break, cross-midnight via `is_night_shift`). |
| Break | `breaks` | `/settings/breaks` (`BreakController` + zod) | `break_type` ENUM = `Manual \| Auto`; `is_active` = `Yes \| No`; `max_allow_time` = `HH:MM`. Zod-validated → clean 400s. |
| OT Rule | `ot_rules` | `/attendance/ot-rules` (`OTRuleService`) + `/:id/eligibility` | rich config (`normal_day_config_json`, `holiday_config_json`, `weekend_config_json`, formula, rounding). Eligibility via `ot_rule_eligibility` (entity_type/entity_id). |
| Holiday Calendar / Holiday / Weekly Off / Assignment | `holiday_calendars`, `holidays`, `weekly_off_rules`, `calendar_assignments` | `/master/holiday-calendars/*` (`MasterHolidayCalendarController`) | **Already solid** — 409 on scope+year dup, 409 on duplicate holiday date, 400 on out-of-year date, bulk add, cascade delete, nested GET, scope assignment (company/location/department). All passed with no code change. |
| Employee ↔ Shift | `employee_shift_assignments` (join, **effective-dated**) | `POST /attendance/shifts/assign` | **There is NO `employees.shift_id` column.** Assignment is a separate effective-dated row (`employee_id`, `shift_id` FK, `assignment_start_date`, `assignment_end_date`, `is_current`). `attendance_records.shift_id` snapshots the shift per record. |

**Employee shift assignment — verified E2E (`s4_test.mjs`):** `POST /attendance/shifts/assign {employeeId:21, shiftId:<id>}` → 201 → `employee_shift_assignments` row with `employee_id=21`, `shift_id` FK, `is_current=1`, `assignment_start_date=2026-09-01`. Deleting the shift while assigned → **409**.

### Bugs fixed — Slice 4

| # | File | Issue | Fix |
|---|---|---|---|
| **S4-1** | `OTRuleService.createRule` | inserted a `code` column that **does not exist** on `ot_rules` → `Unknown column 'code'` **500 on every OT-rule create**. Table had 0 rows — OT rules were uncreatable. | removed the phantom `code` field from the insert; added required-name check (400) |
| **S4-2** | `OTRuleService.createRule` / `updateRule` | no duplicate-name check — any number of identically-named rules allowed (confuses eligibility resolution) | pre-check `rule_name` per org → **409** on create and on rename |
| **S4-3** | `ShiftService.validateShiftFields` | an out-of-enum `shift_type` (e.g. `time_bound`) → raw MySQL `Data truncated for column 'shift_type'` **500** | validate against `[fixed, flexible, night, roster]` → **400** with a clear message (create + update) |
| **S4-4** | `ShiftService` | duplicate shift `code`, duplicate time-range, and delete-while-assigned all threw `ValidationError` → **400** (brief: predictable conflicts must be 409) | switched those three to `ConflictError` → **409** |

### DB — Slice 4

No schema changes. All attendance master tables were **empty (0 rows)** at audit time and are back to 0 after testing. Confirmed FKs: `attendance_records.shift_id`, `employee_shift_assignments.{employee_id,shift_id}`, `holidays.holiday_calendar_id`, `weekly_off_rules.calendar_id`, `calendar_assignments.{calendar_id,location_id,department_id}`, `ot_rule_eligibility.ot_rule_id`.

### Attendance / Payroll integration — audited, NOT reworked

| Area | Finding |
|---|---|
| Attendance calc engine | `AttendanceService` (2894 lines) is the single engine — no parallel engine created. It reads the assigned shift, computes late/early/grace/work-duration/`overtime_minutes`, snapshots `attendance_records.shift_id`. Deep numeric verification of cross-midnight/grace/OT math was **spot-checked only** (shift creation + assignment verified; full punch-simulation E2E deferred — see S4-R3). |
| OT → Payroll | Confirmed the **pre-existing gap** from the payroll audit: approved OT is not an always-on payroll input; it flows only if an OT payroll component is configured. Payroll's own slice owns this — not changed here. |
| `resolvePeriodContext()` / LOP | Untouched — remains the authoritative period/LOP path. Payroll regression not re-run this slice (no payroll code touched); Slice 3's employee-FK + Slice 2 suites green. |
| Roster / shift rotation | `shift_rotations` + `employee_shift_assignments.shift_rotation_id` exist and `assignShift` accepts `rotationId`. Not deep-tested (no rotation data). |
| Timezone | `TimezoneService` exists; `attendance_records` uses `check_in_date` (DATE) + `check_in_time` (TIMESTAMP). Not audited in depth this slice. |

### Slice 4 remaining

| ID | Sev | Issue |
|---|---|---|
| S4-R1 | Low | `shift_templates` / `ot_rules` / `breaks` have **no `UNIQUE(org, code/name)`** DB constraint — dup prevention is app-layer only (works, but a direct DB write or race could still create dups). |
| S4-R2 | Low | `holiday_calendars` has redundant column pairs (`name`+`calendar_name`, `year`+`calendar_year`, `applicable_location_id`+`location_id`+`region_id`); `holidays` has `holiday_calendar_id`+`calendar_id`. Two migration lineages merged. `findDuplicate` checks scope+year but the DB unique is `(org, year, name)` — edge cases could still 500. |
| S4-R3 | Medium | Full attendance E2E (simulate check-in/out across a cross-midnight shift → verify `work_duration_minutes`, `is_late`, `overtime_minutes`; holiday/weekly-off day not marked absent; leave day not absent) — **not run**; needs a punch simulator against the calc engine. |
| S4-R4 | Low | `MasterHolidayCalendarController.getContext` has the same `\|\| 8` / `\|\| 1` fallback as R-1 (uses `req.ctx` first, so inert in practice). |
| S4-R5 | — | OT → Payroll "always-on calculated input" (brief §18) is a payroll-module design change, out of masters scope. |

### Slice 3 — Roles/Responsibility + KRA + Employee integration + deferred fixes: **DONE**

Live suite `scratchpad/s3_test.mjs`: **30/30 green**. Regression: Slice 1 30/30, Slice 2 28/28.

**A. Role & Responsibility inventory (verified — three unrelated concepts, no duplicates created):**

| Concept | Table | API | What it is |
|---|---|---|---|
| **RBAC Role** | `roles` (+ `permissions`, `role_permissions`, `user_roles`) | `GET /rbac/roles`, `POST/DELETE /rbac/users/:userId/roles/:roleId`, `GET /rbac/me/permissions` | real authorization. `user_roles.expires_at` supported; `getEffectivePermissions` filters expired + caches permission codes. Org-scoped. 4 roles seeded for org 4 (Organization Admin `is_system`, employee, …). |
| **Roles & Responsibility master** | `roles_responsibilities` | `/settings/roles-responsibilities` (GenericSettingsService) | job-description master: company/department/designation (id **and** name columns), optional `kra_form_id`, `responsibilities` text, `is_active`. **Not** RBAC. |
| **KRA Form master** | `kra_forms` | `/settings/kras` (GenericSettingsService) | lightweight named-form master (`title`, `description`, `is_active`). No weightage/KPI/category — the full performance engine is the separate `performance` module (goals/OKR/appraisal/competency/KPI). |

- ⚠️ **RBAC role CRUD is not exposed** — `RbacService.createRole/updateRole/deleteRole` exist but `rbac.routes.ts` has no POST/PUT/DELETE `/rbac/roles` routes. Role definitions are only seeded / DB-managed. Documented as S3-R1; not built this slice (needs a product call on whether org admins define roles).
- `roles_responsibilities` / `kra_forms` created via inline `db.schema.createTable` IIFEs in `settings.routes.ts` (not real migrations) and `codeField=''` in GenericSettingsService → **no code-uniqueness** for these two. Left as-is (no `code` column).

**B. RBAC fixes:** `RbacService` — `assignRoleToUser` duplicate, `createRole` duplicate code, `deleteRole` while-assigned now throw `ConflictError` → **409** (were plain `Error` → 500). Verified: duplicate role-assign → 409.

**C. Employee master integration — verified end-to-end (`s3_test.mjs`):**

| Field | request key | DB column | Result |
|---|---|---|---|
| Department | `departmentId` | `employees.current_department_id` (FK → `departments.id`) | ✅ create writes it, GET returns it, edit updates it, invalid id → **400** |
| Designation | `designationId` | `current_designation_id` (FK) | ✅ |
| Location | `locationId` | `current_location_id` (FK) | ✅ |
| Grade | `currentGradeId` | `current_grade_id` (FK) | ✅ |
| Branch | `branchId` | `current_branch_id` (FK) | ✅ (path verified in code; no branch rows to E2E) |
| Employment Type | `employmentType` | `employees.employment_type` (**string**, not FK) | works; casing inconsistency in existing data |
| Employee Status | `status`/`employeeStatus` | `employees.status` + `employee_status` (string) | works |

`POST /employees` request → `employeeCreateSchema` (zod) → `EmployeeController` → `EmployeeService.createEmployee` → `EmployeeRepository` → `employees.current_*_id`. No mock data, real FK persistence confirmed by direct DB read.

**D. System A investigation — CONCLUSIVE:** `grep custom_master` across `employee/`, `attendance/`, `leaves/`, `payroll/` → **zero hits**. The Employee module reads the real `departments`/`designations`/`grades`/`locations`/`branches` tables. Master Builder (System A) is **not** wired into Employee — consistent with Slice 1's finding.

**E. Employee create response gap fixed:** `POST /employees` returned only `{employeeName, employeeEmail, organizationName, status}` — **no id**. Callers couldn't navigate to the new profile or chain follow-ups. Now also returns `id`, `uuid`, `employeeCode`.

### Bugs fixed — Slice 3

| # | File | Issue | Fix |
|---|---|---|---|
| **S2-R1** | `settings.routes.ts` `POST` + `PATCH/PUT /departments` | duplicate `code` → raw `ER_DUP_ENTRY` **500** | pre-check → **409** `{success:false,message}` (both create and code-change on update) |
| **S2-R2** | 5 tables + 4 repos + migration | soft-deleted rows kept their `code` in `UNIQUE(org, code)` → re-creating with a freed code → **500** | migration `20260909193000_master_code_active_unique.ts`: `active_code` STORED generated column (`NULL` when `deleted_at` set) + swap to `UNIQUE(organization_id, active_code)` on `departments`, `designations`, `grades`, `locations`, `branches` (**applied manually**). `isCodeUnique()` in Department/Designation/Location/Branch repos now `.whereNull('deleted_at')`. Verified: code reuse after delete → 201 for all four. |
| **S2-R3** | `EmployeeTypeController.ts` | `GET /employment-types` returned `{items, meta}`; siblings return `{success, data, meta}` | standardised list/getById/create/update/delete to `{success, data, meta}`. Client hooks still parse (they read `data.data ?? data` then `.items ?? body`). |
| S3-2 | `rbac.service.ts` | role assign/create/delete conflicts → 500 | `ConflictError` → 409 |
| S3-3 | `EmployeeController.ts` `createEmployee` | response missing new record id | added `id`, `uuid`, `employeeCode` |
| **S2-R6** | — | feared `columnInfo()` breakage was repo-wide | scanned: **only consumer was `settings.routes.ts`** (already fixed in Slice 2 via `tableColumns()`). Nothing else affected — closed. |

### DB changes — Slice 3

- 5 tables gained a STORED generated column `active_code` and swapped `<table>_organization_id_code_unique` → `<table>_org_active_code_uq (organization_id, active_code)`. Migration file + `knex_migrations` row added. No data loss; local DB verified back to original contents after testing.

### Slice 3 remaining

| ID | Sev | Issue |
|---|---|---|
| S3-R1 | Medium | RBAC role master CRUD (`create/update/delete`) has no HTTP routes — role definitions are seed/DB-only. Needs product decision before exposing. |
| S3-R2 | Low | `roles_responsibilities` & `kra_forms` are created by inline `db.schema.createTable` IIFEs in `settings.routes.ts`, not migrations; no code-uniqueness. |
| S3-R3 | Low | `employees.employment_type` / `employee_status` are free-text strings, not FK ids; existing data has casing drift (`full_time` vs `Full Time`). Data cleanup + real FK is a future task. |
| S3-R4 | — | KRA weightage / KRA→Department/Designation/Grade association / performance-cycle linkage from the brief are **not implemented** in `kra_forms` (it's a simple form master). The `performance` module is where OKR/KPI/appraisal live — out of scope for "masters". |
| R-1 (carried) | Medium | `resolveTenant` `\|\| 8` org fallback — cross-cutting auth pass. |

### Slice 2 — Org & Structure built-ins (System B): **DONE**

Masters: Company, Location, Branch, Department (+ managers, sub-dept), Designation, Grade,
Employment Type, Employee Status, plus the shared `/settings/scope-masters` dropdown feed.
Live suite `scratchpad/s2_test.mjs`: **27/27 green** after fixes (1 note).

| # | Test | Before | After | Fix |
|---|---|---|---|---|
| S2-1 | `PATCH/PUT /settings/departments/:id` (edit a department) | **FAIL** – 500 `ReferenceError: companyId is not defined` on **every** call; also `parseDeptCompanyIds` undefined | PASS | removed the stray `companyId` line; added the missing `parseDeptCompanyIds` helper |
| S2-2 | `POST /settings/departments` persists description / colour / email / company / active flag | **FAIL** – only name+code saved; response *echoed* the request so it looked OK | PASS – all fields persist & survive GET | `db(t).columnInfo()` returns `{}` here (postProcessResponse mangles the metadata rows) → every `'col' in cols` guard failed. New `tableColumns()` helper reads real columns via `SHOW COLUMNS`. Same fix applied to the update handler. |
| S2-3 | `/settings/scope-masters` options carry a usable `id` | **FAIL** – `id: null` for **every** location / department / designation / grade / type / status (dropdown feed for leave-year, policy filters, reports) | PASS – real numeric ids | `safeQueryTable` preferred `company_id`/`branch_id` over the PK; now `id` wins |
| S2-4 | Delete a department that employees are assigned to | **FAIL** – route did a **hard `.delete()`** → FK violation 500 (or would orphan employees) | PASS – 409 with a clear message | route rewritten: soft-delete + block if any employee / designation still references it; added `POST /departments/:id/restore` |
| S2-5 | Delete an in-use Designation / Location / Branch / Grade | **FAIL** – soft-deleted silently, employees left pointing at a hidden master | PASS – 409 | new shared `assertMasterNotInUse()` (`utils/masterUsage.ts`) wired into each service's delete |
| S2-6 | Delete an in-use Employment Type / Employee Status | **FAIL** – `hardDelete()`, no check → master row gone, employee refs orphaned | PASS – 409 | in-use guard added (matches employees by the master's name for these loose string links); hard-delete kept only for the not-in-use path |
| S2-7 | `GET /settings/departments/:id` for a soft-deleted dept | **FAIL** – returned 200 | PASS – 404 | added `whereNull('deleted_at')` |
| S2-8 | Company / Location / Branch / Designation / Grade / Employment-Type basic CRUD + update round-trip | PASS | PASS | — |

### Bugs fixed — Slice 2

| File | Issue | Root cause | Fix |
|---|---|---|---|
| `settings.routes.ts` `handleUpdateDepartment` | 500 on every department edit | referenced undeclared `companyId`; called undefined `parseDeptCompanyIds` | removed stray line; added `parseDeptCompanyIds()` helper (array / CSV / single → number[]) |
| `settings.routes.ts` (dept create + update) | description / colour / email / company / active flag silently dropped on write | `knex.columnInfo()` returns `{}` under this app's `postProcessResponse`, so `'col' in cols` guards all fail | new `tableColumns(db,table)` via `SHOW COLUMNS`; guards switched to it |
| `settings.routes.ts` `/scope-masters` `safeQueryTable` | every dropdown option got `id: null` | `idCol` preferred `company_id`/`branch_id` over the primary key | `id` wins when present |
| `settings.routes.ts` `DELETE /departments/:id` | hard delete → FK 500 / orphan risk; no restore path | inline route bypassed `DepartmentService`, used `.delete()` | soft-delete + in-use guard (employees, designations) → 409; new `POST /departments/:id/restore` |
| `settings.routes.ts` `GET /departments/:id` | returned soft-deleted departments | missing filter | `whereNull('deleted_at')` |
| **NEW** `settings/utils/masterUsage.ts` | — | — | `assertMasterNotInUse(orgId, id, label, refs[])` → throws `ConflictError` (409) if any ref rows exist |
| `DesignationService.deleteDesignation` | in-use designation soft-deleted, employees orphaned | no guard | `assertMasterNotInUse` (employees.current_designation_id) |
| `LocationService.deleteLocation` | in-use location soft-deleted | no guard | `assertMasterNotInUse` (employees.current_location_id) |
| `LocationService.createLocation` | `POST` with `{name}` ignored → "New Location" | only read `locationName`/`location_name` (client sends `locationName`, so UI was fine) | also accept `data.name` |
| `BranchService.deleteBranch` | no in-use guard | — | `assertMasterNotInUse` (employees.current_branch_id) |
| `GradeController.delete` | no in-use guard | GenericSettingsController delete not overridden | override added (employees.current_grade_id) |
| `EmployeeTypeService.deleteEmployeeType` | `hardDelete`, no guard → "Full Time" deletable with 3 employees on it | explicit "hard delete" intent, never revisited | in-use guard by name; hard-delete kept for not-in-use |
| `EmployeeStatusService.deleteEmployeeStatus` | same (`hardDelete`, no guard) | same | in-use guard by name; hard-delete kept for not-in-use |

### DB / data notes — Slice 2

- FK constraints confirmed on `employees`: `current_department_id`, `current_designation_id`, `current_location_id`, `current_grade_id`, `current_branch_id` → the respective master `.id`. Plus `designations.department_id → departments.id`, `holiday_calendars.applicable_location_id → locations.id`, `leave_blackout_periods.*`, `survey_responses.*`.
- `employees.employment_type` / `employees.employee_status` are **loose string columns** (values like `"Full Time"`, `"full_time"`, `"Active"`), not FK ids — inconsistent casing already in the data (emp 20 = `full_time`, others = `Full Time`). Guarded by name match; a data-cleanup + real FK is a later item.
- Local DB was repaired after testing exposed pre-fix destructive behaviour: restored soft-deleted in-use Location #7 and Designation #16; **recreated `employee_types` "Full Time"** (a pre-fix test run had hard-deleted it with 3 employees attached). All Slice-2 master tables verified back to their original contents.

### Slice 2 remaining (not fixed)

| ID | Sev | Issue |
|---|---|---|
| S2-R1 | Medium | `POST /settings/departments` with a duplicate `code` → **500** (raw `ER_DUP_ENTRY`), should be 409. Dept create has no pre-check (unlike Designation/Grade services). |
| S2-R2 | Medium | Soft-deleted rows still occupy their `code` in the unique index → recreating a master with a reused code → **500**. Same fix pattern as `custom_masters` (partial/active-only unique index) but spans `departments`, `designations`, `grades`, `locations`, `branches` — its own slice. |
| S2-R3 | Low | `GET /settings/employment-types` returns `{ items, meta }` while every sibling returns `{ success, data, meta }`. Client hooks tolerate it; still worth normalising. |
| S2-R4 | Low | Designation/Location auto-suffix a clashing `code` (`-1234`); Department/Grade reject it. Inconsistent. |
| S2-R5 | Low | Pre-existing duplicate master rows in this DB: 2× "Account Manager" designation (ids 17,18 — emp 23 uses 18), 2× soft-deleted "Software developer". Data cleanup, not code. |
| S2-R6 | — | `columnInfo()` returning `{}` is repo-wide (postProcessResponse mangles metadata rows). Other modules using it have the same silent-drop risk — worth a global fix (skip postProcess for `columnInfo`), tracked with R-1 auth pass. |

### Slice 1 — Master Builder (System A) core: **DONE**

Live black‑box suite: `29→30` assertions, all green after fixes
(`scratchpad/mb_test.mjs`, run as an org‑4 JWT).

| # | Test | Before | After | Fix |
|---|---|---|---|---|
| MB‑1 | Tenant isolation — auth as org 4, list masters | **FAIL** – returns org 8 data for everyone | PASS – returns caller's org | controller now reads `req.ctx` |
| MB‑2 | Duplicate master `code` rejected | **FAIL** – 201, silent dup | PASS – 400 | app check + partial‑unique DB index |
| MB‑3 | Empty master name rejected | **FAIL** – 201, master named "" | PASS – 400 | validation in service + 400 in controller |
| MB‑4 | Record missing required field rejected | **FAIL** – 201 (validator dead) | PASS – 400 | camelCase fix in `validateRecordData` |
| MB‑4b | Non‑numeric value in `number` field rejected | **FAIL** – 201 | PASS – 400 | same |
| MB‑4c | `is_unique` field duplicate rejected | **FAIL** – never enforced | PASS – 400 | new uniqueness check (JSON_EXTRACT) |
| MB‑5 | Record search + pagination totals correct | **FAIL** – search applied after paging; wrong total | PASS | search filters before paging, total recomputed |
| MB‑5b | `recordCode` / `createdAt` present in list & create responses | **FAIL** – always `undefined` | PASS | camelCase fix |
| MB‑5c | snake_case field key (`cost_code`) round‑trips on read | **FAIL** – returned as `costCode`, table shows blank, data duplicates on re‑save | PASS | read raw JSON via `CAST(data AS CHAR)` |
| MB‑6 | GET missing master → 404 | PASS | PASS | — |
| MB‑7 | No token → 401 | PASS | PASS | — |
| MB‑8 | Master status Active/Inactive filter (list + records) | PASS | PASS | — |
| MB‑9 | Field add / delete, record update / delete, soft‑delete master → 404 | PASS | PASS | — |

### Bugs fixed — Slice 1

| File | Issue | Root cause | Fix |
|---|---|---|---|
| `server/src/modules/master-builder/masterBuilder.controller.ts` | Every request operated on org **8** (hard‑coded), ignoring the logged‑in tenant. `getUserId` fell back to `1`. | `getOrgId()` read `req.user.organizationId` — a claim that does not exist (`JwtClaims` has `oid`, and `resolveTenant` already parsed it into `req.ctx`). `\|\| 8` masked the failure. | Read `req.ctx.organizationId` / `.userId` / `.companyId`; throw if absent (no silent fallback). |
| same | `createMaster` / `updateMaster` threw → 500 on validation errors | no try/catch | wrap → `400 { success:false, message }` |
| `masterBuilder.service.ts` `validateRecordData` | **All** backend record validation silently disabled (required, email, number, custom rules) | function read `f.field_key` / `f.is_required` / `r.field_a` … but `postProcessResponse` had already camelCased them to `f.fieldKey` / `f.isRequired` / `r.fieldA` | rewritten against camelCase keys; documented the quirk inline |
| same | `is_unique` fields never enforced | no code existed | added per‑field uniqueness check via `JSON_UNQUOTE(JSON_EXTRACT(data,'$.<key>'))`, excludes self on update |
| same `createMaster` | duplicate `code` per org allowed → `getMasterByCode` ambiguous, Masters Hub tab collisions | no check | app‑level check + new migration `20260909180000_custom_masters_unique_code.ts` (generated `active_code` column + `UNIQUE(organization_id, active_code)` so codes free up after soft‑delete) — **applied manually to local DB** |
| same `updateMaster` | `code` editable to anything, no re‑validation | — | normalize + clash check (excl. self) + reject empty name |
| same `listRecords` | (a) `total` computed before search filter, search applied *after* `LIMIT/OFFSET` → wrong counts, search only within current page; (b) `record_code`/`created_at`/`updated_at` → `undefined` | ordering bug + camelCase | filter‑then‑paginate‑then‑count for search path; camelCase keys; read `data` via raw CAST helper `getRecordById()` / `parseRecordData()` |
| same `createRecord`/`updateRecord` | response `recordCode`, `createdAt` `undefined`; `data` blob keys camelCased | camelCase | return via `getRecordById()` (raw JSON) |
| DB `custom_masters` (local) | 4 seeded masters + 14 records + 1 choice list were stranded under non‑existent **org 8** | the tenant bug above created them under the fallback org | re‑pointed `organization_id 8 → 4` on `custom_masters`, `custom_master_records`, `custom_master_choice_lists` |

### DB status — System A

- Tables exist, FKs `master_id → custom_masters.id ON DELETE CASCADE` present.
- ⚠️ `custom_master_records.master_id` also `ON DELETE CASCADE` but master delete is **soft** (`deleted_at`) — records are left in place (consistent, not orphaned, but `deleteMaster` does no dependency check). Acceptable while System A has no consumers; revisit if it gets wired.
- ✅ Added `UNIQUE(organization_id, active_code)` on `custom_masters`.
- No `is_unique` DB constraint on record data (enforced at app layer only — acceptable for a JSON blob).

### Integration status — System A

`Master Builder → dependent module`: **NONE.** No integration to test. If the product intends these
to drive Employee fields (`employee_linkage`), that is unbuilt work, not a bug to fix in this pass.
Recommendation captured in "Remaining / follow‑up".

---

## F. Remaining issues (not yet fixed)

| ID | Severity | Area | Issue |
|---|---|---|---|
| R‑1 | Medium | `resolveTenant.ts` | still has `\|\| 8` org fallback — should hard‑fail on missing `oid`. Left for a cross‑cutting auth pass (touches every module). |
| R‑2 | Low | Master Builder | `deleteMaster` / `deleteField` have no "in use" guard, no audit log. Low risk today (no consumers). |
| R‑3 | Low | `MastersHubPage.tsx` | the generic fallback record table (`INITIAL_RECORDS`, `handleSaveRecord` → React state only) is dead code for all 20 built‑in categories (each has a real form) but still ships mock rows for `location`/`department`/… — should be deleted to avoid confusion. |
| R‑4 | — | Product | System A ("Master Builder") is not connected to any module. Decision needed: wire `employee_linkage` into the Employee module, or scope Master Builder as an internal reference‑data tool and stop implying integration in the Masters menu. |
| R‑5 | Medium | Slice 2+ | System B masters (Department, Designation, Grade, Location, Employment Type, Employee Status, Shift, Holiday, Leave Type, …) not yet deep‑tested this pass — see plan. |
| R‑6 | **High** | Slice 2 | `settings.routes.ts` `handleUpdateDepartment` (PUT/PATCH `/settings/departments/:id`) references undefined `companyId` (lines ~1316) and missing `parseDeptCompanyIds` (~1326) → `ReferenceError` at runtime, department edit almost certainly 500s. Found via `tsc`, not yet runtime‑confirmed or fixed (Slice 2). |

---

## Slice plan (testing order)

1. ✅ **Slice 1 — Master Builder (System A) core CRUD/API/DB/validation/tenant.** DONE.
2. ✅ **Slice 2 — Org & Structure built‑ins:** Company, Location, Branch, Department, Designation, Grade, Employment Type, Employee Status + `/settings/scope-masters`. DONE.
3. ✅ **Slice 3 — Roles/Responsibility + KRA masters, Employee FK integration verified E2E, S2‑R1/R2/R3 + S2‑R6 fixed.** DONE.
4. ✅ **Slice 4 — Time & Attendance masters:** Shift, Break, OT Rule, Holiday Calendar/Holidays/weekly‑off/assignments; Employee shift assignment verified E2E. DONE.
5. ✅ **Slice 5 — Leave Type master hardened (IDOR + 400/409 + delete‑guard + code‑reuse); Salary Component / Structure / Cost Center / Pay Frequency audited; attendance punch chain verified E2E.** DONE.
6. ✅ **Slice 6 — Cost Center API built (S5‑R1); Event + Resource Plan cross‑tenant/500 bugs fixed; Notification Template / Merge Code / Offer Template / ID Card audited.** DONE.
7. ⬜ **Slice 7 — Master → dependent‑module E2E** for each System B master; **S6‑R1 (attendance calc‑math harness)**.
8. ⬜ **Slice 8 — Permissions & audit** across all master endpoints.

Legend: PASS / FAIL / PARTIAL / BLOCKED / N/A.

---

## Test summary (running)

```
Masters catalogued:            5 (System A) + ~26 (System B)
Slice 1  (Master Builder):     30 assertions, 30 pass. 10 bugs found, 10 fixed. R‑1..R‑4 deferred.
Slice 2  (Org & Structure):    28 assertions, 28 pass. 13 bugs found, 13 fixed.
Slice 3  (Roles/KRA/Employee): 30 assertions, 30 pass. 6 bugs fixed (S2‑R1/R2/R3 + RBAC 409 + employee id + S2‑R6 closed). Employee↔master FK verified E2E.
Slice 4  (Time & Attendance):  33 assertions, 33 pass. 4 bugs fixed (OT‑rule 500 on every create, OT dup‑name, shift‑type raw 500, shift 400→409). Employee↔shift FK verified E2E.
Slice 5  (Leave & Payroll):    24 assertions, 24 pass. 5 bugs fixed (leave‑type IDOR on DELETE + PUT, 500→400/409 ×3, S2‑R2 code reuse). Punch→record→shift‑snapshot chain verified E2E.
Slice 6  (Templates + CostCtr): 38 assertions, 38 pass. Cost Center API built from scratch; 4 bugs fixed (Event 500‑always, Resource‑Plan cross‑tenant leak + IDOR + 500). Employee↔cost_center FK verified E2E.
Regression:                    Slice 1 30/30, Slice 2 28/28, Slice 3 30/30, Slice 4 32/32, Slice 5 24/24 — all green.
Slices 7–8:                     not started
Total bugs fixed so far:        42  (+ Cost Center API added; local dev DB repaired after tests, verified back to original)
TypeScript:                    166 errors repo‑wide (pre‑existing baseline ~171; 0 introduced by any slice)
```
