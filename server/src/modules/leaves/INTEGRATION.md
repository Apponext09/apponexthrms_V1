# Leave Management System - Integration Guide

This document explains how to integrate the Leave Management System with the main ApponextHRMS application.

## Step 1: Run Migrations

Execute the database migrations to create leave tables:

```bash
npx knex migrate:latest
```

This will create:
- leave_policy_assignments
- leave_balances
- leave_accruals
- leave_applications
- leave_application_days
- leave_approvals
- leave_cancellations
- leave_encashments
- comp_off_balances
- comp_off_requests
- leave_carry_forward
- leave_delegations
- leave_audit_logs

## Step 2: Register Routes

In your main Express app (e.g., `server/src/app.ts`):

```typescript
import { mountLeaveRoutes } from './modules/leaves';
import type { Router } from 'express';

export function setupRoutes(router: Router) {
  // ... other routes
  mountLeaveRoutes(router);
  // ... more routes
}
```

## Step 3: Add Permissions to Database

Insert leave permissions into the permissions table:

```typescript
import { leavePermissions } from './modules/leaves';

// In your seed/migration script:
for (const permission of leavePermissions) {
  await permissionRepository.create(ctx, permission);
}
```

Or run SQL directly:
```sql
INSERT INTO permissions (code, module, resource, action, description, is_system, created_at, updated_at)
VALUES 
  ('leave.read', 'leave', 'application', 'read', 'View leave applications', true, NOW(), NOW()),
  ('leave.apply', 'leave', 'application', 'apply', 'Apply for leave', true, NOW(), NOW()),
  ('leave.approve', 'leave', 'application', 'approve', 'Approve leave applications', true, NOW(), NOW()),
  ('leave.admin', 'leave', 'management', 'admin', 'Administer leave management', true, NOW(), NOW()),
  ('leave.policy.manage', 'leave', 'policy', 'manage', 'Manage leave policies', true, NOW(), NOW()),
  ('leave.balance.manage', 'leave', 'balance', 'manage', 'Manage leave balances', true, NOW(), NOW()),
  ('leave.comp_off', 'leave', 'comp_off', 'manage', 'Manage comp off', true, NOW(), NOW()),
  ('leave.analytics', 'leave', 'analytics', 'view', 'View leave analytics', true, NOW(), NOW());
```

## Step 4: Create Leave Types

Insert standard leave types for each organization:

```typescript
import { db } from './db';

async function seedLeaveTypes(organizationId: number) {
  const leaveTypes = [
    { leave_code: 'CL', leave_name: 'Casual Leave', is_paid: true },
    { leave_code: 'SL', leave_name: 'Sick Leave', is_paid: true },
    { leave_code: 'EL', leave_name: 'Earned Leave', is_paid: true },
    { leave_code: 'PL', leave_name: 'Privilege Leave', is_paid: true },
    { leave_code: 'ML', leave_name: 'Maternity Leave', is_paid: true, gender_applicable: 'female' },
    { leave_code: 'PL', leave_name: 'Paternity Leave', is_paid: true, gender_applicable: 'male' },
    { leave_code: 'UL', leave_name: 'Unpaid Leave', is_paid: false },
    { leave_code: 'CO', leave_name: 'Comp Off', is_paid: true, is_comp_off: true },
    { leave_code: 'WFH', leave_name: 'Work From Home', is_paid: true },
  ];

  for (const type of leaveTypes) {
    await db('leave_types').insert({
      uuid: uuidv4(),
      organization_id: organizationId,
      ...type,
      status: 'active',
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
}
```

## Step 5: Create Default Policy

```typescript
async function createDefaultLeavePolicy(organizationId: number) {
  const policy = {
    uuid: uuidv4(),
    organization_id: organizationId,
    policy_name: 'Default Policy',
    policy_code: 'DEFAULT',
    description: 'Default leave policy for all employees',
    is_default: true,
    effective_from: new Date().toISOString().split('T')[0],
    status: 'active',
    created_by: 1,
    updated_by: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  return await db('leave_policies').insert(policy);
}
```

