# Phase 2 Settings Engine - Integration Checklist

## Pre-Integration Verification

### Verify Existing Phase 1 Files (DO NOT MODIFY)
- [ ] `server/src/db/BaseRepository.ts` — exists and unchanged
- [ ] `server/src/modules/auth/` — all auth files present
- [ ] `server/src/common/middleware/` — authenticate, resolveTenant, requirePermission middleware exist
- [ ] `server/src/common/errors/` — AppError subclasses (UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError)
- [ ] `server/src/modules/audit/audit.service.ts` — AuditService exists
- [ ] Database exists and Phase 1 migrations have run

## Database Integration

### Run Migrations
```bash
cd database
npm run migrate -- --latest
```

**Files executed:**
- 17 migration files (20260713000001 through 20260713000017)
- Creates tables: organization_profiles, branches, locations, departments, designations, cost_centers, holiday_calendars, holidays, attendance_policies, leave_policies, leave_types, payroll_policies, work_policies, branding_settings, email_templates, organization_settings, setting_versions

**Verify:**
- [ ] Check MySQL: `SHOW TABLES;` — all 17 new tables present
- [ ] Check indexes: `SHOW INDEXES FROM branches;` — org_id, code, status indexes exist
- [ ] Check ForeignKeys: `SHOW CREATE TABLE branches;` — foreign key constraints shown

### Seed Permissions
```bash
npm run seed:specific -- database/seeds/settings_permissions.ts
```

**Verify:**
- [ ] Check MySQL: `SELECT COUNT(*) FROM permissions WHERE module='settings';` — should be ~30 rows
- [ ] Check role assignments: `SELECT * FROM role_permissions WHERE role_id=(SELECT id FROM roles WHERE code='organization_admin') LIMIT 5;` — includes settings permissions

## Backend Integration

### Copy Shared Validation Schemas
1. Copy `shared/src/validation/settings.schemas.ts` to the shared package
2. Update `shared/src/index.ts` to export:
   ```typescript
   export * from './validation/settings.schemas.js';
   export type * from './validation/settings.schemas.js';
   ```

### Copy Server Files
```bash
cp -r server/src/modules/settings/ <your-project>/server/src/modules/
```

**Files copied:**
- repositories/ (17 repository classes)
- services/ (5 service classes + index)
- controllers/ (3+ controllers)
- settings.routes.ts
- __tests__/ (test files)

### Register Routes in Main Server File

In `server/src/server.ts` (or equivalent):
```typescript
import settingsRoutes from './modules/settings/settings.routes.js';

// After other module routes
app.use('/api/v1/settings', settingsRoutes);
```

**Verify:**
- [ ] Server starts without errors: `npm run dev`
- [ ] Route registration logged
- [ ] No port conflicts

### Test API Endpoints

```bash
# Test Company Profile (no data yet, should be auto-created)
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/settings/company-profile

# Test creating a branch
curl -X POST http://localhost:3000/api/v1/settings/branches \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"NYC","code":"NYC_BR","city":"New York","status":"active"}'

# Should return: {"success": true, "data": {...}}
```

**Verify:**
- [ ] 200 response for GET endpoints
- [ ] 201 response for POST (create)
- [ ] 200 response for PATCH (update)
- [ ] Audit logs created: `SELECT * FROM audit_logs WHERE entity_type='BRANCH' ORDER BY created_at DESC LIMIT 5;`

## Frontend Integration

### Install Dependencies (if not present)
```bash
npm install @hookform/resolvers react-hook-form zustand
```

### Copy React Files
```bash
cp -r client/src/features/settings/ <your-project>/client/src/features/
```

**Files copied:**
- hooks/ (useCompanyProfile, useBranches)
- pages/ (SettingsLayout, BranchesPage)
- components/ (DataTable, FormModal)
- store/ (settingsStore)

### Update API Client Configuration

