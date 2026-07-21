# ApponextHRMS Architecture Documentation

## Project Overview

ApponextHRMS is an enterprise-grade, multi-tenant Human Resources Management System platform designed to compete with Keka, BambooHR, Zoho People, Darwinbox, PeopleHR, and Hoshi.

**Key Characteristics:**
- **Multi-Tenant**: Shared database with `organization_id` scoping (not database-per-tenant)
- **Enterprise Security**: JWT + RBAC, MFA, SSO, audit logging, IP restrictions
- **Type-Safe**: Full TypeScript across frontend and backend
- **Modular**: 18 scalable feature modules with repeating architecture pattern
- **Dark/Light Theme**: Modern SaaS UX with Tailwind CSS
- **Real-Time Ready**: Socket.io for instant notifications

## Technology Stack

### Frontend
- React 18+ with Vite build tool
- TypeScript for type safety
- Tailwind CSS + PostCSS for styling
- TanStack Query (React Query) for server state
- React Hook Form + Zod for form validation and schema-based types
- Zustand for client-side state management
- React Router v6 for routing
- Framer Motion for animations
- Recharts for charts/dashboards
- Axios with interceptors for API communication

### Backend
- Node.js 18+ with Express.js
- TypeScript for type safety
- Knex.js + mysql2 for database access (parameterized queries)
- JWT (RS256) for authentication
- Zod for runtime validation
- Argon2id for password hashing
- Socket.io for real-time communication
- Pino for logging
- Helmet for security headers

### Database
- MySQL 8.0 with utf8mb4 charset
- Knex migrations for schema versioning
- Camel case↔snake case mapping at the ORM layer
- Soft deletes for audit trail

### Infrastructure
- Docker Compose for local development (MySQL, Adminer, Mailhog)
- npm workspaces for monorepo management
- ESLint + Prettier for code quality
- Vitest for unit/integration testing
- GitHub Actions ready (template included)

## Multi-Tenancy Architecture

### Shared Database Model
All tenant data is in one MySQL database. Isolation is enforced at the application layer:

1. **Every tenant-scoped table carries `organization_id`**: Even where reachable transitively via FK, we denormalize `organization_id` for query simplicity and defense-in-depth.

2. **`BaseRepository` tenant-scoping layer**: All queries automatically inject `.where('organization_id', ctx.organizationId)`. This is the single choke point—no exceptions, no manual tenant filtering in service code.

3. **Middleware enforces tenant context**: `resolveTenant` middleware resolves org from subdomain, request header, or JWT claim; attaches to `req.tenant`. Routes always have org context available.

4. **RBAC enforces row-level permissions**: On top of tenant scoping, `requirePermission` middleware checks if the user has the permission code AND if the resource belongs to their org.

### Super Admin Exception
The sole platform-level role (`is_platform_role: true`) with `organization_id = NULL` has its own route namespace (`/api/v1/platform/*`) and middleware chain. It can operate across all tenants and is audit-logged distinctly.

## Authentication & Authorization

### JWT Strategy
- **Access Token**: RS256 (asymmetric), 15-minute TTL, lean claims: `{sub, oid, sid, iat, exp}`
- **Refresh Token**: Opaque random 256-bit value, SHA-256 hashed in `auth_sessions.refresh_token_hash`, rotated on every refresh, stored as `httpOnly, Secure, SameSite=Lax` cookie
- **Permission Checks**: Always live DB lookup + in-memory LRU cache (60s TTL) — no embedded permissions in JWT, so revocation is instant

### MFA (TOTP)
- `otplib` for secret generation/verification
- QR code generation for client setup
- 10 single-use hashed recovery codes stored in `users.mfa_recovery_codes`
- 5-minute `mfaToken` JWT for the OTP step between login and auth

### OTP Login
- 6-digit codes sent via email (Mailhog in dev) or SMS (pluggable provider interface)
- Rate-limited: 3 requests per 10 minutes per identifier+IP
- Max 5 verify attempts before invalidation
- Hash stored, never plain text

### SSO (Google + Microsoft)
- `openid-client` library (certified OIDC client) for standards-compliant integration
- PKCE + state for authorization code flow
- Auto-linking to existing user by email, manual linking for new email accounts
- Org-level domain-join policy control (auto-provision or require linking)

