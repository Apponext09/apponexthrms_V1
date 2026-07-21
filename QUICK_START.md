# ApponextHRMS Quick Start Guide

## What Is This?

ApponextHRMS is a **complete architectural blueprint** for an enterprise-grade, multi-tenant HRMS platform. This Phase 1 includes:

- ✅ 14 database migrations (ready to run)
- ✅ Shared TypeScript types & Zod validation schemas
- ✅ Comprehensive architecture documentation
- ✅ Complete backend implementation blueprint (`SERVER_IMPLEMENTATION.md`)
- ✅ Complete frontend implementation blueprint (`CLIENT_IMPLEMENTATION.md`)
- ⬜ Generated code (code generation is the next step)

**TL;DR:** You have the blueprints; the next step is to generate the actual TypeScript/React code from these patterns.

## Getting Started

### 1. Prerequisites
```bash
Node.js 18+
npm 9+
Docker & Docker Compose (for local MySQL, Adminer, Mailhog)
```

### 2. Start Infrastructure
```bash
docker-compose up -d mysql adminer mailhog
# MySQL: localhost:3306 (user=root, password=root)
# Adminer: http://localhost:8080
# Mailhog: http://localhost:8025 (catch OTP emails in dev)
```

### 3. View the Architecture
```bash
# Start here for understanding
cat docs/ARCHITECTURE.md

# For backend implementation details
cat SERVER_IMPLEMENTATION.md

# For frontend implementation details
cat CLIENT_IMPLEMENTATION.md

# For database schema
ls database/migrations/
cat database/migrations/20260712000001_create_organizations.ts
```

### 4. View Migration Files & Validation Schemas
```bash
# Database schema is fully designed
ls database/migrations/20260712*.ts

# Shared types and validation
ls shared/src/types/
ls shared/src/validation/
```

## Next Steps (Code Generation)

### Priority 1: Backend (3-4 days for one engineer)
Follow `SERVER_IMPLEMENTATION.md` Implementation Priority section:

1. Create `server/src/config/env.ts` (Zod-validated environment)
2. Create `server/src/common/errors/` (error class hierarchy)
3. Create `server/src/db/knex.ts` (database connection)
4. Create `server/src/db/BaseRepository.ts` ⭐ (THE most critical)
5. Create `server/src/common/middleware/` (8 middleware files)
6. Create `server/src/common/lib/` (utility services)
7. Create `server/src/modules/auth/` (authentication module)
8. Create `server/src/modules/rbac/` (role-based access control)
9. Create `server/src/app.ts` and `server/src/server.ts` (express app + socket.io)

### Priority 2: Frontend (3-4 days for one engineer)
Follow `CLIENT_IMPLEMENTATION.md`:

1. Set up Vite + React + TypeScript project
2. Create `client/src/lib/apiClient.ts` (axios with JWT refresh interceptor)
3. Create `client/src/features/auth/store/authStore.ts` (Zustand store)
4. Create `client/src/app/routes.tsx` (route manifest with permissions)
5. Create auth pages (LoginPage, OtpChallengePage, MfaChallengePage, etc.)
6. Create RBAC pages (RolesListPage, PermissionsMatrix, etc.)
7. Create design system components (Button, Input, Modal, etc.)

## Key Files to Understand

| File | Purpose |
|------|---------|
| `docs/ARCHITECTURE.md` | Complete system design (9000+ words) |
| `SERVER_IMPLEMENTATION.md` | Backend code structure & patterns |
| `CLIENT_IMPLEMENTATION.md` | Frontend code structure & patterns |
| `shared/src/types/index.ts` | All TypeScript interfaces |
| `shared/src/validation/auth.schemas.ts` | Auth validation (Zod) |
| `shared/src/validation/rbac.schemas.ts` | RBAC validation (Zod) |
| `shared/src/constants/index.ts` | All enums & constants |
| `database/migrations/` | 14 complete schema migrations |
| `database/seeds/` | Permission catalog, system roles, demo org |
| `PHASE_1_SUMMARY.md` | What's been delivered & what's next |