Verify `client/src/lib/api.ts` includes settings endpoints:
```typescript
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  // ... other config
});
```

### Add Routes to React Router

In `client/src/routes/index.tsx`:
```typescript
import { SettingsLayout } from '@/features/settings/pages/SettingsLayout';
import { BranchesPage } from '@/features/settings/pages/BranchesPage';
// ... other imports

const settingsRoutes = {
  path: 'settings',
  element: <SettingsLayout />,
  children: [
    { path: 'branches', element: <BranchesPage /> },
    // ... add more modules as pages are created
  ],
};

// Add to main routes array
```

### Add Navigation Link

In main navigation/sidebar component:
```typescript
<Link to="/settings" className="...">
  ⚙️ Settings
</Link>
```

**Verify:**
- [ ] React app starts: `npm start`
- [ ] No TypeScript errors
- [ ] Navigation link visible
- [ ] Settings page loads (should show sidebar + empty state)

## Permission Setup

### Verify Permission Codes

Run in MySQL:
```sql
SELECT code FROM permissions 
WHERE module='settings' 
ORDER BY code;
```

**Should include (30 total):**
- settings.company_profile.read / .write
- settings.branches.read / .write
- settings.locations.read / .write
- settings.departments.read / .write
- settings.designations.read / .write
- settings.cost_centers.read / .write
- settings.holiday_calendars.read / .write
- settings.attendance_policies.read / .write
- settings.leave_policies.read / .write
- settings.payroll_policies.read / .write
- settings.work_policies.read / .write
- settings.branding.read / .write
- settings.email_templates.read / .write
- settings.organization_settings.read / .write
- settings.history.read / .write

### Assign to Roles

**Organization Admin** — should have all 30 permissions:
```sql
SELECT COUNT(*) FROM role_permissions 
WHERE role_id=(SELECT id FROM roles WHERE code='organization_admin')
  AND permission_id IN (SELECT id FROM permissions WHERE module='settings');
-- Should be 30
```

**HR Manager** — should have at least read permissions + selective write:
```sql
SELECT COUNT(*) FROM role_permissions 
WHERE role_id=(SELECT id FROM roles WHERE code='hr_manager')
  AND permission_id IN (SELECT id FROM permissions WHERE module='settings');
-- Should be >= 15 (read) + selective write permissions
```

## End-to-End Testing

### Create Test Data
```bash
# Log in as organization admin
# Navigate to Settings → Branches
# Create a new branch:
# - Name: "Test Branch"
# - Code: "TEST_BR"
# - City: "San Francisco"
# - Status: "active"
# Click Save

# Verify:
# 1. Success message appears
# 2. Branch appears in list
# 3. Audit log created: SELECT * FROM audit_logs WHERE entity_type='BRANCH' ORDER BY id DESC LIMIT 1;
```

### Test Multi-Tenancy
```bash
# Create org2 with user2
# Log in as user2
# Query: SELECT * FROM branches WHERE organization_id=<org2_id>;
# Should only see branches for org2
# Should NOT see org1 branches even with direct API call
```

### Test Soft Delete
```bash
# Delete a branch from UI
# Verify deleted_at is set: SELECT deleted_at FROM branches WHERE id=1;
# List branches endpoint should NOT include deleted
# GET /settings/branches?includeDeleted=true should include it (if implemented)
```

### Test Audit Trail
```sql
-- View full audit history for a branch
SELECT * FROM audit_logs 
WHERE entity_type='BRANCH' AND entity_id=1 
ORDER BY created_at DESC;

-- Should show: CREATE, UPDATE (if edited), DELETE (if deleted)
-- Each with before_state and after_state
```

## Implementation Completion Status

### Database Layer ✅
- [x] 17 migration files created
- [x] All table schemas defined
- [x] Indexes and constraints in place
- [x] Foreign key relationships established
- [x] Permission seeding script ready

