# Settings Module - Phase 2

Complete organizational settings management for ApponextHRMS. Handles 15 different setting categories with full CRUD, audit logging, soft deletes, and multi-tenancy support.

## Quick Start

### 1. Database
```bash
npm run migrate -- --latest
npm run seed:specific -- database/seeds/settings_permissions.ts
```

### 2. Server
In `server/src/server.ts`:
```typescript
import settingsRoutes from './modules/settings/settings.routes.js';
app.use('/api/v1/settings', settingsRoutes);
```

### 3. Test
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/settings/company-profile
```

## Architecture

### Repositories (Data Access)
Each repository extends `BaseRepository<T>`:
- Automatic org scoping
- Soft delete support
- Built-in pagination and search
- Custom query methods

**Example:** `BranchRepository.getByCode(ctx, code)` — Organization-specific lookup

### Services (Business Logic)
Orchestrate repos + audit logging:
- Validation and error handling
- Audit trail on every mutation
- Domain logic (e.g., prevent circular department hierarchy)

**Pattern:**
```typescript
async createBranch(ctx: TenantContext, data: BranchCreate) {
  // 1. Validate
  // 2. Create via repo
  // 3. Log audit event
  // 4. Return result
}
```

### Controllers (HTTP Handlers)
Thin controllers that parse requests:
- Parse query params, body, params
- Call service methods
- Return `{ success, data, meta }` response

**Pattern:** No error handling needed — global middleware catches all

### Routes (API Surface)
RESTful routes with permission checks:
- `GET /branches` — requirePermission('settings.branches.read')
- `POST /branches` — requirePermission('settings.branches.write') + validate body
- `PATCH /branches/:id` — same permission + validation
- `DELETE /branches/:id` — write permission
- `POST /branches/:id/restore` — write permission (soft delete only)

## The 15 Modules

| Module | Purpose | Key Fields |
|--------|---------|-----------|
| **Company Profile** | Org legal info, compliance | GST, PAN, CIN, logo |
| **Branches** | Regional offices | code, address, head_id |
| **Locations** | Work locations | type (office/work), geofence, timezone |
| **Departments** | Org structure | code, parent_id, head_id (hierarchy) |
| **Designations** | Job roles | code, level, department_id |
| **Cost Centers** | Budget allocation | code, budget_amount, parent_id |
| **Holiday Calendars** | Vacation schedules | year, is_default |
| **Holidays** | Specific dates | holiday_date, holiday_type, is_optional |
| **Attendance Policies** | Work hours | working_hours, grace_period, overtime |
| **Leave Policies** | Leave config container | code, is_default |
| **Leave Types** | Specific leave (PTO, sick, etc) | quota, carry_forward, encashment |
| **Payroll Policies** | Salary rules | salary_structure, deductions, compliance |
| **Work Policies** | Office/hybrid/remote | policy_type, effective_dates |
| **Branding** | Theme and colors | primary_color, secondary_color, logo |
| **Email Templates** | Transactional emails | subject, body_html, placeholders |

**Plus:**
- **Organization Settings** — Key-value store for general settings
- **Setting Versions** — Immutable audit trail of all changes

## Usage Examples

### Create a Branch
```typescript
const service = new BranchService();
const branch = await service.createBranch(ctx, {
  name: 'New York',
  code: 'NYC_BR',
  city: 'New York',
  status: 'active',
});
```

### List with Pagination
```typescript
const result = await service.listBranches(ctx, {
  page: 1,
  pageSize: 20,
  search: 'new',
  sortBy: 'created_at',
  sortOrder: 'desc',
  filters: { status: 'active' },
});
// Returns: { items: [...], meta: { page, pageSize, total, hasMore, totalPages } }
```

### Update
```typescript
const updated = await service.updateBranch(ctx, 1, {
  city: 'New York City',
  status: 'active',
});
```

### Soft Delete & Restore
```typescript
// Soft delete (sets deleted_at)
await service.deleteBranch(ctx, 1);

// Restore (clears deleted_at)
await service.restoreBranch(ctx, 1);
```

### Get Audit Trail
```typescript
const auditService = new AuditService();
const history = await auditService.getEntityHistory(ctx, 'BRANCH', 1);
// Returns: [{ action: 'CREATE', beforeState, afterState, createdAt, userId }]
```

## Validation

All inputs validated against Zod schemas:

```typescript
// Define once
const branchCreateSchema = z.object({
  name: z.string().min(1).max(150),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  // ...
});

// Use in route middleware
router.post('/branches', 
  validate({ body: branchCreateSchema }),
  asyncHandler((req, res) => controller.create(req, res))
);

// Also use in React Hook Form frontend
const form = useForm({ resolver: zodResolver(branchCreateSchema) });
```

## Permissions

30 permission codes total (2 per module):

```
settings.company_profile.read / .write
settings.branches.read / .write
settings.locations.read / .write
settings.departments.read / .write
settings.designations.read / .write
settings.cost_centers.read / .write
settings.holiday_calendars.read / .write
settings.attendance_policies.read / .write
settings.leave_policies.read / .write
settings.payroll_policies.read / .write
settings.work_policies.read / .write
settings.branding.read / .write
settings.email_templates.read / .write
settings.organization_settings.read / .write
settings.history.read / .write
```

**Assignment:**
- `organization_admin` — all 30
- `hr_manager` — all read + selective write (branches, departments, designations, holidays, attendance, leave, payroll policies)
- Others — none by default

## Error Handling

All errors throw `AppError` subclasses. Global middleware converts to standard response:

```typescript
throw new ConflictError(`Branch code '${code}' already exists`);
// → { success: false, error: { code: 'CONFLICT_ERROR', message: '...' } }

