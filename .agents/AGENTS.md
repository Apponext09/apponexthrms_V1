# ApponextHRMS - Comprehensive Workspace Agent Guide

## 1. System Overview & Tech Stack
- **Architecture**: Multi-tenant Enterprise Human Resource Management System (HRMS).
- **Backend (`/server`)**: Node.js, Express, TypeScript, Knex.js query builder, MySQL 2 (`mysql2`), Socket.io for real-time events, JWT with RS256/argon2.
- **Frontend (`/client`)**: React 18, TypeScript, Vite, TailwindCSS (Vanilla / Custom CSS tokens), Zustand (State stores), TanStack React Query (Server caching), React Router v6, Lucide React icons, Framer Motion.
- **Biometric Service (`/biometric`)**: Python, FastAPI / Uvicorn, OpenCV / face_recognition / dlib for facial recognition and liveness verification.
- **Root Ports**:
  - Client Dev Server: `5173` / `5174`
  - Backend API: `5000` (`http://localhost:5000/api/v1`)
  - Biometric Service: `8000` (`http://127.0.0.1:8000`)

---

## 2. Multi-Tenant Context & Request Headers
- Tenant isolation is governed by `organization_id` and multi-company context `company_id` (`X-Company-Id` header).
- In the client, `apiClient` (`client/src/config/api.ts`) automatically injects:
  - `Authorization: Bearer <accessToken>`
  - `X-Company-Id: <selectedCompanyId>` (from `localStorage['company-context-storage']`)

---

## 3. Role & Portal Architecture Mapping

| Persona | Role Code / Tag | Portal Route & Layout | Description |
|---|---|---|---|
| **CEO** | `organization_admin` | `/dashboard` (`AppShellLayout`) | Top-level executive admin dashboard with full org privileges. |
| **HR** | `hr_admin` / `hr` | `/dashboard` (`AppShellLayout`) | Shared admin portal with HR display branding. |
| **Support** | `support` / `hr_manager` | `/hr/*` (`HRLayout`) | Dedicated operational support portal (formerly HR Manager portal). |
| **Manager** | `manager` / `department_head` | `/manager/*` (`ManagerLayout`) | Departmental overview, employee rosters, multi-tier approvals. |
| **Team Lead** | `team_lead` | `/team-lead/*` (`TeamLeadLayout`) | Team-level management, member attendance, shift tracking. |
| **Employee** | `employee` | `/employee/*` (`EmployeeLayout`) | Self-service employee portal (leaves, claims, payslips, assets). |
| **Super Admin** | `super_admin` | `/superadmin/*` (`SuperAdminLayout`) | Platform-level management, tenant provisioning, subscriptions. |

---

## 4. Key Client Directories & State Architecture (`/client/src`)

### Layouts (`/client/src/layouts`)
- `AppShellLayout.tsx` $\rightarrow$ Primary Admin/CEO/HR dashboard shell using `Sidebar.tsx` + `Topbar.tsx`.
- `HRLayout.tsx` $\rightarrow$ Support / Operational portal shell (`/hr/*`).
- `ManagerLayout.tsx` $\rightarrow$ Department Manager shell (`/manager/*`).
- `TeamLeadLayout.tsx` $\rightarrow$ Team Lead shell (`/team-lead/*`).
- `EmployeeLayout.tsx` (`/features/employee/layout/EmployeeLayout.tsx`) $\rightarrow$ Self-service portal shell.
- `SuperAdminLayout.tsx` (`/features/superadmin/sidebar/SuperAdminLayout.tsx`) $\rightarrow$ Platform admin shell.

### Core Feature Modules (`/client/src/features`)
- `auth`: `authStore.ts` (persisted Zustand store with JWT token management, user profile data).
- `employee`: Employee master list, profiles, onboarding, document management.
- `manager`: `useManager.ts` hook for department roster, KPIs, hiring/promotion requests.
- `team-lead`: `useTeam.ts` hook for direct reports, team attendance, approvals.
- `attendance`: Clock-in/out, live geolocation tracking, shifts, regularization logs, break overlays (`BreakOverlay.tsx`).
- `leaves`: Apply leave, leave balances, encashment, multi-level approval inbox.
- `payroll`: Salary structure, processing, revisions, payslips (`PayslipViewer.tsx`), loans, reimbursements, F&F settlements.
- `recruitment`: MRF requests, candidate pipeline, assessments, public job references & offer letters.
- `performance`: OKRs, appraisal reviews, PIPs, competency matrices, recognition.
- `asset`: Asset assignment, inventory, tracking, maintenance, software licenses.
- `settings`: Company profile, branches, departments, masters hub (`MastersHubPage.tsx`), branding.

---

## 5. Key Server Modules & API Routes (`/server/src`)

### Database Access & Knex (`server/src/db/knex.ts`)
- Knex automatically handles camelCase $\leftrightarrow$ snake_case mapping across queries and responses.
- Database transactions should use `withTransaction(async (trx) => { ... })`.

### Route Index (`server/src/routes/v1.ts`)
- `/api/v1/auth` $\rightarrow$ Login, register, refresh tokens, `/me`.
- `/api/v1/rbac` $\rightarrow$ Role permissions, assignment.
- `/api/v1/employees` $\rightarrow$ Employee CRUD, lifecycle, profiles.
- `/api/v1/manager` $\rightarrow$ Department dashboard, subordinate queries, recommendations.
- `/api/v1/team-lead` $\rightarrow$ Team lead members, team dashboard, approvals.
- `/api/v1/attendance` $\rightarrow$ Punches, breaks, shifts, location validations.
- `/api/v1/leaves` $\rightarrow$ Leave applications, approvals, balance recalculation.
- `/api/v1/payroll` $\rightarrow$ Payroll processing, salary structures, tax declarations, slips.
- `/api/v1/recruitment` $\rightarrow$ Jobs, applicants, MRF, public candidate submissions.
- `/api/v1/livetracking` $\rightarrow$ Geolocation tracking breadcrumbs and live socket emissions.
- `/api/v1/superadmin` $\rightarrow$ Organizations, subscriptions, tenant management.

---

## 6. Department Hierarchy & Team Visibility Rule

For **ALL departments** across the organization:

1. **Manager Portal (`/manager/team`)**:
   - Must dynamically query and list **ALL Team Leads and Employees** belonging to that department or reporting under that Manager.
   - Multi-tier hierarchy resolution includes 2nd-tier employees reporting to Team Leads alongside 1st-tier Team Leads.
   - SQL condition formula:
     ```sql
     WHERE current_department_id = manager.departmentId
        OR reporting_manager_id = manager.employeeId
        OR reporting_manager_id IN (team_lead_ids)
     ```

2. **Team Lead Portal (`/team-lead/members`)**:
   - Must dynamically query and list **ALL Employees** assigned to or reporting under that specific Team Lead.

3. **Fallback & Data Resilience**:
   - Always ensure data loaders in `useManager` and `useTeam` have fallback resolution so that Manager and Team Lead views are never blank for any department.