## Step 6: Assign Policies to Employees

After creating employees, assign policies:

```typescript
import { LeavePolicyAssignmentRepository } from './modules/leaves';

async function assignLeavePolicy(ctx: TenantContext, employeeId: number, leaveTypeId: number) {
  const assignmentRepo = new LeavePolicyAssignmentRepository();

  await assignmentRepo.create(ctx, {
    uuid: uuidv4(),
    employee_id: employeeId,
    leave_policy_id: 1, // Default policy ID
    leave_type_id: leaveTypeId,
    annual_quota: 12, // Example: 12 casual days per year
    monthly_accrual: null,
    quarterly_accrual: null,
    yearly_accrual: 12,
    carry_forward_enabled: true,
    carry_forward_limit: 5,
    encashment_enabled: false,
    maximum_balance: 30,
    can_take_negative: false,
    sandwich_policy_enabled: true,
    probation_excluded: false,
    assignment_start_date: new Date().toISOString().split('T')[0],
    assignment_end_date: null,
    is_active: true,
    created_by: 1,
    updated_by: 1,
  });
}
```

## Step 7: Initialize Balances

For existing employees, initialize their leave balances:

```typescript
import { LeaveBalanceService } from './modules/leaves';

async function initializeEmployeeBalances(ctx: TenantContext, employeeId: number) {
  const balanceService = new LeaveBalanceService();
  const assignmentRepo = new LeavePolicyAssignmentRepository();

  const assignments = await assignmentRepo.getForEmployee(ctx, employeeId);

  for (const assignment of assignments) {
    const fyStart = calculateFinancialYearStart(new Date().toISOString().split('T')[0]);
    await balanceService.initializeBalance(
      ctx,
      employeeId,
      assignment.leave_type_id,
      fyStart,
      assignment.annual_quota
    );
  }
}
```

## Step 8: Setup Scheduled Jobs

Create cron jobs for accruals and expiry checks:

```typescript
import cron from 'node-cron';
import { LeaveAccrualService, CompOffService } from './modules/leaves';

// Monthly accrual (1st of every month at 2 AM)
cron.schedule('0 2 1 * *', async () => {
  const ctx = getSystemContext(); // System context for batch operations
  const accrualService = new LeaveAccrualService();
  await accrualService.accrueMonthlyLeaves(ctx, ctx.organizationId);
  console.log('Monthly leave accrual completed');
});

// Quarterly accrual (1st of Apr, Jul, Oct, Jan at 2 AM)
cron.schedule('0 2 1 1,4,7,10 *', async () => {
  const ctx = getSystemContext();
  const accrualService = new LeaveAccrualService();
  await accrualService.accrueQuarterlyLeaves(ctx);
  console.log('Quarterly leave accrual completed');
});

// Yearly accrual (1st April at 2 AM)
cron.schedule('0 2 1 4 *', async () => {
  const ctx = getSystemContext();
  const accrualService = new LeaveAccrualService();
  await accrualService.accrueYearlyLeaves(ctx);
  console.log('Yearly leave accrual completed');
});

// Check comp off expiry (Daily at 3 AM)
cron.schedule('0 3 * * *', async () => {
  const ctx = getSystemContext();
  const compOffService = new CompOffService();
  await compOffService.checkAndExpireCompOffs(ctx);
  console.log('Comp off expiry check completed');
});
```

## Step 9: Frontend Integration

Mount leave routes in your React app:

```typescript
// In your router configuration (e.g., app/router.ts)
{
  path: '/leaves',
  element: <Layout />,
  children: [
    { path: '', element: <MyLeavesPage /> },
    { path: '/apply', element: <ApplyLeavePage /> },
    { path: '/balance', element: <LeaveBalancePage /> },
    { path: '/approvals', element: <ApprovalInboxPage /> },
    { path: '/comp-off', element: <CompOffManagementPage /> },
  ],
}
```

