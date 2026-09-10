# Leave Management System (Phase 7)

Enterprise-grade leave management system integrated with Workflow Engine (Phase 4) and Notification Engine (Phase 5).

## Architecture

### Repositories
- **LeavePolicyAssignmentRepository** - Employee policy assignments
- **LeaveBalanceRepository** - Leave balances per employee per leave type
- **LeaveApplicationRepository** - Leave requests
- **LeaveApplicationDayRepository** - Daily breakdown of leaves
- **LeaveAccrualRepository** - Accrual logs
- **LeaveApprovalRepository** - Approval trail
- **CompOffBalanceRepository** - Compensatory off tracking
- **CompOffRequestRepository** - Comp off usage requests
- **LeaveCancellationRepository** - Cancellation requests

### Services
- **LeaveService** - Core leave application logic
  - `applyLeave()` - Create leave request
  - `submitLeaveApplication()` - Submit for approval
  - `cancelLeave()` - Cancel leave
  - `withdrawLeave()` - Withdraw draft application

- **LeaveBalanceService** - Balance calculations
  - `getBalance()` - Current balance
  - `updateBalanceOnApproval()` - Update when approved
  - `updateBalanceOnRejection()` - Update when rejected
  - `updateBalanceOnCancellation()` - Restore balance
  - `addPendingBalance()` - Add pending for submitted
  - `creditAccrual()` - Credit monthly/quarterly accrual
  - `encashLeave()` - Encash leave days

- **LeaveApprovalService** - Approval workflow
  - `getApprovalQueue()` - Pending approvals for user
  - `approveLeave()` - Approve application
  - `rejectLeave()` - Reject application
  - `countPending()` - Count pending approvals

- **CompOffService** - Comp off management
  - `earnCompOff()` - Earn comp off for work
  - `requestCompOff()` - Request comp off usage
  - `approveCompOffRequest()` - Approve request
  - `rejectCompOffRequest()` - Reject request
  - `checkAndExpireCompOffs()` - Expire old comp offs

- **LeaveAccrualService** - Accrual scheduling
  - `accrueMonthlyLeaves()` - Monthly accrual job
  - `accrueQuarterlyLeaves()` - Quarterly accrual job
  - `accrueYearlyLeaves()` - Yearly accrual job

### Controllers & Routes
- All endpoints at `/api/v1/leaves`

#### Applications
```
POST   /applications              Apply for leave
POST   /applications/:id/submit   Submit application
GET    /applications/:id          Get application
GET    /applications              My leaves
POST   /applications/:id/cancel   Cancel leave
POST   /applications/:id/withdraw Withdraw leave
GET    /date-range                Get by date range
```

#### Approvals
```
GET    /approvals/pending         Get pending approvals
POST   /approvals/:id/approve     Approve leave
POST   /approvals/:id/reject      Reject leave
```

#### Balances
```
GET    /balances                  My balances
```

#### Comp Off
```
GET    /comp-off                  My comp off balance
POST   /comp-off/request          Request comp off
```

#### Admin
```
GET    /department/:id/applications  Get dept leaves
```

## Database Schema

### Financial Year
- Default: April 1 - March 31 (configurable per org)
- Used for balance tracking and accruals

### Leave Application Lifecycle
1. **Draft** - Created but not submitted
2. **Submitted** - Sent for approval, triggers workflow
3. **Approved/Rejected** - Workflow completed
4. **Cancelled** - Employee cancelled (may need approval)
5. **Withdrawn** - Only from draft state

### Balance Calculation
```
Available = Opening + Credited + CarryForward - Encashed - Consumed
Pending = Applications submitted but not approved
```

## Workflow Integration

Leave applications automatically create workflow instances:
- Workflow ID: Configurable (set in config)
- Entity Type: `leave_application`
- Initiator: Employee
- Approvers: Retrieved from workflow rules

## Notification Integration

Triggered notifications:
- `leave_submitted` - When applied
- `leave_approved` - When approved
- `leave_rejected` - When rejected
- `balance_low` - When balance < 5 days (configurable)
- `leave_expiry` - When leaving in 30 days (configurable)

## Key Features

### Accrual Types
- **Monthly** - Fixed days per month
- **Quarterly** - Fixed days per quarter
- **Yearly** - Fixed days per year

### Balance Management
- Carry forward with expiry limit
- Encashment with limits
- Negative balance (policy configurable)
- Sandwich policy (day between holidays counts as leave)
- Probation exclusion

### Comp Off
- Earn for weekend/holiday work
- 6-month default expiry (configurable)
- Request and approval workflow

### Advanced Features
- Half-day/hourly leaves
- Multi-level approval
- Approval delegation
- Leave cancellation with workflow
- Audit trail for all actions
- Concurrent leave prevention (sandwich policy)

## Permissions

```
leave.read              View applications
leave.apply             Apply for leave
leave.approve           Approve applications
leave.admin             Admin access
leave.policy.manage     Manage policies
leave.balance.manage    Manage balances
leave.comp_off          Manage comp off
leave.analytics         View analytics
```

## Configuration

### Organization Settings
- Financial year start month (default: April)
- Default accrual frequency
- Default comp off expiry (days)
- Balance low threshold
- Negative balance allowed

### Policy Assignments
Per employee-leave type combination:
- Annual quota
- Monthly/quarterly/yearly accrual
- Carry forward enabled/limit
- Encashment enabled/limit
- Sandwich policy
- Probation exclusion

## Scheduled Jobs

Run via cron/scheduler:
- **Monthly** - AccrueMonthlyLeaves()
- **Quarterly** - AccrueQuarterlyLeaves()
- **Yearly** - AccrueYearlyLeaves()
- **Daily** - CheckAndExpireCompOffs()
- **Daily** - CheckLeaveExpiry()

## Error Handling

### Validation
- Employee eligibility for leave type
- Sufficient balance
- Date range validation
- Policy restrictions

### Conflicts
- Concurrent leaves (sandwich policy)
- Overlapping cancellations
- Invalid state transitions

## Testing

Unit tests cover:
- Leave calculations
- Financial year calculation
- Balance updates
- Approval flow
- Comp off expiry
- Accrual scheduling

Run tests:
```bash
npm test -- LeaveService
```

## Frontend Integration

React hooks provided:
- `useApplyLeave()` - Apply for leave
- `useLeaveApplications()` - List applications
- `useLeaveBalance()` - Get balances
- `useLeaveApprovals()` - Get approvals queue
- `useApproveLeave()` - Approve application
- `useCompOffBalance()` - Get comp off balance
- `useRequestCompOff()` - Request comp off

Zustand store:
- `useLeaveStore` - Global state management

Pages provided:
- `MyLeavesPage` - My applications
- `ApplyLeavePage` - Apply for leave
- `ApprovalInboxPage` - Pending approvals
- `LeaveBalancePage` - Balance view
- `CompOffManagementPage` - Comp off management

## Security

- Row-level security via TenantContext
- Permission checks on all endpoints
- Audit logging for all changes
- Workflow-based approvals (no direct updates)
- No direct balance modification (via accrual only)