### RBAC
- **12 System Roles**: org-admin, hr-manager, recruitment-manager, team-lead, reporting-manager, employee, consultant, intern, client, auditor, finance-manager
- **Custom Roles**: Orgs can create custom roles with any permission subset
- **Dynamic Permission Checks**: `requirePermission('module.resource.action')` middleware checks effective permissions (live DB lookup + cache)
- **Role Assignment**: Can be permanent or temporary (with `expires_at`)
- **Scope Control**: Row-level filtering (e.g., "reporting manager sees only direct reports") handled in service-layer query filters, not a generic engine

## Database Schema

### Core Tables (14 migrations)

1. **organizations** — tenant root, no organization_id of its own
2. **users** — login identities (may not map to employees; email unique per org)
3. **roles** — org-scoped; system roles seeded per org
4. **permissions** — global catalog, `module.resource.action` format
5. **role_permissions** — many-to-many join
6. **user_roles** — many-to-many with temp assignment support
7. **employees** — minimal stub (extended heavily in Phase 2)
8. **auth_sessions** — device/refresh session tracking
9. **login_history** — append-only login attempt log
10. **audit_logs** — append-only cross-module audit trail
11. **otp_codes** — hashed OTP codes with expiry
12. **sso_identities** — linked SSO accounts per provider
13. **password_policies** — org-level complexity/expiry rules
14. **password_history** — reuse prevention

### Key Design Points
- `id BIGINT UNSIGNED AUTO_INCREMENT` PK + `uuid CHAR(36) UNIQUE` for external exposure
- Soft deletes (`deleted_at`) on most tables for audit/recovery
- Foreign keys with `ON DELETE CASCADE` where appropriate
- Careful indexing for multi-org queries, JWT claims extraction, session expiry
- No single-purpose "meta" or "settings" columns — use specific columns for clarity

## API Architecture

### Response Envelope
All API responses follow a consistent schema:
```typescript
{
  success: boolean,
  data?: T,
  error?: { code, message, details },
  meta?: { page, pageSize, total }
}
```

### Versioning
- Currently `/api/v1/` (no breaking changes planned in Phase 1)
- Future versions added as `/api/v2/` with backward compatibility window
- Internal modules can have experimental endpoints under `/api/v1-beta/`

### Rate Limiting
- Global loose limiter (15 req/min per IP)
- Strict limiters on auth endpoints (3 login attempts/5 min, 3 OTP requests/10 min, 3 forgot-password/10 min)
- Configurable per environment
- Redis adapter for horizontal scaling (documented, not built now)

### Error Handling
- Standardized error codes (e.g., `INVALID_CREDENTIALS`, `PERMISSION_DENIED`, `RATE_LIMITED`)
- Stack traces hidden in production
- Detailed logs for debugging (Pino with JSON output)
- All app errors extend `AppError` class for consistent handling

## Backend Module Structure (Repeatable Pattern for Phases 2-18)

Every module follows the same layered pattern:

```
modules/{moduleName}/
├── {moduleName}.routes.ts     # Express Router, middleware chain
├── {moduleName}.controller.ts # Parse req, call service, shape response
├── {moduleName}.service.ts    # Business logic, orchestrate repos, emit events
├── {moduleName}.repository.ts # Knex queries, extends BaseRepository
├── {moduleName}.validation.ts # Zod schemas (imported from shared/)
├── {moduleName}.types.ts      # TS interfaces (type-only, could also import from shared/)
├── {moduleName}.events.ts     # Optional: domain events for realtime/other services
└── __tests__/
    ├── {moduleName}.controller.test.ts
    ├── {moduleName}.service.test.ts
    └── {moduleName}.repository.test.ts
```

### Middleware Chain Order (per route)
1. `authenticate` — verify JWT, attach `req.user`
2. `resolveTenant` — resolve org, attach `req.tenant`
3. `ipRestriction` — check against `organizations.allowed_ip_ranges`
4. `requirePermission('code')` — check effective permissions
5. `validate(schema)` — Zod runtime validation
6. `controller.method` — business logic