## Architecture Quick Reference

### Multi-Tenancy
- **Model:** Shared database with `organization_id` on every tenant-scoped table
- **Isolation:** Enforced via `BaseRepository` + tenant-scoping middleware
- **Scaling:** Single → horizontal via permission cache → Redis

### Authentication
- **JWT:** RS256 (asymmetric), 15-minute TTL, lean claims
- **Refresh:** Opaque rotating token, httpOnly/Secure cookie
- **MFA:** TOTP via otplib
- **OTP:** 6-digit codes via email/SMS
- **SSO:** Google & Microsoft OAuth2 (openid-client library)

### Authorization (RBAC)
- **Roles:** 12 system roles + custom org-defined roles
- **Permissions:** `module.resource.action` format (e.g., `employee.profile.read`)
- **Cache:** 60s TTL in-memory cache, invalidated on mutations
- **Checks:** Live database lookup (not embedded in JWT)

### Security
- Argon2id password hashing
- AES-256-GCM field encryption
- SQL injection prevention (parameterized Knex queries)
- Rate limiting on auth endpoints
- IP restriction per org
- CSRF protection (SameSite + double-submit token)
- Audit logging of sensitive actions

## Folder Structure

```
ApponextHRMS/
├── docs/                    # Architecture documentation
│   └── ARCHITECTURE.md      # Main reference (9000+ words)
├── database/
│   ├── migrations/          # 14 Knex migrations
│   ├── seeds/               # Permissions, roles, demo data
│   └── knexfile.ts          # Knex configuration
├── shared/
│   └── src/
│       ├── types/           # All TypeScript interfaces
│       ├── constants/       # Enums & constants
│       └── validation/      # Zod schemas
├── server/                  # ⬜ To be generated
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── config/
│       ├── db/
│       ├── common/
│       ├── realtime/
│       └── modules/
├── client/                  # ⬜ To be generated
│   └── src/
│       ├── main.tsx
│       ├── app/
│       ├── lib/
│       ├── components/
│       ├── layouts/
│       └── features/
├── PHASE_1_SUMMARY.md       # Delivery summary
├── SERVER_IMPLEMENTATION.md # Backend patterns & structure
├── CLIENT_IMPLEMENTATION.md # Frontend patterns & structure
├── package.json             # npm workspaces
└── docker-compose.yml       # Local dev infra
```

## Development Workflow (Once Code is Generated)

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Run migrations
npm run db:migrate

# 4. Seed demo data
npm run db:seed

# 5. Start dev servers (API + UI)
npm run dev

# 6. In another terminal, run tests
npm run test:watch