### Backend API ✅
- [x] 17 Repository classes with custom queries
- [x] 5 Service classes (CompanyProfile, Branch, Location, Department, Generic)
- [x] 3+ Controller classes
- [x] Comprehensive routing with permissions
- [x] Shared Zod validation schemas (30 schemas)

### Frontend UI 🟨 Partial
- [x] Zustand store for state management
- [x] TanStack Query hooks for data fetching
- [x] SettingsLayout component with sidebar
- [x] DataTable component for lists
- [x] FormModal component for create/edit
- [ ] Need to complete remaining module pages (locations, departments, etc.)
- [ ] Need to complete remaining controllers and form modals
- [ ] Need to implement filter/search UI
- [ ] Need to implement pagination controls

### Testing 🟨 Structure Only
- [x] Test file structure created
- [ ] Need to implement actual test cases
- [ ] Need to add test DB fixtures
- [ ] Need to mock Knex queries

## Known Limitations & TODOs

### Code Completeness
- **Specialized Controllers:** Only Branch, CompanyProfile, Location controllers created. Others follow same pattern.
- **Additional Services:** Designation, CostCenter, Holiday, etc. need to follow GenericSettingsService pattern
- **Complete React Pages:** Only BranchesPage as example. Other module pages need similar implementation.
- **Bulk Operations:** Not yet implemented (Phase 2 enhancement)
- **Advanced Filtering:** UI component exists but backend filters need refinement

### Testing
- [ ] Unit tests need implementation with real DB or mocking
- [ ] Integration tests needed for full request cycle
- [ ] Frontend component tests needed

## Files Created Summary

### Migrations (17 files)
- `database/migrations/20260713000001-20260713000017.ts`

### Shared Validation (1 file)
- `shared/src/validation/settings.schemas.ts`

### Backend - Repositories (17 files)
- `server/src/modules/settings/repositories/*.ts`

### Backend - Services (5 files)
- `server/src/modules/settings/services/*.ts`

### Backend - Controllers (3+ files)
- `server/src/modules/settings/controllers/*.ts`

### Backend - Routes (1 file)
- `server/src/modules/settings/settings.routes.ts`

### Backend - Tests (1+ files)
- `server/src/modules/settings/__tests__/*.ts`

### Database Seeds (1 file)
- `database/seeds/settings_permissions.ts`

### Frontend - Hooks (2+ files)
- `client/src/features/settings/hooks/*.ts`

### Frontend - Pages (2 files)
- `client/src/features/settings/pages/*.tsx`

### Frontend - Components (2+ files)
- `client/src/features/settings/components/**/*.tsx`

### Frontend - Store (1 file)
- `client/src/features/settings/store/settingsStore.ts`

### Documentation (2 files)
- `PHASE2_SETTINGS_ENGINE.md`
- `PHASE2_INTEGRATION_CHECKLIST.md`

## Next Steps

1. **Verify Phase 1 is unmodified** — Do not change any Phase 1 files
2. **Run migrations** — Creates all 17 tables
3. **Seed permissions** — Adds 30 permission codes to roles
4. **Copy server files** — Register routes in main server
5. **Test API** — Verify endpoints respond correctly
6. **Copy React files** — Add to router and test navigation
7. **Complete remaining modules** — Follow established patterns for other settings modules
8. **Add comprehensive tests** — Unit and integration tests for critical paths
9. **Document custom extensions** — Any org-specific additions or modifications

## Support Resources

- **Database Documentation:** Review schema files in migrations/
- **API Documentation:** Check settings.routes.ts for all endpoints
- **Frontend Patterns:** See BranchesPage.tsx and BranchFormModal.tsx for component patterns
- **Error Handling:** Review error classes and global middleware
- **Permission Codes:** See settings_permissions seed for all permission definitions

---

**Generated:** 2026-07-13  
**Ready for:** Integration into main project  
**Estimated Integration Time:** 2-3 hours  
**Risk Level:** Low (isolated module, follows Phase 1 patterns exactly)
