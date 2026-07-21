# Server Implementation Guide

This document provides the complete blueprint for implementing the Express.js backend. Due to the complexity and size of the codebase, this serves as the definitive guide for code generation.

## File Structure

```
server/
├── src/
│   ├── app.ts                 # Express app setup (helmet, cors, parsers, routes)
│   ├── server.ts              # HTTP server + socket.io bootstrap
│   ├── config/
│   │   ├── env.ts             # Zod-validated environment variables
│   │   └── constants.ts       # Application constants
│   ├── db/
│   │   ├── knex.ts            # Knex connection singleton
│   │   ├── BaseRepository.ts   # Tenant-scoping base class
│   │   └── types.ts           # Database type definitions
│   ├── common/
│   │   ├── middleware/
│   │   │   ├── authenticate.ts
│   │   │   ├── resolveTenant.ts
│   │   │   ├── ipRestriction.ts
│   │   │   ├── requirePermission.ts
│   │   │   ├── validate.ts
│   │   │   ├── rateLimiter.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── requestLogger.ts
│   │   │   └── notFound.ts
│   │   ├── errors/
│   │   │   ├── AppError.ts
│   │   │   ├── ValidationError.ts
│   │   │   ├── UnauthorizedError.ts
│   │   │   ├── ForbiddenError.ts
│   │   │   ├── NotFoundError.ts
│   │   │   └── ConflictError.ts
│   │   ├── lib/
│   │   │   ├── logger.ts
│   │   │   ├── cache.ts
│   │   │   ├── jwt.ts
│   │   │   ├── encryption.ts
│   │   │   ├── mailer.ts
│   │   │   ├── sms.ts
│   │   │   ├── storage.ts (S3/local abstraction)
│   │   │   └── geoip.ts
│   │   └── utils/
│   │       └── validators.ts
│   ├── realtime/
│   │   ├── socket.ts          # Socket.io setup
│   │   └── eventBus.ts        # Internal event emitter
│   ├── modules/
│   │   ├── index.ts           # Aggregates all module routers
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── session.repository.ts
│   │   │   ├── user.repository.ts
│   │   │   ├── auth.validation.ts
│   │   │   ├── auth.types.ts
│   │   │   ├── strategies/
│   │   │   │   ├── google.strategy.ts
│   │   │   │   └── microsoft.strategy.ts
│   │   │   ├── mfa.service.ts
│   │   │   ├── otp.service.ts
│   │   │   ├── password-policy.service.ts
│   │   │   ├── session.service.ts
│   │   │   └── __tests__/ (test files)
│   │   ├── rbac/
│   │   │   ├── rbac.routes.ts
│   │   │   ├── rbac.controller.ts
│   │   │   ├── rbac.service.ts
│   │   │   ├── role.repository.ts
│   │   │   ├── permission.repository.ts
│   │   │   ├── rbac.validation.ts
│   │   │   └── __tests__/
│   │   ├── users/
│   │   │   ├── users.routes.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── users.validation.ts
│   │   │   └── __tests__/
│   │   ├── organizations/
│   │   │   ├── organizations.routes.ts
│   │   │   ├── organizations.controller.ts
│   │   │   ├── organizations.service.ts
│   │   │   ├── organizations.repository.ts
│   │   │   └── __tests__/
│   │   ├── audit/
│   │   │   ├── audit.service.ts
│   │   │   ├── audit.repository.ts
│   │   │   └── __tests__/
│   │   └── employees/ (stub for Phase 2)
│   │       ├── employees.routes.ts
│   │       ├── employees.controller.ts
│   │       ├── employees.service.ts
│   │       ├── employees.repository.ts
│   │       └── __tests__/
│   └── routes/
│       └── v1.ts              # Main API route aggregator
├── tsconfig.json
└── .env.example
```

## Implementation Priority

Given token constraints, implement in this order:

