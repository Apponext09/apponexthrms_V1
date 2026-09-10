# Payroll API — Testing Tracker (Slice 4)

Live HTTP tests run against the running dev server (`http://localhost:5000/api/v1`) with RS256
tokens minted for a real org-admin (user 13 / org 4) and a real employee (user 14 / org 4), plus a
wrong-org admin. Data seeded in the local `app_hrms` DB. **42/42 live assertions passed.**

Legend: PASS / FAIL / PARTIAL / N/A

---

## A. Payroll API inventory (135 routes)

`payroll.routes.ts` mounts at `/api/v1/payroll`. Response contract is the app standard:
`{ success: true, data }` on success, `{ success: false, error: { code, message, details? } }` on error,
with the global `errorHandler` mapping `ValidationError→400`, `ConflictError→409`, `NotFoundError→404`,
`ForbiddenError→403`, `UnauthorizedError→401`, unknown→500.

### Payroll run lifecycle

| Method | Endpoint | Controller → Service | Auth (permission) | Result |
|---|---|---|---|---|
| POST | `/payroll` | PayrollRunController.generatePayroll → PayrollService.generatePayroll | `payroll:generate` | PASS |
| GET | `/payroll` , `/payroll/runs` | listPayrolls → getPayrollRuns | `payroll:view` | PASS |
| GET | `/payroll/:id` | getPayrollRunDetails (raw query) | `payroll:view` (catch-all) | **FIXED** (was 500 — bad columns) |
| GET | `/payroll/:id/status` | getPayrollStatus | `payroll:view` | PASS |
| GET | `/payroll/:id/reconciliation` | getReconciliation | `payroll:view` | **FIXED** (was 200-on-error) |
| POST | `/payroll/:id/process` | processPayroll → PayrollService.processPayroll | `payroll:process` | PASS |
| POST | `/payroll/:id/lock` | lockPayroll | `payroll:lock` | PASS |
| POST | `/payroll/:id/unlock` | unlockPayroll | `payroll:unlock` | PASS |
| POST | `/payroll/:id/approve` | approvePayroll | `payroll:approve` | PASS |
| POST | `/payroll/:id/publish` | publishPayroll | `payroll:publish` | PASS |
| GET | `/payroll/:id/bank-transfer` , `/compliance` | CSV exports | `payroll:view` | PASS |
| GET | `/payroll/approvals` , POST `/approvals/:id/approve` | pending-approvals | `payroll:approve` | PASS |
| — | Recalculate | **No dedicated endpoint.** Re-`POST /payroll` (regenerate, wipes only non-finalized) then `/process`. Documented as design, not a bug. | | N/A |
| — | Cancel / Delete run | **Missing.** `generatePayroll` already excludes `cancelled`/`deleted` states but nothing sets them; no consumer in the frontend. Recommended addition, not built (no fake endpoint). | | N/A |

### Process register / preview

| GET | `/payroll/process-register` , `/payroll/runs/:id/register` | PayrollRegisterController.getProcessRegister | `payroll:view` | **FIXED** (now overlays authoritative run figures) |
| POST | `/payroll/process-register/override` , `/reset-override` | saveProcessRegisterOverride | `payroll:process` | PASS |
| PATCH | `/payroll/run-employees/:id` | inline (whitelisted fields) | `payroll:process` | PASS |

### Payslips

| GET | `/payroll/payslips` | getPayslips (role-gated list) | authenticated | PASS |
| GET | `/payroll/payslips/:id` | getPayslip → PayslipService.getPayslip | authenticated + object-level | **FIXED** (missing → 404, was 200/null) |
| GET | `/payroll/payslips/:id/details` | getPayslipDetails | authenticated + object-level | PASS |
| POST | `/payroll/payslips` , `/generate-from-process` | createPayslip / getOrGenerateFromProcessedRun | `payslip:send` | PASS |
| POST | `/payroll/payslips/:id/send` , `/lock` | send / lock | `payslip:send` / `payslip:lock` | PASS |

### Salary structures / revisions

| GET/POST/PUT/DELETE | `/payroll/salary-structure(/:id)` , `/structures(/:id)` , `/structures/mappings` , `/structures/assign` , `/slabs/bulk-assign` | SalaryStructureController | `structure:*` | PASS (not re-audited in depth this slice) |
| GET/POST | `/payroll/salary-revisions` , `/revisions` , `/revisions/:id(/components)` , submit/approve/reject | SalaryRevisionController / facade | `revision:*` + object-level | **FIXED** (`GET /revisions/:id` missing → 404) |

