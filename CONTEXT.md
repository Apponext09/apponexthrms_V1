# ApponextHRMS — Master Context File

> **Last Updated:** 2026-08-28
> **Purpose:** Single authoritative reference for every developer, agent, or AI assistant working on this codebase.
> All architecture decisions, role mappings, module descriptions, API routes, state management patterns, and naming conventions are captured here.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Tech Stack](#3-tech-stack)
4. [Ports & URLs](#4-ports--urls)
5. [Environment Variables](#5-environment-variables)
6. [Role & Portal Architecture](#6-role--portal-architecture)
7. [Role Hierarchy](#7-role-hierarchy)
8. [Authentication & Session](#8-authentication--session)
9. [Multi-Tenancy & Company Context](#9-multi-tenancy--company-context)
10. [Client Architecture](#10-client-architecture)
11. [Server Architecture](#11-server-architecture)
12. [Database Layer](#12-database-layer)
13. [Biometric Service](#13-biometric-service)
14. [Feature Modules — Client](#14-feature-modules--client)
15. [Feature Modules — Server](#15-feature-modules--server)
16. [API Route Reference](#16-api-route-reference)
17. [Client Route Reference](#17-client-route-reference)
18. [State Management](#18-state-management)
19. [RBAC System](#19-rbac-system)
20. [Real-Time & Socket.io](#20-real-time--socketio)
21. [Key Conventions & Patterns](#21-key-conventions--patterns)
22. [Public / Unauthenticated Routes](#22-public--unauthenticated-routes)

---

## 1. System Overview

**ApponextHRMS** is a **multi-tenant, multi-company Enterprise Human Resource Management System** built for organisations of varying size. It supports a wide cast of user personas — from Super Admin (platform owner) down to Interns and Consultants — each with a dedicated portal, sidebar, layout, and permission scope.

**Core capabilities:**
- Employee Lifecycle (hire → onboard → transfer → offboard)
- Attendance (biometric face punch, geo-location, shifts, regularisation)
- Leave & Holiday Management (apply, approve, balance, encashment)
- Payroll (salary structures, processing, payslips, loans, settlements, tax declarations)
- Recruitment (MRF → jobs → candidates → assessments → offers → onboard)
- Performance (OKRs, reviews, PIPs, competencies, succession, recognition)
- Asset Management (inventory, assignment, maintenance, software licences)
- Analytics & Reports (attendance, payroll, custom report engine)
- Workflow Engine (configurable multi-step approval workflows)
- Notifications (in-app, real-time Socket.io)
- Marketplace & Licensing (module toggle, subscription management)
- Super Admin Platform (tenant provisioning, org management)

---

## 2. Monorepo Structure

```
apponexthrms/
├── client/                      ← React 18 SPA (Vite + TypeScript)
│   └── src/
│       ├── App.tsx
│       ├── routes.tsx           ← Full client routing (980 lines)
│       ├── main.tsx
│       ├── index.css            ← Global TailwindCSS + custom tokens
│       ├── config/              ← api.ts, roles.ts, navigation.ts, routeConfig.ts
│       ├── components/          ← Shared UI (ProtectedRoute, etc.)
│       ├── layouts/             ← Shell layouts per portal
│       ├── features/            ← 33 feature module directories
│       ├── lib/                 ← rbac.ts, utility hooks
│       ├── types/               ← Global TypeScript types
│       └── utils/               ← Shared utilities
│
├── server/                      ← Node.js + Express + TypeScript API
│   └── src/
│       ├── app.ts               ← Express app factory
│       ├── server.ts            ← Server bootstrap + Socket.io
│       ├── routes/v1.ts         ← All API v1 route registrations
│       ├── config/              ← env.ts, constants.ts
│       ├── db/knex.ts           ← Knex singleton + camelCase mapper
│       ├── common/              ← Middleware (auth, rateLimiter, errorHandler)
│       ├── modules/             ← 29 server-side feature modules
│       ├── realtime/            ← Socket.io gateway
│       └── swagger/             ← OpenAPI documentation
│
├── biometric/                   ← Python FastAPI face-recognition service
│   ├── main.py                  ← FastAPI app (/health, /v1/embeddings/enroll, /v1/faces/identify)
│   ├── face_engine.py           ← face_recognition + liveness logic
│   └── config.py               ← Settings (threshold, origins, API key)
│
├── database/                    ← Migrations, seeds, SQL patches
│   ├── migrations/
│   └── seeds/
│
├── shared/                      ← Shared TypeScript types (client ↔ server)
├── keys/                        ← RS256 private.key + public.key (JWT)
├── .env                         ← Root environment variables
└── docker-compose.yml
```

---

## 3. Tech Stack

### Client (/client)

| Concern | Library |
|---|---|
| Framework | React 18 |
| Language | TypeScript 5 |
| Build Tool | Vite |
| Styling | TailwindCSS (custom tokens in index.css) |
| State (global) | Zustand (with persist middleware) |
| Server State / Cache | TanStack React Query |
| Routing | React Router v6 |
| HTTP Client | Axios (apiClient in config/api.ts) |
| Icons | Lucide React |
| Animation | Framer Motion |
| Lazy Loading | React.lazy + Suspense on all page components |

### Server (/server)

| Concern | Library |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Language | TypeScript 5 |
| ORM / Query Builder | Knex.js (mysql2 driver) |
| Database | MySQL 8 |
| Auth Tokens | JWT RS256 (asymmetric key pair) |
| Password Hashing | Argon2 |
| Real-Time | Socket.io |
| Validation | Zod |
| Env Parsing | Zod + dotenv |
| Security | Helmet, CORS, express-rate-limit |
| API Docs | Swagger UI Express (OpenAPI) |

### Biometric Service (/biometric)

| Concern | Library |
|---|---|
| Framework | FastAPI + Uvicorn |
| Face Recognition | face_recognition (dlib), OpenCV |
| Liveness | Anti-spoofing checks in face_engine.py |
| Auth | HMAC API Key (X-Biometric-Key header) |

---

## 4. Ports & URLs

| Service | Port | URL |
|---|---|---|
| Client Dev Server | 5173 (primary), 5174 (secondary) | http://localhost:5173 |
| Backend REST API | 5000 | http://localhost:5000/api/v1 |
| Biometric Service | 8000 | http://127.0.0.1:8000 |
| Swagger UI | 5000 | http://localhost:5000/api-docs |
| MySQL | 3306 | localhost:3306 |

---

## 5. Environment Variables

All variables live in the root `.env` file. Validated at startup via Zod in `server/src/config/env.ts`.

```bash
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<password>
DB_NAME=hrms

# JWT (RS256 asymmetric)
JWT_PRIVATE_KEY=<or read from keys/private.key>
JWT_PUBLIC_KEY=<or read from keys/public.key>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption (min 32 chars)
ENCRYPTION_KEY=<32+ char secret>

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_MFA=false
ENABLE_SSO=false
ENABLE_IP_RESTRICTION=false
```

Client reads `VITE_API_URL` from its own `.env` (defaults to `http://localhost:5000/api/v1`).

---

## 6. Role & Portal Architecture

Each role maps to exactly one **portal** (layout + route prefix + sidebar accent colour).
Role codes are lowercase strings matching the `role` column in the `users` table.

| Persona | Role Code(s) | Route Prefix | Layout Component | Sidebar Accent |
|---|---|---|---|---|
| **Super Admin** | `super_admin` | `/superadmin/*` | `SuperAdminLayout` | Purple |
| **CEO / Org Admin** | `organization_admin`, `ceo` | `/dashboard` | `AppShellLayout` | Blue/Indigo |
| **HR Admin** | `hr_admin`, `hr` | `/dashboard` | `AppShellLayout` | Blue/Indigo |
| **HR Manager / Support** | `hr_manager` | `/hr/*` | `HRLayout` | Rose |
| **Manager / Dept Head** | `manager`, `department_head` | `/manager/*` | `ManagerLayout` | Violet |
| **Team Lead** | `team_lead` | `/team-lead/*` | `TeamLeadLayout` | Emerald |
| **Employee** | `employee` | `/employee/*` | `EmployeeLayout` | Slate |
| **Intern** | `intern` | `/intern/*` | `InternLayout` | Amber |
| **Consultant** | `consultant` | `/consultant/*` | `ConsultantLayout` | Violet |

### ProtectedRoute Guard Rules (allowedRoles)

- **AppShellLayout**: `organization_admin`, `ceo`, `hr_admin`, `hr`, `hr_manager`, `super_admin`
- **HRLayout**: `hr_manager` ONLY (not CEO, not org_admin)
- **ManagerLayout**: `department_head`, `manager`
- **TeamLeadLayout**: `team_lead`
- **EmployeeLayout**: `employee`, `intern`, `consultant`
- **InternLayout**: `intern`
- **ConsultantLayout**: `consultant`
- **SuperAdminLayout**: `super_admin`

---

## 7. Role Hierarchy

```
Level 5: super_admin          (platform owner, cross-tenant access)
Level 4: organization_admin, ceo, hr_admin, hr
Level 3: hr_manager (Support), support
Level 2: department_head (Manager), manager, team_lead
Level 1: employee, consultant
Level 0: intern
```

**RBAC harmonisation rules (client `lib/rbac.ts`):**
- `organization_admin` ≡ `ceo` ≡ `admin` — treated interchangeably
- `hr` ≡ `hr_admin` ≡ `hr_manager` when checking HR-level access
- `super_admin` can manage all roles
- `organization_admin`/`ceo` can manage all roles except `super_admin`
- Users cannot grant roles higher than their own level

---

## 8. Authentication & Session

### Flow
1. `POST /api/v1/auth/login` → returns `accessToken` (15 min JWT RS256) + `refreshToken` (7 days)
2. Tokens stored in `localStorage` (`accessToken`, `refreshToken`)
3. `apiClient` reads `accessToken` from `localStorage` in request interceptor
4. On 401: interceptor attempts `POST /api/v1/auth/refresh` (queue-based, no infinite loop)
5. On successful refresh: retries original request
6. On failed refresh: clears tokens + redirects to `/login`

### JWT
- Algorithm: RS256 asymmetric (private key signs, public key verifies)
- Keys: `/keys/private.key` + `/keys/public.key` (or env vars)
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days

### authStore (Zustand, persist key: `auth-storage`)

Fields: `user`, `isAuthenticated`
Actions: `login()`, `logout()`, `fetchCurrentUser()`, `setUser()`, `updateUser()`

- `logout()` clears all auth storage, manipulates browser history, hard-redirects to `/login`
- `fetchCurrentUser()` calls `GET /auth/me` and updates roles/permissions in store

### User Interface Shape

```typescript
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: number;
  organizationName?: string;
  roles: string[];           // e.g. ['hr_manager']
  permissions: string[];     // granular permission strings
  employeeId?: number | null;
  avatarUrl?: string;
  departmentName?: string;
  designation?: string;
  companyId?: number | null; // active multi-company context
  companyName?: string | null;
}
```

---

## 9. Multi-Tenancy & Company Context

- **Tenant isolation** governed by `organization_id` on all tables
- **Company context** (subsidiary/branch) is `company_id`
- `X-Company-Id` header is auto-injected by `apiClient` from `localStorage['company-context-storage']`
- `company-context-storage` is a Zustand persisted store (`useCompanyStore`) with `selectedCompanyId`
- On login, if user has `companyId`, `companyStore` is automatically seeded
- Super Admin bypasses all tenant restrictions

---

## 10. Client Architecture

### Entry Points
- `main.tsx` → wraps `<App />` with `<BrowserRouter>` + `<QueryClientProvider>`
- `App.tsx` → renders `<AppRoutes />` with all role-based lazy routes

### Layouts Directory
- `AppShellLayout.tsx` — Admin/CEO/HR dashboard with `Sidebar.tsx` + `Topbar.tsx`
- `HRLayout.tsx` — HR Manager portal (`/hr/*`)
- `ManagerLayout.tsx` — Manager portal (`/manager/*`)
- `TeamLeadLayout.tsx` — Team Lead portal (`/team-lead/*`)
- `InternLayout.tsx` — Intern portal (`/intern/*`)
- `ConsultantLayout.tsx` — Consultant portal (`/consultant/*`)
- `features/employee/layout/EmployeeLayout.tsx` — Employee portal (`/employee/*`)
- `features/superadmin/sidebar/SuperAdminLayout.tsx` — Super Admin portal
- `features/settings/pages/SettingsLayout.tsx` — Nested settings layout

### ProtectedRoute (`components/ProtectedRoute.tsx`)
Wraps layout routes. Checks `allowedRoles` against `useAuthStore().user.roles`.
Redirects to `/login` if not authenticated, `/unauthorized` if role mismatch.

### Routing Strategy
- All page components **lazily loaded** via `React.lazy()` with named re-exports
- Wrapped in `<Suspense fallback={<PageLoader />}>` at root
- Route groups nested inside `<Route element={<ProtectedRoute>…}>` wrappers
- Full route file: `client/src/routes.tsx`

### Configuration Files
- `config/api.ts` — Axios client with interceptors
- `config/roles.ts` — SYSTEM_ROLES, ROLE_LABELS, ROLE_HIERARCHY constants
- `config/navigation.ts` — Sidebar nav items per role (~29KB)
- `config/routeConfig.ts` — Route metadata for breadcrumbs + titles

---

## 11. Server Architecture

### Express App (`src/app.ts`)
1. **CORS** — origins from `CORS_ORIGIN` env, credentials enabled
2. **Helmet** — security headers, CSP configured for Swagger
3. **Body Parsing** — JSON + urlencoded, 50MB limit (for base64 uploads)
4. **Static Files** — `/uploads` directory served at `/uploads`
5. **Swagger** — at `/api-docs`, `/swagger`, `/swagger-ui`
6. **Rate Limiter** — `apiLimiter` (100 req/min)
7. **API Routes** — all under `/api/v1`
8. **Error Handling** — `notFoundHandler` + `errorHandler`

### Middleware Stack (`src/common/middleware`)

| File | Purpose |
|---|---|
| `auth.ts` | JWT validation, populates `req.ctx` |
| `rateLimiter.ts` | Express rate limit |
| `requestLogger.ts` | HTTP request/response logging |
| `errorHandler.ts` | Centralised error formatting + 404 handler |

### Request Context (`req.ctx`)
Every authenticated request has:
```typescript
{
  userId: number;
  organizationId: number;
  role: string;
  permissions: string[];
  companyId?: number;  // from X-Company-Id header
}
```

---

## 12. Database Layer

### Knex (`src/db/knex.ts`)
- **Singleton** — one Knex instance per server process
- **Driver** — `mysql2`
- **Connection pool** — min 2, max 10 connections, idle timeout 30s
- **Auto camelCase** — `postProcessResponse` converts DB `snake_case` → JS `camelCase`
- **Transactions** — `withTransaction(async (trx) => { ... })`
- **Direct import** — `import { db } from '../db/knex'` (Proxy to Knex instance)

### Key Database Tables

| Table | Purpose |
|---|---|
| `organizations` | Tenant root records |
| `users` | All user accounts |
| `employees` | Employee master records |
| `departments` | Dept hierarchy per org |
| `designations` | Job titles per org |
| `locations` | Physical office locations |
| `branches` | Company branches |
| `attendance_logs` | Punch-in/out records |
| `attendance_shifts` | Shift definitions |
| `leaves` | Leave applications |
| `leave_balances` | Per-employee leave quotas |
| `payroll_cycles` | Payroll processing cycles |
| `salary_structures` | Component-based salary definitions |
| `payslips` | Generated payslips |
| `loans` | Loan requests and repayments |
| `expenses` | Expense claims |
| `assets` | IT/physical asset inventory |
| `asset_assignments` | Asset → employee mapping |
| `recruitment_mrfs` | Manpower Requisition Forms |
| `job_openings` | Published job listings |
| `candidates` | Candidate records |
| `performance_reviews` | Appraisal review records |
| `okrs` | Objectives and Key Results |
| `workflows` | Workflow templates |
| `workflow_instances` | Active workflow runs |
| `notifications` | In-app notification queue |
| `super_admins` | Platform-level admin accounts |
| `admin_organizations` | Super admin → org links |

---

## 13. Biometric Service

**Tech:** Python FastAPI + Uvicorn | **Port:** 8000  
**Purpose:** Face template enrollment and 1:N identification for attendance.

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Service health, model version, thresholds |
| `POST` | `/v1/embeddings/enroll` | API Key | Extract face embedding from 1–5 images |
| `POST` | `/v1/faces/identify` | API Key | Match face against up to 5,000 candidates |

**Auth:** `X-Biometric-Key` header (HMAC compare, configured in `config.py`)

### Request Models
- `EnrollmentRequest` — `image` (single b64) or `images[]` (up to 5 b64 frames)
- `IdentificationRequest` — query images + `candidates[]`, optional `threshold` (0.3–0.65)
- `Candidate` — `employee_id`, `employee_name`, `face_vector: list[float]` of `EMBEDDING_DIMENSION` values

### Integration Pattern
- **Enrollment:** server calls `/v1/embeddings/enroll` → stores `face_vector` in DB
- **Clock-In:** server fetches org face vectors → calls `/v1/faces/identify` → creates attendance log

---

## 14. Feature Modules — Client

All features under `client/src/features/`.

| Module | Description | Key Pages |
|---|---|---|
| `auth` | Login, JWT auth store | `LoginPage`, `authStore.ts` |
| `dashboard` | CEO/Admin executive dashboard | `DashboardPage` |
| `employee` | Employee master, profiles, portal pages | `EmployeeListPage`, `EmployeeProfilePage`, `EmployeeDashboardPage` |
| `employee-lifecycle` | Onboarding, transfers, offboarding | `OnboardingPage`, `TransfersPage`, `OffboardingPage` |
| `attendance` | Clock-in/out, shifts, regularisation | `AttendanceDashboard`, `ShiftManagementPage`, `BreakLogsPage` |
| `Livetracking` | Real-time geo-tracking map | `LiveTrackingDashboardPage`, `TrackingHistoryPage` |
| `leaves` | Leave apply, balance, encashment, approvals | `MyLeavesPage`, `ApplyLeavePage`, `LeaveBalancePage`, `ApprovalInboxPage` |
| `payroll` | Salary structure, processing, payslips, loans | `PayrollDashboard`, `PayrollProcessing`, `PayslipViewer`, `LoanManagement`, `FullFinalSettlement` |
| `recruitment` | MRF, jobs, candidates, assessments, offers | `RecruitmentDashboard`, `JobManagement`, `CandidateManagement`, `AssessmentManagementPage`, `OfferManagementPage` |
| `performance` | OKRs, reviews, PIPs, succession, recognition | `PerformanceDashboard`, `OKRManagementPage`, `PIPDashboardPage`, `SuccessionPlanningPage` |
| `asset` | Asset inventory, assignments, maintenance | `AssetDashboard`, `AssetList`, `AssignAsset`, `Maintenance`, `Licenses` |
| `analytics` | Reports, timelog, attendance analytics | `AttendanceReportsPage`, `TimelogReportPage`, `ReportEnginePage` |
| `workflow` | Workflow builder + approval chains | `WorkflowListPage`, `WorkflowBuilderPage`, `WorkflowDetailPage` |
| `notifications` | In-app notification centre | `NotificationCenterPage`, `NotificationPreferencesPage` |
| `settings` | Company config, branches, masters, branding | `CompanyProfilePage`, `BranchesPage`, `MastersHubPage`, `IdCardDesignerPage` |
| `manager` | Department dashboard, team roster, KPIs | `ManagerDashboardPage`, `MyTeamPage`, `DepartmentDashboard` |
| `team-lead` | Team dashboard, member roster | `TeamLeadDashboardPage`, `TeamMembersPage` |
| `HR` | HR dashboard, lifecycle view, burnout risk | `HRDashboardPage`, `EmployeeLifecyclePage`, `BurnoutRiskDashboard` |
| `superadmin` | Tenant management, subscriptions, helpdesk | `SuperAdminDashboardPage`, `SuperAdminOrganizationPage` |
| `org-structure` | Org chart visual | `OrgStructurePage` |
| `approvals` | Generic approvals dashboard | `ApprovalsDashboardPage` |
| `modules` | Module enable/disable per org | `ModuleManagementPage` |
| `intern` | Intern self-service portal | `InternDashboardPage` |
| `consultant` | Consultant self-service portal | `ConsultantDashboardPage` |
| `common` | Error pages | `NotFoundPage`, `UnauthorizedPage` |
| `engagement` | Surveys, polls, pulse | — |
| `marketplace` | Plugin marketplace | — |
| `licensing` | License/subscription management | — |
| `search` | Global search | — |

---

## 15. Feature Modules — Server

All server modules under `server/src/modules/`.

| Module | Route Prefix | Description |
|---|---|---|
| `auth` | `/api/v1/auth` | Login, logout, refresh, /me, password change |
| `rbac` | `/api/v1/rbac` | Roles, permissions, assignment |
| `users` | `/api/v1/users` | User CRUD, profile management |
| `organizations` | `/api/v1/organizations` | Org profile, settings, subsidiary companies |
| `employee` | `/api/v1/employees` | Employee CRUD, lifecycle, profiles, documents |
| `attendance` | `/api/v1/attendance` | Punches, breaks, shifts, geo-validation, biometric |
| `Livetracking` | `/api/v1/livetracking` | GPS breadcrumb tracking, live socket emissions |
| `leaves` | `/api/v1/leaves` | Leave applications, approvals, balance recalculation |
| `payroll` | `/api/v1/payroll` | Salary structures, processing, payslips, tax declarations |
| `loans` | `/api/v1/loans` | Loan requests and repayment schedules |
| `expenses` | `/api/v1/expenses` + `/api/v1/reimbursements` | Expense claims, travel requests |
| `notifications` | `/api/v1/notifications` | In-app notification CRUD + real-time dispatch |
| `settings` | `/api/v1/settings` | Company config, branding, leave policies |
| `asset` | `/api/v1/assets` | Asset inventory, assignment, maintenance, licences |
| `performance` | `/api/v1/performance` | Reviews, OKRs, competencies, PIPs, succession |
| `recruitment` | `/api/v1/recruitment` | MRF, jobs, candidates, assessments, offers |
| `master` | `/api/v1/master/holiday-calendars` | Holiday calendar master data |
| `workflow` | `/api/v1/workflow` + `/api/v1/workflows` | Workflow templates and instances |
| `marketplace` | `/api/v1/marketplace` | Plugin marketplace integrations |
| `licensing` | `/api/v1/licensing` | Module licences and feature flags |
| `superadmin` | `/api/v1/superadmin` | Platform-level tenant and subscription management |
| `employee-lifecycle` | `/api/v1/interviews` | Interview scheduling sub-module |
| `team-lead` | `/api/v1/team-lead` | Team lead member queries, approvals |
| `manager` | `/api/v1/manager` | Department dashboard, subordinate queries |
| `HR (lifecycle)` | `/api/v1/hr/lifecycle` + `/api/v1/lifecycle` | HR lifecycle management |
| `approvals` | `/api/v1/approvals` | Cross-module approval inbox |
| `dashboard` | `/api/v1/dashboard` | Aggregated dashboard data |
| `reports` | `/api/v1/reports` | Custom report engine |
| `audit` | Internal only | Audit trail logging |

---

## 16. API Route Reference

**Base URL:** `http://localhost:5000/api/v1`

### Authentication
```
POST  /auth/login               → { accessToken, refreshToken, user, roles, permissions }
POST  /auth/refresh             → { accessToken, refreshToken }
GET   /auth/me                  → { user, roles, permissions }
POST  /auth/logout
POST  /auth/change-password
```

### Employees
```
GET    /employees                → list (paginated, org-scoped)
POST   /employees                → create
GET    /employees/:id            → profile
PUT    /employees/:id            → update
DELETE /employees/:id            → soft-delete
GET    /employees/:id/documents  → documents
```

### Attendance
```
GET   /attendance               → records
POST  /attendance/punch-in      → clock in (geo validation)
POST  /attendance/punch-out     → clock out
GET   /attendance/shifts        → shift definitions
POST  /attendance/regularize    → regularisation request
```

### Leaves
```
GET   /leaves                   → leave applications
POST  /leaves                   → apply leave
PUT   /leaves/:id/approve       → approve
PUT   /leaves/:id/reject        → reject
GET   /leaves/balance           → leave balances
POST  /leaves/encashment        → encashment request
```

### Payroll
```
GET   /payroll/cycles           → payroll cycles
POST  /payroll/process          → trigger processing
GET   /payroll/payslips         → payslips (by employee / cycle)
GET   /payroll/salary-structure → salary component setup
PUT   /payroll/salary-structure → update
GET   /payroll/loans            → loan records
POST  /payroll/loans            → loan application
GET   /payroll/settlements      → F&F settlement records
```

### Recruitment
```
GET   /recruitment/mrfs         → MRF list
POST  /recruitment/mrfs         → create MRF
GET   /recruitment/jobs         → job openings
POST  /recruitment/jobs         → create job
GET   /recruitment/candidates   → candidate pipeline
POST  /recruitment/candidates   → add candidate
GET   /recruitment/offers       → offer letters
POST  /recruitment/offers       → create offer
```

### Public Recruitment (No Auth)
```
GET   /public/jobs
GET   /public/job-portal/openings
GET   /public/job-reference/:mrfId
POST  /public/job-reference/:mrfId/apply
GET   /public/offers/:uuid
POST  /public/offers/:uuid/accept
POST  /public/offers/:uuid/reject
GET   /public/assessments/attempts/:uuid
POST  /public/assessments/attempts/:uuid/submit
```

### Manager
```
GET   /manager/team             → dept team (team leads + employees)
GET   /manager/dashboard        → KPIs, headcount, leave summary
GET   /manager/hiring           → open MRFs and candidates
```

### Team Lead
```
GET   /team-lead/members        → direct reports
GET   /team-lead/dashboard      → team KPIs
```

### Assets
```
GET   /assets                   → inventory list
POST  /assets                   → create asset
POST  /assets/assign            → assign to employee
POST  /assets/return            → return from employee
GET   /assets/maintenance       → maintenance records
GET   /assets/licenses          → software licences
```

### Performance
```
GET   /performance/reviews      → review cycles
POST  /performance/reviews      → create review
GET   /performance/okrs         → OKRs
POST  /performance/okrs         → create OKR
GET   /performance/pips         → PIP records
GET   /performance/competencies → competency matrix
GET   /performance/succession   → succession plans
```

### Analytics / Reports
```
GET   /reports                  → report engine query
GET   /reports/options          → filter dropdowns (depts, designations, locations)
```

### Super Admin
```
GET   /superadmin/organizations → all tenants
POST  /superadmin/organizations → create tenant
GET   /superadmin/subscriptions → subscription plans
GET   /superadmin/helpdesk      → support tickets
```

---

## 17. Client Route Reference

### Public Routes (No Auth Required)

| Path | Component |
|---|---|
| `/login` | `LoginPage` |
| `/unauthorized` | `UnauthorizedPage` |
| `/careers` | `JobReferencePage` |
| `/liberation/:portalId/:requestId/:token` | `JobReferencePage` |
| `/public/job-reference/:requestId` | `JobReferencePage` |
| `/public/offers/review/:uuid` | `PublicOfferPage` |
| `/public/assessments/take/:uuid` | `TakeAssessmentPage` |

### Admin / CEO / HR Portal (AppShellLayout)
**Roles:** `organization_admin`, `ceo`, `hr_admin`, `hr`, `hr_manager`, `super_admin`

| Path | Component |
|---|---|
| `/dashboard` | `DashboardPage` |
| `/employees` | `EmployeeListPage` |
| `/employees/:id` | `EmployeeProfilePage` |
| `/employees/:id/edit` | `EmployeeEditPage` |
| `/org-structure` | `OrgStructurePage` |
| `/employee-lifecycle` | `EmployeeLifecyclePage` |
| `/attendance` | `AttendanceDashboard` |
| `/attendance/shifts` | `ShiftManagementPage` |
| `/attendance/locations` | `HRAttendanceLocationPage` |
| `/attendance/break-logs` | `BreakLogsPage` |
| `/attendance/regularization-logs` | `AdminRegularizationLogsPage` |
| `/attendance/face-punch` | `CeoFacePunchPage` |
| `/live-tracking` | `LiveTrackingDashboardPage` |
| `/leaves` | `MyLeavesPage` |
| `/leaves/approvals` | `ApprovalInboxPage` |
| `/leaves/balance` | `LeaveBalancePage` |
| `/leaves/encashment` | `LeaveEncashmentPage` |
| `/leaves/reports/burnout-risk` | `BurnoutRiskDashboard` |
| `/payroll` | `PayrollDashboard` |
| `/payroll/processing` | `PayrollProcessing` |
| `/payroll/salary-structure` | `SalaryStructureManagement` |
| `/payroll/salary-revision` | `SalaryRevisionManagement` |
| `/payroll/payslips` | `PayslipViewer` |
| `/payroll/loans` | `LoanManagement` |
| `/payroll/settlements` | `FullFinalSettlement` |
| `/payroll/gratuity` | `GratuityPolicyPage` |
| `/payroll/reports` | `PayrollReportsPage` |
| `/payroll/tax-declaration` | `TaxDeclaration` |
| `/expense-claims` | `AdminExpenseClaims` |
| `/travel-requests` | `AdminTravelRequests` |
| `/mass-salary-upload` | `MassSalaryStructureUploadPage` |
| `/recruitment/dashboard` | `RecruitmentDashboard` |
| `/recruitment/jobs` | `JobManagement` |
| `/recruitment/candidates` | `CandidateManagement` |
| `/recruitment/assessments` | `AssessmentManagementPage` |
| `/recruitment/offers` | `OfferManagementPage` |
| `/recruitment/resume-bank` | `ResumeBankPage` |
| `/recruitment/interview-schedule` | `InterviewCalendarPage` |
| `/assets` | `AssetDashboard` |
| `/assets/list` | `AssetList` |
| `/assets/maintenance` | `Maintenance` |
| `/assets/licenses` | `Licenses` |
| `/performance` | `PerformanceDashboard` |
| `/performance/goals` | `GoalManagementPage` |
| `/performance/reviews` | `ReviewCyclesPage` |
| `/performance/okrs` | `OKRManagementPage` |
| `/performance/pips` | `PIPDashboardPage` |
| `/performance/succession` | `SuccessionPlanningPage` |
| `/performance/recognition` | `RecognitionDashboardPage` |
| `/workflows` | `WorkflowSettingsPage` |
| `/workflows/list` | `WorkflowListPage` |
| `/workflows/create` | `WorkflowBuilderPage` |
| `/analytics/attendance` | `AttendanceReportsPage` |
| `/analytics/timelog` | `TimelogReportPage` |
| `/analytics/report-engine` | `ReportEnginePage` |
| `/notifications` | `NotificationCenterPage` |
| `/requests` | `EmployeeRequestsPage` |
| `/settings` | `GeneralSettingsPage` |
| `/settings/company-profile` | `CompanyProfilePage` |
| `/settings/branches` | `BranchesPage` |
| `/settings/leave-policies` | `LeavePoliciesPage` |
| `/settings/branding` | `BrandingPage` |
| `/settings/id-card-designer` | `IdCardDesignerPage` |
| `/settings/modules` | `ModuleManagementPage` |
| `/masters` | `MastersHubPage` |
| `/approvals` | `ApprovalInboxPage` |

### HR Manager / Support Portal (HRLayout) — /hr/*
**Role:** `hr_manager` ONLY

| Path | Component |
|---|---|
| `/hr/dashboard` | `HRDashboardPage` |
| `/hr/employees` | `EmployeeListPage` |
| `/hr/employee-lifecycle` | `EmployeeLifecyclePage` |
| `/hr/attendance` | `AttendanceDashboard` |
| `/hr/attendance/locations` | `HRAttendanceLocationPage` |
| `/hr/attendance-regularization` | `ManagerHRRegularizationApprovals (role="hr")` |
| `/hr/leaves/approvals` | `ApprovalInboxPage` |
| `/hr/payroll` | `PayrollDashboard` |
| `/hr/salary-structure` | `SalaryStructureManagement` |
| `/hr/salary-revision` | `SalaryRevisionManagement` |
| `/hr/payslips` | `PayslipViewer` |
| `/hr/loans` | `LoanManagement` |
| `/hr/settlements` | `FullFinalSettlement` |
| `/hr/expense-claims` | `AdminExpenseClaims` |
| `/hr/recruitment/dashboard` | `RecruitmentDashboard` |
| `/hr/recruitment/jobs` | `JobManagement` |
| `/hr/recruitment/candidates` | `CandidateManagement` |
| `/hr/performance` | `PerformanceDashboard` |
| `/hr/workflow` | `WorkflowListPage` |
| `/hr/masters` | `MastersHubPage` |
| `/hr/live-tracking` | `LiveTrackingDashboardPage` |
| `/hr/settings` (nested) | `SettingsLayout` (company-profile, branches, leave-policies, ...) |

### Manager Portal (ManagerLayout) — /manager/*
**Roles:** `manager`, `department_head`

| Path | Component |
|---|---|
| `/manager/dashboard` | `ManagerDashboardPage` |
| `/manager/team` | `MyTeamPage` |
| `/manager/attendance` | `AttendanceDashboard` |
| `/manager/attendance-regularization` | `ManagerHRRegularizationApprovals (role="manager")` |
| `/manager/leave-approvals` | `ApprovalInboxPage` |
| `/manager/hiring` | `DepartmentDashboard` |
| `/manager/mrf-request` | `MrfRequestPage` |
| `/manager/interview-schedule` | `InterviewCalendarPage` |
| `/manager/payroll` | `EmployeePayrollPortal` |
| `/manager/payslips` | `PayslipViewer` |
| `/manager/salary-revisions` | `SalaryRevisionManagement` |
| `/manager/performance` | `PerformanceDashboard` |
| `/manager/profile` | `EmployeeProfilePage` |
| `/manager/leaves` | `LeavePage` |
| `/manager/live-tracking` | `LiveTrackingDashboardPage` |
| `/manager/settlements` | `TeamSettlementsPage` |

### Team Lead Portal (TeamLeadLayout) — /team-lead/*
**Role:** `team_lead`

| Path | Component |
|---|---|
| `/team-lead/dashboard` | `TeamLeadDashboardPage` |
| `/team-lead/members` | `TeamMembersPage` |
| `/team-lead/attendance` | `AttendanceDashboard` |
| `/team-lead/leaves/approvals` | `ApprovalInboxPage` |
| `/team-lead/payroll` | `EmployeePayrollPortal` |
| `/team-lead/payslips` | `PayslipViewer` |
| `/team-lead/profile` | `TeamLeadProfilePage` |
| `/team-lead/interview-schedule` | `InterviewCalendarPage` |
| `/team-lead/live-tracking` | `LiveTrackingDashboardPage` |
| `/team-lead/settlements` | `TeamSettlementsPage` |

### Employee Portal (EmployeeLayout) — /employee/*
**Roles:** `employee`, `intern`, `consultant`

| Path | Component |
|---|---|
| `/employee/dashboard` | `EmployeeDashboardPage` |
| `/employee/profile` | `ProfilePage` |
| `/employee/attendance` | `AttendancePage` |
| `/employee/face-attendance` | `FaceAttendancePage` |
| `/employee/leaves` | `LeavePage` |
| `/employee/regularization` | `RegularizationPage` |
| `/employee/shift-roster` | `ShiftRosterPage` |
| `/employee/holiday-calendar` | `HolidayCalendarPage` |
| `/employee/timesheet` | `TimesheetPage` |
| `/employee/payroll` | `EmployeePayrollPortal` |
| `/employee/payslips` | `PayslipViewer` |
| `/employee/tax-declaration` | `TaxDeclarationPage` |
| `/employee/expenses` | `ExpensePage` |
| `/employee/travel` | `TravelPage` |
| `/employee/assets` | `AssetPage` |
| `/employee/documents` | `DocumentsPage` |
| `/employee/id-card` | `IDCardPage` |
| `/employee/org-chart` | `OrgChartPage` |
| `/employee/team-directory` | `TeamDirectoryPage` |
| `/employee/performance` | `PerformancePage` |
| `/employee/goals` | `GoalsPage` |
| `/employee/feedback` | `FeedbackPage` |
| `/employee/learning` | `LearningPage` |
| `/employee/announcements` | `AnnouncementsPage` |
| `/employee/surveys` | `SurveysPage` |
| `/employee/helpdesk` | `HelpdeskPage` |
| `/employee/referrals` | `ReferralPage` |
| `/employee/job-openings` | `JobOpeningsPage` |
| `/employee/loans` | `LoanRequestPage` |
| `/employee/ai-assistant` | `AIAssistantPage` |
| `/employee/notifications` | `NotificationCenterPage` |
| `/employee/approvals` | `ApprovalsPage` |
| `/employee/my-settlement` | `MySettlementPage` |
| `/employee/settings` | `SettingsSecurityPage` |

### Intern Portal (InternLayout) — /intern/*
**Role:** `intern`
Pages: dashboard, profile, attendance, leaves, payslips, documents, holiday-calendar, announcements, id-card, org-chart

### Consultant Portal (ConsultantLayout) — /consultant/*
**Role:** `consultant`
Pages: dashboard, profile, attendance, leaves, payslips, expenses, travel, documents, holiday-calendar, announcements, id-card, org-chart

### Super Admin Portal (SuperAdminLayout) — /superadmin/*
**Role:** `super_admin`

| Path | Component |
|---|---|
| `/superadmin/dashboard` | `SuperAdminDashboardPage` |
| `/superadmin/organization` | `SuperAdminOrganizationPage` |
| `/superadmin/subscription` | `SuperAdminSubscriptionPage` |
| `/superadmin/helpdesk` | `SuperAdminHelpDeskPage` |
| `/superadmin/profile` | `SuperAdminProfilePage` |

---

## 18. State Management

### Zustand Stores (Client)

| Store | File | Purpose | Persist Key |
|---|---|---|---|
| `useAuthStore` | `features/auth/store/authStore.ts` | Auth session, user profile, tokens | `auth-storage` |
| `useCompanyStore` | `features/settings/store/companyStore.ts` | Active company/subsidiary context | `company-context-storage` |

### TanStack React Query
- All server data cached via `useQuery` / `useMutation`
- `QueryClient` configured in `config/query.ts`
- Query keys: module-namespaced, e.g. `['employees', orgId]`, `['leaves', employeeId]`

---

## 19. RBAC System

### Client-Side Utilities (`lib/rbac.ts`)

```typescript
hasRole(roles, 'hr')            // checks hr | hr_admin | hr_manager
hasAnyRole(roles, [...])        // OR check
hasAllRoles(roles, [...])       // AND check
hasPermission(perms, 'x')       // exact permission or wildcard '*'
useRbac()                       // hook: all checks for current user
useIsAdmin()                    // true if any admin-level role
useIsSuperAdmin()               // true if super_admin
useCanManageRole(role)          // enforces role hierarchy
useCanAccessOrganization(id)    // super_admin bypasses; others must match
useCanAccessEmployee(id)        // admin: any in org; manager/TL: team; employee: self
```

### Server-Side
- Auth middleware validates JWT → populates `req.ctx`
- Controllers/services check `req.ctx.role` and `req.ctx.permissions`
- All queries filter by `req.ctx.organizationId`

### Permission String Format
`resource:action` — e.g. `employees:read`, `payroll:process`, `leaves:approve`
Wildcard `*` grants all permissions.

---

## 20. Real-Time & Socket.io

- Socket.io mounted on HTTP server in `server.ts`
- Real-time gateway: `server/src/realtime/`
- Events emitted by:
  - **Live Tracking** (`/api/v1/livetracking`) — GPS breadcrumbs
  - **Notifications** — push on create
  - **Attendance punches** — org-wide clock events
- Auth: JWT as socket handshake query param / header

---

## 21. Key Conventions & Patterns

### File Naming
| Type | Convention |
|---|---|
| React Components | `PascalCase.tsx` |
| Hooks | `useCamelCase.ts` |
| Zustand Stores | `camelCaseStore.ts` |
| Server Controllers | `ResourceController.ts` |
| Server Services | `resource.service.ts` |
| Server Routes | `resource.routes.ts` |

### Database Conventions
- All tables: `snake_case` columns
- All tables: `id` (bigInt PK), `created_at`, `updated_at`
- Soft deletes: `deleted_at` nullable timestamp
- Multi-tenancy: `organization_id` on every tenant-scoped table
- Knex auto-converts: DB `snake_case` ↔ JS `camelCase`

### API Response Shapes

**Success:**
```json
{
  "success": true,
  "data": {},
  "message": "Optional",
  "meta": { "page": 1, "total": 100 }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Import Aliases (Client)
`@/` → `client/src/`
```typescript
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { hasRole } from '@/lib/rbac';
```

### Department Hierarchy SQL Rule

**Manager** portal (`/manager/team`):
```sql
WHERE current_department_id = manager.departmentId
   OR reporting_manager_id = manager.employeeId
   OR reporting_manager_id IN (team_lead_ids_under_manager)
```

**Team Lead** portal (`/team-lead/members`):
```sql
WHERE reporting_manager_id = teamLead.employeeId
```

### Payroll Portal Variants (role-scoped)
- `EmployeePayrollPortal` — employee self-service
- `TeamLeadPayrollPortal` — team payroll summary
- `ManagerPayrollPortal` — dept payroll view
- `HRPayrollPortal` — HR processing view
- `AdminPayrollPortal` — full admin access

### Security Constants (`server/src/config/constants.ts`)
- Password min/max: 8–128 chars; requires uppercase, lowercase, number, special char
- Max failed login attempts: 5; lockout: 15 min
- Session timeout: 30 min
- Cache TTLs: permission 60s, user 5 min, org 1 hour, role 30 min

---

## 22. Public / Unauthenticated Routes

| Route Pattern | Purpose |
|---|---|
| `/careers` | Public job board |
| `/liberation/:portalId/:requestId/:token` | Tokenised job reference page |
| `/public/job-reference/:requestId` | Job application form |
| `/public/offers/review/:uuid` | Candidate offer review & acceptance |
| `/public/assessments/take/:uuid` | Candidate assessment portal |
| `GET /api/v1/public/jobs` | Job listings API |
| `GET /api/v1/public/job-portal/openings` | Open positions API |
| `POST /api/v1/public/job-reference/:mrfId/apply` | Submit application |
| `GET /api/v1/public/offers/:uuid` | Offer letter data |
| `POST /api/v1/public/offers/:uuid/accept` | Accept offer |
| `POST /api/v1/public/offers/:uuid/reject` | Reject offer |
| `GET /api/v1/public/assessments/attempts/:uuid` | Assessment data |
| `POST /api/v1/public/assessments/attempts/:uuid/submit` | Submit assessment |

---

## Quick Reference Card

```
APPONEXT HRMS — QUICK REFERENCE
================================
Client:    http://localhost:5173
API:       http://localhost:5000/api/v1
Biometric: http://127.0.0.1:8000
Swagger:   http://localhost:5000/api-docs

ROLE             PORTAL PREFIX
-----------      ----------------------------
super_admin      /superadmin/*  (SuperAdminLayout)
org_admin/ceo    /dashboard     (AppShellLayout)
hr_admin/hr      /dashboard     (AppShellLayout)
hr_manager       /hr/*          (HRLayout)
manager          /manager/*     (ManagerLayout)
team_lead        /team-lead/*   (TeamLeadLayout)
employee         /employee/*    (EmployeeLayout)
intern           /intern/*      (InternLayout)
consultant       /consultant/*  (ConsultantLayout)

DB:  MySQL 8 | ORM: Knex (auto camelCase/snakeCase)
JWT: RS256   | Hash: Argon2 | Access: 15m | Refresh: 7d
Key Headers: Authorization: Bearer <token>
             X-Company-Id: <companyId>
```

---

*This file is the canonical context source. Update it whenever architecture, roles, routes, or modules change.*