### BaseRepository Pattern
All repositories extend `BaseRepository<T>`:
- Auto-injects `.where('organization_id', ctx.organizationId)` on all tenant-scoped queries
- Provides `find()`, `findById()`, `create()`, `update()`, `delete()`, `softDelete()` base methods
- Overridable for module-specific query patterns
- No N+1 queries — always use `.select()` with foreign key joins

### Service Layer
- Orchestrates repositories and external services
- Throws typed `AppError` subclasses on failure
- Emits domain events to `eventBus` (which realtime layer subscribes to)
- No direct HTTP concerns — testable without mocking sockets

## Frontend Architecture

### Page/Route Structure
- `app/routes.tsx` — central route manifest with permission metadata
- `features/` — feature-scoped folders (auth, employees, payroll, etc.)
- `layouts/` — LayoutComponents (AuthLayout, AppShellLayout, PublicLayout)
- `components/` — reusable design-system primitives (Button, Input, Modal, etc.)
- `hooks/` — custom hooks (useDebounce, usePermission, useMediaQuery)
- `lib/` — utilities (apiClient, socket, storage)

### State Management
- **Zustand store** (`features/auth/store/authStore.ts`) for user/org/permissions/roles/session state
- **React Query** (TanStack Query) for server state, caching, background refetch
- **localStorage** for non-sensitive settings (theme, sidebar collapse)
- **NO persistent storage of access tokens** (memory only; silent refresh on boot via httpOnly cookie)

### Protected Routes Pattern
```typescript
<ProtectedRoute permission="employee.profile.read" roles={['hr_manager', 'organization_admin']}>
  <EmployeePage />
</ProtectedRoute>
```
Redirects unauthenticated to `/login`, forbidden to `/403`. Validation happens on `authStore.hasPermission()`.

### Form Validation
- Zod schemas imported from `shared/` (no duplication)
- React Hook Form + `zodResolver` for client-side form logic
- Same schema runs on both client (instant feedback) and server (enforcement)

### Theme System
- Tailwind `darkMode: 'class'`
- CSS variable tokens (e.g., `--bg-surface`, `--text-primary`) in `styles/globals.css`
- Light/dark variants toggled via `<html class="dark">` and persisted to localStorage
- Default theme is dark (per spec)

## Real-Time Architecture (Socket.io)

- **Auth**: Handshake verified via JWT in query param or `Authorization` header
- **Rooms**: Clients auto-join `org:{organizationId}` and `user:{userId}` rooms on connect
- **Event Flow**: Services publish to `eventBus` (internal Node EventEmitter) → realtime layer subscribes and translates selected events to socket emits
- **Service-Decoupled**: Services never import `io` directly, keeping them testable without mocking sockets
- **Event Types**: Login (device list update), permission change (UI refresh), user invited (notification), etc.

## Security Architecture

### At-Rest Encryption
- `users.mfa_secret` encrypted with AES-256-GCM
- `sso_identities.access_token_encrypted` / `refresh_token_encrypted` encrypted
- `password_history` stores only hashes, never plain text
- Field encryption abstracted in `common/lib/encryption.ts` for reuse (future PAN/Aadhaar in Phase 4)

### In-Transit Encryption
- HTTPS enforced in production (Nginx/ALB termination)
- Secure cookies: `httpOnly, Secure, SameSite=Lax`
- CORS restricted per environment

### Input Validation
- Zod schemas at the boundary (every controller method)
- Whitelisted sortable/filterable columns in BaseRepository to prevent identifier injection
- No dynamic `ORDER BY` without validation

### Query Safety
- Knex with mysql2 driver — all queries parameterized
- Raw SQL only for future vector similarity (Phase 15) — always with `knex.raw('...?', [param])`

### CSRF
- Bearer token API calls naturally CSRF-immune
- Double-submit CSRF token (`X-CSRF-Token` header + non-httpOnly cookie) for the refresh/logout endpoints that rely on cookies

### Rate Limiting
- `express-rate-limit` with MemoryStore (dev), Redis adapter (production)
- Loose global limit + strict per-endpoint limits (login, OTP, forgot-password)

## Testing Strategy