### Loans / advances

| POST/GET/PUT/PATCH | `/payroll/loans(/:id)` , `/loans/active` , `/loans/:id/approve|reject|schedule|next-emi` | LoanTaxSettlementController → LoanService | object-level (Slice 1) | **FIXED** (`GET /loans/:id` missing → 404) |
| — | Advances CRUD | No dedicated `/payroll/advances` routes. `salary_advances` table exists; recovery is applied in `processPayroll` (Slice 3). Advance request/approve endpoints are a documented gap. | | N/A |

### Tax

| POST/GET | `/payroll/tax-declarations` | createTaxDeclaration / getTaxDeclarations | object-level | PASS |
| GET | `/payroll/tax-declarations/:id` | getTaxDeclaration | object-level | **ADDED** |
| POST | `/payroll/tax-declarations/:id/finalize` | finalizeTaxDeclaration | object-level | **ADDED** (method existed, route missing) |
| GET/POST | `/payroll/tax-declarations/:id/investments` | getTaxInvestments / addTaxInvestment → TaxService | object-level | **ADDED** — real `tax_investments` writes; makes old-regime 80C work |
| POST | `/payroll/tax/calculate-tds` | calculateTDS | object-level (`skipAccessCheck` for engine) | PASS |

### Settlements / gratuity / policies / misc

| various | `/payroll/settlements/*` , `/gratuity-rules` , `/policies` , `/loan-types` , `/attendance-lock` , `/reimbursements/*` , `/ledger` , `/is-locked` , `/arrears-adjustment` | LoanTaxSettlementController / PayrollSettingsController | `settlement:*` etc. + object-level | PASS (settlement `:id` IDOR verified) |

---

## B. Bugs found & fixed this slice

| # | Severity | Bug | Fix |
|---|---|---|---|
| 1 | High | `PayrollRunController.generatePayroll` / `processPayroll` / `getReconciliation` wrapped everything in `try/catch → res.status(500)`, so `ValidationError` (e.g. "regenerate over published run", "only draft runs can be processed") returned **500** instead of 400/409, and `getReconciliation` returned **200** with `success:false` on error. | Removed the swallowing catches; let `asyncHandler` forward to the global handler. `processPayroll` keeps a re-throwing safety-net that frees a stuck `processing` run. |
| 2 | High | `GET /payroll/:id` (Payroll Runs "View Details" modal) **always 500** — the query selected `e.department`, `e.designation`, `e.account_number`, joined `e.salary_slab_id`, none of which exist on `employees`. | Corrected to `e.account_no`, dropped non-existent columns, slab name via correlated subquery through `salary_structures`. Also fixed the dept breakdown reading camelCased fields. |
| 3 | Med | `GET /payroll/payslips/:id`, `/loans/:id`, `/revisions/:id`, `/tax-declarations/:id` returned **200 `{data:null}`** for a missing resource. | Return **404**. |
| 4 | Med | Non-numeric `:id` (`/payroll/abc/process`) → `parseInt`→NaN→`where('id',NaN)`→0 rows→**500**. | `intParam()` guard → **400**. |
| 5 | Med | `POST /payroll` with empty body silently generated a run for the whole org / first cycle / current month. | Require `payrollCycleId` or `month`; validate `employeeIds` is an array. |
| 6 | High | **Process Register = "Engine C"** — recomputed net pay with its own component chain + hard-coded PF/ESI rates, giving a different number than the actual run (₹98,000 vs ₹92,975 in test). | When a processed run exists for the month, the register now **overlays the persisted `payroll_run_employees` / `payroll_earnings` / `payroll_deductions`** figures (net, gross, deductions, PF/ESI/PT/TDS, paid days). The preview chain only runs for un-processed months. Manual overrides still win. |
| 7 | Med | Frontend calls `POST /payroll/tax-declarations/:id/finalize` and `/investments` — **no routes existed**; `TaxService.getTotalInvestments` was a `return 0` stub. | Added routes + `TaxService.addInvestment` / `getInvestments` (real `tax_investments` writes, enum-normalised `investment_type`, IDOR-checked, blocks writes to finalized declarations); `getTotalInvestments` now sums real 80C investments. `mysqlNow()` for timestamps. |

