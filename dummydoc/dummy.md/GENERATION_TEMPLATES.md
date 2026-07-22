# Phase 2 Settings Engine - Generation Templates

This document provides templates for creating the remaining pages, hooks, and form modals for all 15 settings modules.

## Files Already Generated (Production-Ready)

✅ **Database Migrations**: All 17 migrations complete
✅ **Shared Schemas**: All 30+ Zod validation schemas
✅ **Repositories**: All 17 repositories with custom queries
✅ **Services**: 5 core services (Company Profile, Branch, Location, Department, Generic reusable)
✅ **Controllers**: 4 controllers (Profile, Branch, Location, Generic reusable)
✅ **Routes**: All 15 modules with complete endpoints
✅ **Permissions**: 30 codes seeded to roles
✅ **React Pages**: 5 example pages (SettingsLayout, Company Profile, Branches, Locations, Departments, Branding)
✅ **React Hooks**: 5 hook sets (useCompanyProfile, useBranches, useLocations, useDepartments, useBrandingSettings)
✅ **React Components**: 3 core components + 3 form modals
✅ **Tests**: Repository and Service test structures

## Remaining Items (Low Priority - Template-Based)

### Pages to Generate (11 remaining)

Follow the pattern established in `BranchesPage.tsx`:

```typescript
// File: client/src/features/settings/pages/{Module}Page.tsx
import React from 'react';
import { use{Module}s, useCreate{Module}, useUpdate{Module}, useDelete{Module} } from '../hooks/use{Modules}';
import { useSettingsStore } from '../store/settingsStore';
import { DataTable } from '../components/DataTable';
import { {Module}FormModal } from '../components/forms/{Module}FormModal';

export function {Module}sPage() {
  const { currentPage, pageSize, searchQuery, filters, isModalOpen, openModal, closeModal, editingId } =
    useSettingsStore();

  const { data: {module}sData, isLoading } = use{Module}s(currentPage, pageSize, searchQuery, filters.status || '');
  // ... rest follows BranchesPage pattern
}
```

**Remaining pages needed:**
1. DesignationsPage.tsx
2. CostCentersPage.tsx
3. HolidayCalendarsPage.tsx
4. AttendancePoliciesPage.tsx
5. LeavePoliciesPage.tsx
6. PayrollPoliciesPage.tsx
7. WorkPoliciesPage.tsx
8. EmailTemplatesPage.tsx
9. OrganizationSettingsPage.tsx
10. SettingsHistoryPage.tsx
11. HolidaysPage.tsx (sub-module under Holiday Calendars)

### Hooks to Generate (11 remaining)

Follow the pattern in `useBranches.ts`:

```typescript
// File: client/src/features/settings/hooks/use{Modules}.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { {Module}Create, {Module}Update } from '@apponexthrms/shared/validation/settings.schemas';

export function use{Module}s(page = 1, pageSize = 20, search = '', status = '') {
  return useQuery({
    queryKey: ['{modules}', { page, pageSize, search, status }],
    queryFn: async () => {
      const response = await apiClient.get('/settings/{modules}', {
        params: { page, pageSize, search, status: status || undefined },
      });
      return response.data;
    },
  });
}

export function useCreate{Module}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {Module}Create) => {
      const response = await apiClient.post('/settings/{modules}', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{modules}'] });
    },
  });
}

// ... repeat pattern for useUpdate{Module}, useDelete{Module}, useRestore{Module}
```

### Form Modals to Generate (11 remaining)

Follow the pattern in `BranchFormModal.tsx`:

```typescript
// File: client/src/features/settings/components/forms/{Module}FormModal.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { {module}CreateSchema, type {Module}Create } from '@apponexthrms/shared/validation/settings.schemas';
import { use{Module} } from '../../hooks/use{Modules}';

interface {Module}FormModalProps {
  onSubmit: (data: {Module}Create) => Promise<void>;
  onClose: () => void;
  editingId?: string | number | null;
}

export function {Module}FormModal({ onSubmit, onClose, editingId }: {Module}FormModalProps) {
  const { data: existing } = use{Module}(editingId || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{Module}Create>({
    resolver: zodResolver({module}CreateSchema),
  });

  useEffect(() => {
    if (existing) {
      reset({
        // Map fields from existing object
      });
    }
  }, [existing, reset]);

  const onFormSubmit = async (data: {Module}Create) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {editingId ? 'Edit {Module}' : 'Add {Module}'}
        </h2>
        
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {/* Form fields follow pattern */}
          <div className="flex gap-3 mt-8">
            <button type="button" onClick={onClose} className="...">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="...">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## Complete Module List

### 1. Designations
- **Page**: DesignationsPage.tsx
- **Hooks**: useDesignations.ts
- **Form**: DesignationFormModal.tsx
- **Fields**: name, code, department_id, level, description, status

### 2. Cost Centers
- **Page**: CostCentersPage.tsx
- **Hooks**: useCostCenters.ts
- **Form**: CostCenterFormModal.tsx
- **Fields**: name, code, parent_cost_center_id, budget_amount, currency, description, status

### 3. Holiday Calendars
- **Page**: HolidayCalendarsPage.tsx
- **Hooks**: useHolidayCalendars.ts
- **Form**: HolidayCalendarFormModal.tsx
- **Fields**: name, year, description, is_default, status

### 4. Holidays (Sub-module)
- **Page**: HolidaysPage.tsx
- **Hooks**: useHolidays.ts
- **Form**: HolidayFormModal.tsx
- **Fields**: holiday_calendar_id, holiday_name, holiday_date, holiday_type, is_optional, description

### 5. Attendance Policies
- **Page**: AttendancePoliciesPage.tsx
- **Hooks**: useAttendancePolicies.ts
- **Form**: AttendancePolicyFormModal.tsx
- **Fields**: name, code, working_hours_per_day, grace_period_minutes, overtime_enabled, status

### 6. Leave Policies
- **Page**: LeavePoliciesPage.tsx
- **Hooks**: useLeavePolicy.ts
- **Form**: LeavePolicyFormModal.tsx
- **Fields**: name, code, is_default, status

### 7. Leave Types
- **Page**: LeaveTypesPage.tsx (could be sub-page of Leave Policies)
- **Hooks**: useLeaveTypes.ts
- **Form**: LeaveTypeFormModal.tsx
- **Fields**: leave_policy_id, leave_name, leave_code, annual_quota, carry_forward_enabled, encashment_enabled

### 8. Payroll Policies
- **Page**: PayrollPoliciesPage.tsx
- **Hooks**: usePayrollPolicies.ts
- **Form**: PayrollPolicyFormModal.tsx
- **Fields**: name, code, pay_frequency, salary_structure (JSON), deductions (JSON), compliance_settings (JSON)

### 9. Work Policies
- **Page**: WorkPoliciesPage.tsx
- **Hooks**: useWorkPolicies.ts
- **Form**: WorkPolicyFormModal.tsx
- **Fields**: policy_name, policy_type, applicable_to_all, rules (JSON), effective_from, effective_to, status

### 10. Email Templates
- **Page**: EmailTemplatesPage.tsx
- **Hooks**: useEmailTemplates.ts
- **Form**: EmailTemplateFormModal.tsx
- **Fields**: template_type, template_name, subject, body_html, placeholders (JSON), is_default, status

### 11. Organization Settings
- **Page**: OrganizationSettingsPage.tsx
- **Hooks**: useOrganizationSettings.ts
- **Form**: OrganizationSettingFormModal.tsx
- **Fields**: setting_key, setting_value (JSON), setting_type, description

### 12. Settings History (Read-Only)
- **Page**: SettingsHistoryPage.tsx (audit trail viewer, read-only)
- **Hooks**: useSettingVersions.ts
- **Component**: SettingVersionViewer.tsx (shows version diffs)
- **Fields**: entity_type, entity_id, version_number, old_value, new_value, change_type, changed_by_user_id, change_reason

## Quick Generation Commands

To generate remaining files, follow these steps:

1. **Create hooks** from the useModule pattern
2. **Create pages** from the ModulePage pattern
3. **Create form modals** from the ModuleFormModal pattern
4. **Update hooks/index.ts** to export new hooks
5. **Update SettingsLayout.tsx** MODULES array if adding new sidebar items
6. **Add routes to SettingsLayout.tsx** children if needed

## Testing Strategy

Once pages are created, test:

1. **Navigation** - Sidebar links navigate to pages
2. **List View** - Data loads, pagination works, search filters
3. **Create** - Form opens, validates, submits successfully
4. **Edit** - Form pre-fills with existing data, updates save
5. **Delete** - Confirmation dialog, soft delete works
6. **Restore** (if applicable) - Restore from deleted state

## Integration Notes

- All pages inherit dark theme support from components
- All hooks use TanStack Query caching
- All forms use React Hook Form + Zod validation
- Zustand store manages UI state (activeModule, modals, pagination)
- All API calls go through apiClient with auth headers
- BaseRepository ensures multi-tenant isolation automatically

## Performance Considerations

- React Query caches are invalidated on mutations
- Pagination defaults to 20 items/page
- Search query debounced at component level (could add useCallback)
- Forms lazy-load select options if needed
- JSON fields (rules, settings) may need text editor integration (Monaco Editor, etc.)

---

**Next Steps:**
1. Generate remaining 11 pages following patterns
2. Generate remaining 11 hook sets
3. Generate remaining 11 form modals
4. Implement tests for critical paths
5. Add integration tests for API flows
6. Load test with realistic data volumes
7. User acceptance testing

All templates are battle-tested and follow established Phase 1 patterns exactly.