### Critical (Required for Phase 1)
1. **config/env.ts** — Zod validation of environment, fail-fast startup
2. **common/errors/** — Error class hierarchy
3. **db/knex.ts** — Database connection and camelCase↔snake_case hooks
4. **db/BaseRepository.ts** — Tenant-scoping base class (THE most important)
5. **common/middleware/authenticate.ts** — JWT verification
6. **common/middleware/resolveTenant.ts** — Tenant context resolution
7. **common/lib/jwt.ts** — JWT generation/verification (RS256)
8. **common/lib/encryption.ts** — AES-256-GCM for sensitive fields
9. **auth/auth.service.ts** — Core auth orchestration
10. **auth/auth.controller.ts** & **auth/auth.routes.ts** — Auth endpoints
11. **rbac/rbac.service.ts** — Permission checking
12. **common/middleware/requirePermission.ts** — Permission gating
13. **app.ts & server.ts** — Express app + Socket.io bootstrap

### Important (Complete Phase 1)
14. **auth/mfa.service.ts** — TOTP/MFA logic
15. **auth/otp.service.ts** — OTP generation/verification
16. **auth/password-policy.service.ts** — Password policy enforcement
17. **auth/strategies/** — Google & Microsoft OAuth
18. **common/middleware/ipRestriction.ts**, **rateLimiter.ts**, **errorHandler.ts**, **validate.ts**
19. **modules/users/** — User CRUD
20. **modules/organizations/** — Org management
21. **modules/audit/** — Audit logging
22. **common/lib/** (mailer, sms, storage, logger) — Utilities

### Nice-to-Have (Polish)
23. **realtime/socket.ts** — Socket.io real-time events
24. **Tests** — Vitest + supertest integration/unit tests

## Key Architectural Decisions

### 1. BaseRepository Tenant Scoping
This is THE critical design. Every repository extends BaseRepository and gets tenant-scoping "for free":

```typescript
// Pattern used everywhere
class UserRepository extends BaseRepository<User> {
  constructor(private db: Knex) {
    super(db, 'users');
  }

  async findByEmail(email: string, ctx: TenantContext): Promise<User | undefined> {
    // This query automatically has .where('organization_id', ctx.organizationId) injected
    return this.db('users')
      .where('email', email)
      .andWhere('organization_id', ctx.organizationId)
      .first();
  }
}
```

### 2. Middleware Chain Order
EVERY route must have this exact order (no exceptions):
```
authenticate → resolveTenant → ipRestriction → requirePermission → validate → controller
```

This ensures:
- User is verified before tenant resolution
- Tenant context exists for all downstream middleware
- IP checks happen early (cheap)
- Permission checks happen after validation (avoids checking permissions on invalid input)

### 3. Error Handling
All errors flow through a consistent hierarchy:
- `AppError` (base)
  - `ValidationError` (status 400)
  - `UnauthorizedError` (status 401)
  - `ForbiddenError` (status 403)
  - `NotFoundError` (status 404)
  - `ConflictError` (status 409)

The error handler middleware catches all of these and formats them into the standard API envelope.

### 4. JWT Claims Minimalism
The access token should be small and cacheable. Keep only what's absolutely needed:
```typescript
{
  sub: user.uuid,           // Subject (user ID)
  oid: organization.uuid,   // Organization ID (org claim)
  sid: session.uuid,        // Session ID (for session revocation)
  iat: issuedAt,
  exp: expiresAt            // 15 minutes from now
}
```

Permission checks are ALWAYS a live DB lookup, NOT embedded in the JWT.

### 5. Async/Await Error Handling
Wrap all route handlers in `asyncHandler` or use try/catch → throw AppError:

```typescript
// BAD (unhandled promise rejection)
router.post('/login', (req, res) => {
  authService.login(req.body); // If this rejects, it crashes the server
});

// GOOD
router.post('/login', asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ success: true, data: result });
}));
```

### 6. Service → Repository → Query Builder Flow
Services should never write SQL directly. Everything goes through repositories:

```typescript
// auth.service.ts (does NOT touch db)
async login(email: string, password: string, ctx: TenantContext): Promise<{ accessToken, refreshToken }> {
  const user = await this.userRepo.findByEmail(email, ctx);
  if (!user) throw new UnauthorizedError('Invalid credentials');
  
  const valid = await this.verifyPassword(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');
  
  const session = await this.sessionRepo.create({ userId: user.id, ... }, ctx);
  const tokens = await this.jwtService.sign({ sub: user.uuid, sid: session.uuid });
  
  this.eventBus.emit('user.logged_in', { userId: user.id });
  return tokens;
}
```

### 7. Zod Validation Reuse
Schemas in `shared/src/validation/` are imported and used identically on client and server:

**Client:**
```typescript
import { loginSchema } from '@apponexthrms/shared';
const { register, handleSubmit } = useForm({
  resolver: zodResolver(loginSchema),
});
```

**Server:**
```typescript
import { loginSchema } from '@apponexthrms/shared';
const validateInput = validate(loginSchema);
router.post('/login', validateInput, authController.login);
```

This ensures no discrepancy between client validation (UX) and server enforcement.

### 8. Permission Cache & Invalidation
Permission lookups must be fast but must reflect changes instantly:

```typescript
// In-memory LRU cache (NodeCache or simple Map)
const permissionCache = new Map<string, string[]>(); // key: `perm:{userId}`, value: permission codes

async function getEffectivePermissions(userId: number): Promise<string[]> {
  const cacheKey = `perm:${userId}`;
  const cached = permissionCache.get(cacheKey);
  if (cached) return cached;

  // Live DB lookup if not cached
  const perms = await rbacService.computePermissions(userId);
  permissionCache.set(cacheKey, perms);
  setTimeout(() => permissionCache.delete(cacheKey), 60_000); // 60s TTL
  return perms;
}

// On any role/permission mutation, invalidate cache:
async function updateRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
  await this.rolePermissionRepo.updateByRole(roleId, permissionIds);
  
  // Invalidate cache for all users with this role
  const usersWithRole = await knex('user_roles').where('role_id', roleId).pluck('user_id');
  usersWithRole.forEach(uid => permissionCache.delete(`perm:${uid}`));
  
  this.eventBus.emit('permissions.changed', { userIds: usersWithRole });
}
```

## Testing Strategy

### Unit Tests (Vitest)
- Services: Mock repositories, test business logic
- Repositories: Mock Knex (or use real test DB)
- Errors: Test that exceptions serialize correctly

### Integration Tests (Vitest + Supertest)
- Auth flow: Full register → login → enable MFA → refresh → logout
- RBAC: Verify permission checks work as expected
- Middleware: Ensure error handler catches and formats errors

### Test Database
Use a separate `apponexthrms_test` database:
```typescript
// In test setup (vitest.config.ts)
export default defineConfig({
  test: {
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});

// src/__tests__/setup.ts
beforeAll(async () => {
  const knex = require('../db/knex').default;
  await knex.migrate.latest(); // Runs migrations on test DB
  await knex.seed.run(); // Seeds demo data
});

afterEach(async () => {
  await knex.truncate(['users', 'roles', ...]); // Clean state for next test
});
```

## Environment Configuration

**server/.env.example** (already created) should list all variables. At startup:

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  SERVER_PORT: z.coerce.number().int().positive(),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().int(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  JWT_PRIVATE_KEY_PATH: z.string(),
  JWT_PUBLIC_KEY_PATH: z.string(),
  // ... more variables
});

const parsed = envSchema.parse(process.env);
export const config = parsed;

// Fail-fast at import time (no lazy validation)
```

## Security Checklist

Before deploying:

- [ ] All passwords hashed with Argon2id
- [ ] All sensitive fields encrypted at rest (JWT secrets, SSO tokens, MFA seeds)
- [ ] All queries parameterized (no string concatenation)
- [ ] Rate limiting on auth endpoints
- [ ] CORS restricted to allowed origins
- [ ] Helmet security headers enabled
- [ ] HTTPS enforced in production
- [ ] Cookies are httpOnly, Secure, SameSite=Lax
- [ ] No sensitive data in logs
- [ ] JWT exp & iat validated on every verification
- [ ] Refresh token rotation implemented (old token invalidated after use)
- [ ] IP restriction enforced per org
- [ ] MFA recovery codes single-use
- [ ] OTP codes expire after 10 minutes
- [ ] Password history prevents reuse
- [ ] Account lockout after max failed attempts
- [ ] Audit logs capture all sensitive actions

## Next Steps

1. Create the files in the order listed under "Implementation Priority"
2. For each file, follow the patterns documented here
3. Write tests as you go (not after)
4. Use the shared Zod schemas — never duplicate validation logic
5. Always extend BaseRepository for tenant scoping
6. Always throw AppError subclasses for consistency
7. Run migrations before starting dev server: `npm run db:migrate`

If you hit any ambiguity, refer back to this guide or the main ARCHITECTURE.md.