---

## C. Security regression (Slice 1) — re-verified at the HTTP layer

| Test | Result |
|---|---|
| No token / bad token → 401 | PASS |
| Cross-org admin (`oid=999`) lists payroll → only own org (empty) | PASS |
| Employee (user 14) → own payslip details → 200 | PASS |
| Employee (user 14) → another employee's payslip details → **403** | PASS |
| Employee → another employee's loan `/loans/:id` → **403** | PASS |
| Employee → another employee's loan schedule → **403** | PASS |
| Employee → another employee's salary revision `/revisions/:id` → **403** | PASS |
| Employee → another employee's tax declaration `/tax-declarations/:id` → **403** | PASS |
| Employee → `generate` / `process` payroll → **403** | PASS |
| Regenerate over a **published** run → rejected (now 400, was 500) | PASS |
| Process a **published** run → rejected (now 400) | PASS |
| Formula sandbox (unit tests) | PASS (15/15) |

## D. Idempotency / concurrency

| Test | Result |
|---|---|
| `POST /process` twice on a completed run → earnings row count unchanged (no dupes) | PASS |
| `POST /lock` twice → safe | PASS |
| `POST /approve` twice → 2nd rejected (400) | PASS |
| **Concurrent** `POST /publish` ×2 → exactly one 200, one 400 (atomic `approved→published` flip) | PASS |
| Exactly 2 payslips after publish of a 2-employee run (upsert by employee+month) | PASS |

## E. Consistency (Slice 43 requirement)

For a published 2-employee run, net salary ₹92,975:

```
GET /payroll/:id  (employees[].netSalary)   = 92975   PASS
payroll_run_employees.net_salary            = 92975
payslips.net_salary                         = 92975   PASS
GET /payroll/payslips/:id/details .net      = 92975   PASS
GET /payroll/runs/:id/register  (row.net)   = 92975   PASS  (after fix #6)
```

## F. Money & period engines (Slices 2–3) preserved

- No `Math.round(x*100)/100` reintroduced; authoritative figures come from `payroll.money.ts`.
- Register/`getPayrollRunDetails` read persisted values — they do **not** re-implement working-days / LOP / proration.
- `payroll.period.ts` remains the single proration source in `processPayroll` + `getPayslipDetails`.

---

## G. Test run summary

| | Result |
|---|---|
| Payroll API live HTTP tests | **42 / 42 PASS** |
| Payroll unit tests (`vitest run src/modules/payroll/utils`) | **48 / 48 PASS** (money, classify, period, evaluator) |
| `PayrollService.test.ts` | FAIL — **pre-existing**, repo-wide vitest alias breakage (`@/common/lib/logger`), unrelated to payroll logic |
| TypeScript (`tsc --noEmit`, payroll module) | **0 errors** |
| TypeScript (whole repo) | 167 errors — **all pre-existing, outside `modules/payroll`** (was 171 before this slice) |
| Lint | Repo has no ESLint config — `npm run lint` fails repo-wide, pre-existing |
| Build | Server runs on `tsx` (no build step); `client` build not run this slice |

---

## H. Remaining gaps (documented, not faked)

| Item | Status |
|---|---|
| Recalculate endpoint | Use regenerate + process; no separate route (by design). |
| Cancel / delete payroll run | No endpoint, no consumer — recommended future addition. |
| Advances request/approve API | `salary_advances` table exists, recovery works in payroll; no CRUD routes. |
| Bonus API | **No `bonuses` table** — not built (would be fake). Bonuses via `payroll_register_overrides.adjustment` only. |
| Overtime API | OT is Module-component-only (Slice 3); no second calc path introduced. |
| Process Register preview chain | Still separate code for **un-processed** months; overlaid with authoritative data once processed. Full engine merge deferred. |
| `/investments` frontend wiring | Backend complete + tested; `useTaxDeclaration.addInvestment` hook exists but no component calls it yet. |
| Pagination on list endpoints | `/payroll` runs list is capped at 20 in the service; loans/settlements/payslips lists are not paginated (small tables today) — recommended before scale. |
| Offset payroll cycles (26th–25th) | Not modelled (Slice 3 note). |