Add menu items:
```typescript
const menuItems = [
  // ... other items
  {
    label: 'Leave Management',
    icon: 'calendar-check',
    children: [
      { label: 'My Leaves', href: '/leaves' },
      { label: 'Apply for Leave', href: '/leaves/apply' },
      { label: 'My Balance', href: '/leaves/balance' },
      { label: 'Comp Off', href: '/leaves/comp-off' },
      { permission: 'leave.approve', label: 'Approvals', href: '/leaves/approvals' },
    ],
  },
];
```

## Step 10: Workflow Integration

Configure leave approval workflow in the workflow engine:

```typescript
// Assuming Workflow Engine is Phase 4
const leaveApprovalWorkflow = {
  name: 'Leave Approval',
  description: 'Multi-level leave approval workflow',
  entityType: 'leave_application',
  steps: [
    {
      stepName: 'Manager Review',
      description: 'Reporting manager reviews leave request',
      assignee: 'reportingManager', // Dynamic field from entity
      actions: ['approve', 'reject'],
      nextStep: 'HR Review',
    },
    {
      stepName: 'HR Review',
      description: 'HR reviews and approves',
      assignee: 'hr_user',
      actions: ['approve', 'reject'],
      nextStep: null,
    },
  ],
};
```

## Step 11: Notification Integration

Configure leave notifications in the notification engine:

```typescript
// Assuming Notification Engine is Phase 5
const leaveNotifications = [
  {
    eventType: 'leave_submitted',
    templateName: 'leave_submitted',
    recipients: ['manager', 'hr'],
    channels: ['email', 'in_app'],
  },
  {
    eventType: 'leave_approved',
    templateName: 'leave_approved',
    recipients: ['employee'],
    channels: ['email', 'in_app'],
  },
  {
    eventType: 'leave_rejected',
    templateName: 'leave_rejected',
    recipients: ['employee'],
    channels: ['email', 'in_app'],
  },
  {
    eventType: 'balance_low',
    templateName: 'balance_low_warning',
    recipients: ['employee'],
    channels: ['email', 'in_app'],
    condition: 'availableBalance < 5',
  },
];
```

## Step 12: Configuration

Set organization-specific settings in settings module:

```typescript
interface LeaveSettings {
  financialYearStartMonth: number; // 1-12 (4 = April)
  defaultAccrualFrequency: 'monthly' | 'quarterly' | 'yearly';
  compOffExpiryDays: number; // Default: 180
  balanceLowThreshold: number; // Default: 5
  allowNegativeBalance: boolean; // Default: false
  sandwichPolicyEnabled: boolean; // Default: true
}
```

## Verification

After integration, verify with:

1. **Database**: Check if all leave tables exist
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name LIKE 'leave%';
   ```

2. **API**: Test endpoints
   ```bash
   curl http://localhost:3000/api/v1/leaves/applications
   ```

3. **Permissions**: Verify permissions are inserted
   ```sql
   SELECT * FROM permissions WHERE code LIKE 'leave.%';
   ```

4. **Leave Types**: Check if types are created
   ```sql
   SELECT * FROM leave_types;
   ```

5. **Frontend**: Navigate to /leaves and verify pages load

## Troubleshooting

### Issue: "Table not found" error
**Solution**: Run migrations: `npx knex migrate:latest`

### Issue: "Permission denied" on API calls
**Solution**: Ensure permissions are assigned to your user role

### Issue: Leave applications not triggering workflow
**Solution**: Verify workflow engine is integrated and workflow ID is configured

### Issue: Notifications not sending
**Solution**: Check notification engine integration and template setup

## Production Checklist

- [ ] All migrations executed
- [ ] Leave types created
- [ ] Default policies configured
- [ ] Employees assigned to policies
- [ ] Initial balances initialized
- [ ] Scheduled jobs configured
- [ ] Workflow engine integrated
- [ ] Notification templates created
- [ ] Frontend routes mounted
- [ ] Permissions assigned to roles
- [ ] Settings configured
- [ ] Audit logging verified
- [ ] Tests passing