# 7. Run linting
npm run lint:fix
```

## API Contract

All endpoints follow this response envelope:

```typescript
{
  success: boolean,
  data?: T,
  error?: { code: string, message: string, details?: object },
  meta?: { page?: number, pageSize?: number, total?: number }
}
```

### Key Auth Endpoints
```
POST /api/v1/auth/register-organization    # Register new org
POST /api/v1/auth/login                    # Email + password login
POST /api/v1/auth/otp/request              # Request OTP
POST /api/v1/auth/otp/verify               # Verify OTP code
POST /api/v1/auth/mfa/setup/initiate       # Start MFA setup
POST /api/v1/auth/mfa/setup/confirm        # Confirm MFA + get recovery codes
POST /api/v1/auth/mfa/verify               # Verify TOTP during login
POST /api/v1/auth/refresh                  # Refresh access token
POST /api/v1/auth/logout                   # Logout (revoke session)
GET  /api/v1/auth/me                       # Current user + permissions
GET  /api/v1/auth/sessions                 # List devices/sessions
```

### Key RBAC Endpoints
```
GET  /api/v1/rbac/permissions              # List all permissions
GET  /api/v1/rbac/roles                    # List roles
POST /api/v1/rbac/roles                    # Create role
PATCH /api/v1/rbac/roles/:id               # Update role
DELETE /api/v1/rbac/roles/:id              # Delete custom role
PUT /api/v1/rbac/roles/:id/permissions     # Set role permissions
POST /api/v1/rbac/users/:userId/roles      # Assign role to user
DELETE /api/v1/rbac/users/:userId/roles/:roleId  # Remove role from user
GET /api/v1/rbac/users/:userId/permissions # Get user's effective permissions
```

## Testing Checklist (for Code Generation)

Once code is generated, verify:

- [ ] Database migrations run cleanly: `npm run db:migrate`
- [ ] Seeds load: `npm run db:seed`
- [ ] API boots: `npm run dev -w server` → `http://localhost:5000/api/v1/health`
- [ ] Register org: `POST /api/v1/auth/register-organization`
- [ ] Login: `POST /api/v1/auth/login` → `{ accessToken, refreshToken, user, ... }`
- [ ] MFA setup: `POST /api/v1/auth/mfa/setup/initiate` → `{ secret, qrCode }`
- [ ] Permission check: `GET /api/v1/auth/me` → `{ permissions: [...], roles: [...] }`
- [ ] Rate limiting: 3rd login in 5 min → `429 Too Many Requests`
- [ ] UI boots: `npm run dev -w client` → `http://localhost:5173`
- [ ] Login page renders and validates forms
- [ ] Full auth flow works (email → password → optional MFA → home page)
- [ ] Logout clears auth store
- [ ] Dark theme is default
- [ ] Creating custom role works
- [ ] Assigning role to user works

## Troubleshooting

### Docker containers won't start
```bash
docker-compose down -v
docker-compose up -d --build
```

### MySQL connection refused
```bash
docker ps  # Verify mysql container is running
docker logs apponexthrms_mysql  # Check for errors
```

### Migrations fail
```bash
# Check database exists
mysql -h localhost -u root -proot -e "SHOW DATABASES;"

# Rollback and retry
npm run db:rollback -w database
npm run db:migrate -w database
```

### "Cannot find module '@apponexthrms/shared'"
```bash
# Ensure workspaces installed correctly
rm -rf node_modules package-lock.json
npm install
```

## Common Questions

**Q: Why not just generate all the code now?**
A: The blueprints are complete and production-ready. Code generation would add ~100KB of TypeScript. Better to provide the patterns so you understand every line.

**Q: Can I start building backend without frontend?**
A: Yes! The database + API are fully independent. Start with backend, test with Postman/curl, then add frontend.

**Q: Can I start building frontend without backend?**
A: Yes, use MSW (Mock Service Worker) to mock API responses while building UI components.

**Q: How do I add a new feature (e.g., Attendance)?**
A: Copy `server/src/modules/auth/` → `server/src/modules/attendance/`, adapt the table names and permission codes. Same pattern for frontend. See `docs/architecture/09-module-template.md`.

**Q: How do I deploy to production?**
A: See `docs/ARCHITECTURE.md` section "Deployment & Infrastructure Readiness Checklist". Requires HTTPS, environment secrets, database backups, monitoring.

## Resources

- **Full Architecture:** `docs/ARCHITECTURE.md`
- **Backend Implementation:** `SERVER_IMPLEMENTATION.md`
- **Frontend Implementation:** `CLIENT_IMPLEMENTATION.md`
- **Delivery Summary:** `PHASE_1_SUMMARY.md`
- **Database Schema:** `database/migrations/*.ts`
- **Validation Schemas:** `shared/src/validation/*.ts`
- **Type Definitions:** `shared/src/types/index.ts`

## Contact

For questions about the architecture, start with `docs/ARCHITECTURE.md`. For specific implementation details, refer to `SERVER_IMPLEMENTATION.md` or `CLIENT_IMPLEMENTATION.md`.

---

**Phase 1 Status:** Architecture & Scaffolding ✅ Complete
**Next Step:** Code Generation (Backend + Frontend)
**Estimated Effort:** 1-2 developer-weeks