throw new NotFoundError('Branch not found');
// → { success: false, error: { code: 'NOT_FOUND_ERROR', message: '...' } }

throw new ValidationError('Invalid parent department');
// → { success: false, error: { code: 'VALIDATION_ERROR', message: '...' } }
```

## Multi-Tenancy

**Automatic at every layer:**
1. **Repository:** `query(ctx)` scopes to `ctx.organizationId`
2. **Service:** Passes ctx to repo methods
3. **Controller:** Gets ctx from middleware (`req.ctx`)
4. **Middleware:** Resolves tenant from JWT

**Result:** Impossible to access data from other organizations

## Soft Deletes

**Mechanism:**
- When deleted: Set `deleted_at = NOW()`
- When listed: `WHERE deleted_at IS NULL` (automatic)
- When restored: Set `deleted_at = NULL`

**Benefits:**
- Fast deletion (update not delete)
- Data recovery possible
- Audit trail preserved
- Foreign key integrity maintained

## Adding a New Module

### 1. Create Migration
```typescript
// database/migrations/20260713000018_create_new_table.ts
export async function up(knex: Knex) {
  await knex.schema.createTable('new_entities', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').unique();
    table.bigInteger('organization_id');
    table.string('code', 50);
    table.bigInteger('created_by');
    table.bigInteger('updated_by');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.softDeletes('deleted_at');
    
    table.foreign('organization_id').references('id').on('organizations');
    table.unique(['organization_id', 'code']);
  });
}
```

### 2. Create Repository
```typescript
// repositories/NewEntityRepository.ts
import { BaseRepository } from '../../../db/BaseRepository.js';

export interface NewEntity { ... }

export class NewEntityRepository extends BaseRepository<NewEntity> {
  constructor() { super('new_entities'); }
  // Add custom queries as needed
}
```

### 3. Create Service (or use Generic)
```typescript
// Option A: Generic service for simple CRUD
const service = new GenericSettingsService(
  new NewEntityRepository(),
  'NEW_ENTITY',
  'code'
);

// Option B: Specialized service for complex logic
export class NewEntityService {
  // Full control over business logic
}
```

### 4. Add Validation Schema
```typescript
// shared/src/validation/settings.schemas.ts
export const newEntityCreateSchema = z.object({
  name: z.string().min(1).max(150),
  code: z.string().min(1).max(50),
  // ...
});
```

### 5. Register Routes
```typescript
// settings.routes.ts
import { GenericSettingsController } from './controllers/GenericSettingsController.js';

const controller = new GenericSettingsController(
  new NewEntityService(),
  'new_entity'
);

router.get('/new-entities', 
  requirePermission('settings.new_entity.read'),
  asyncHandler((req, res) => controller.list(req, res))
);
// ... POST, PATCH, DELETE, restore routes
```

### 6. Seed Permissions
```sql
INSERT INTO permissions (code, module, resource, action) VALUES
('settings.new_entity.read', 'settings', 'new_entity', 'read'),
('settings.new_entity.write', 'settings', 'new_entity', 'write');
```

## Testing

### Unit Test Example
```typescript
describe('BranchRepository', () => {
  it('should return branch by code within org', async () => {
    const repo = new BranchRepository();
    const branch = await repo.getByCode(ctx, 'NYC_BR');
    expect(branch?.code).toBe('NYC_BR');
  });
});
```

### Integration Test Example
```typescript
describe('POST /branches', () => {
  it('should create branch and log audit', async () => {
    const response = await request(app)
      .post('/api/v1/settings/branches')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'NYC', code: 'NYC_BR' });
    
    expect(response.status).toBe(201);
    expect(response.body.data.code).toBe('NYC_BR');
    
    // Verify audit log
    const audit = await auditLog.getForEntity(ctx, 'BRANCH', response.body.data.id);
    expect(audit[0].action).toBe('CREATE');
  });
});
```

## Performance

### Indexes
- `(organization_id, code)` — unique lookups
- `organization_id` — scope filtering
- `status`, `created_at` — common filters and sorts
- Foreign keys — relationship joins

### Pagination
- Default 20 items/page
- Max recommended 100
- Metadata includes `hasMore` for efficient infinite scroll

### Audit Table
- Append-only (no updates/deletes)
- Time-based indexing for range queries
- Consider archiving old records periodically

## Troubleshooting

### "Code already exists"
- Code must be unique within organization
- Check: `SELECT COUNT(*) FROM branches WHERE code='X' AND organization_id=Y;`

### "Permission denied"
- Verify user role has permission
- Check: `SELECT r.code FROM roles r JOIN user_roles ur ON r.id=ur.role_id WHERE ur.user_id=X AND ur.organization_id=Y;`

### "Parent not found"
- Foreign key reference must exist
- Check: `SELECT * FROM departments WHERE id=X AND organization_id=Y AND deleted_at IS NULL;`

### "Audit log missing"
- Verify auditService.log() called in service
- Check: `SELECT * FROM audit_logs WHERE entity_type='BRANCH' ORDER BY created_at DESC LIMIT 5;`

## References

- **Shared Schemas:** `shared/src/validation/settings.schemas.ts`
- **Base Class:** `server/src/db/BaseRepository.ts`
- **Error Classes:** `server/src/common/errors/`
- **Middleware:** `server/src/common/middleware/`
- **Audit Service:** `server/src/modules/audit/audit.service.ts`
- **RBAC Service:** `server/src/modules/rbac/rbac.service.ts`

---

**Built:** 2026-07-13  
**Status:** Production-Ready  
**Coverage:** 15 modules, 17 tables, 30 permissions  
**Dependencies:** BaseRepository, AuditService, Zod validation, Express middleware