### Backend (Vitest + Supertest)
- Unit tests for services (repositories mocked)
- Integration tests for auth flow (real DB via test migrations)
- Controllers tested via supertest (HTTP-level tests)
- 80%+ coverage on auth/RBAC modules

### Frontend (Vitest + RTL)
- Component tests with RTL
- MSW for API mocking (auth flow, permission checking)
- Store tests with Zustand
- Form validation tests (Zod + React Hook Form)

### E2E (Playwright - optional, nice-to-have)
- Smoke test: register org → login → enable MFA → logout
- Permission test: user with `employee.profile.read` can view profiles, others 403

## Deployment & Infrastructure

### Local Development
```bash
docker-compose up -d mysql adminer mailhog
npm install
npm run db:migrate
npm run db:seed
npm run dev  # Concurrently boots API + UI
```

### Production Readiness Checklist
- [ ] Environment variables validated at boot (Zod in server/config/env.ts)
- [ ] MySQL backups automated (daily snapshots)
- [ ] Logs centralized (ELK, CloudWatch, Datadog)
- [ ] Monitoring alerts set up (CPU, memory, error rate, p99 latency)
- [ ] HTTPS enforced (Nginx/ALB)
- [ ] Rate limiting tuned for production load
- [ ] Redis deployed for session/permission cache (horizontal scale)
- [ ] Database connection pooling optimized
- [ ] API keys rotated on deploy (GitHub Actions secrets)

### CI/CD (GitHub Actions template)
- Lint on PR (ESLint, TypeScript check)
- Test on PR (Vitest)
- Build on PR (verify no errors)
- Deploy main → staging, tag release → production

## Future Roadmap (Phases 2-18)

Each future module follows the exact architecture pattern established in Phase 1:

1. **Phase 2: Employee Management** — Core employee data, departments, designations, documents
2. **Phase 3: Recruitment ATS** — Job openings, candidate pipeline, interviews
3. **Phase 4: Attendance** — Check-in, roster, biometric/GPS, heatmaps
4. **Phase 5: Leave** — Policies, workflows, approvals, encashment
5. **Phase 6: Payroll** — Salary structures, runs, TDS, PF, ESI, gratuity
6. **Phase 7: Performance** — OKRs, 360 reviews, goals, feedback cycles
7. **Phase 8: LMS** — Courses, progress, quizzes, certifications
8. **Phase 9: Projects** — Tasks, milestones, timesheets, billable hours
9. **Phase 10: Expenses** — Claims, travel, approval workflow
10. **Phase 11: Assets** — Allocation, return, maintenance, QR tracking
11. **Phase 12: Help Desk** — Tickets, SLA, knowledge base
12. **Phase 13: Analytics** — Dashboards, headcount, attrition, insights
13. **Phase 14: AI Copilot** — RAG + OpenAI, policy Q&A, leave queries
14. **Phase 15: Client Portal** — Org-gated view of teams, projects, invoices
15. **Phase 16: Mobile API** — React Native-ready endpoints

## Glossary

- **Tenant**: An organization that uses the platform (one org = one subscription)
- **Organization** (`organizations` table): The DB representation of a tenant
- **Organization Admin**: The highest-privilege role within an org (not platform super admin)
- **Super Admin**: Platform-level role (single instance, `organization_id = NULL`)
- **RBAC**: Role-Based Access Control (who can do what based on their assigned roles)
- **JWT**: JSON Web Token (stateless auth, no session server state needed)
- **OTP**: One-Time Password (6-digit code via email/SMS)
- **MFA**: Multi-Factor Authentication (TOTP or backup codes)
- **SSO**: Single Sign-On (OAuth2 via Google/Microsoft)
- **Device**: A browser/mobile/API client identified by a unique device_id
- **Session**: A refresh token + auth_sessions row (one per login)
- **Audit Log**: Immutable record of who did what, when, and with what changes

## Contact & Support

For questions on architecture:
- Review the specific ADRs in `docs/adr/`
- Check the API spec in `docs/api/openapi.yaml`
- See the module template in `docs/architecture/09-module-template.md` for Phase 2+ patterns

For implementation details, see the respective module's code.
