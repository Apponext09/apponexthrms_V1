# Performance Management System - Integration Documentation

## Overview

This document outlines all integration points between the Performance Management System and other modules in ApponextHRMS. The system is built with event-driven architecture using an event bus for loose coupling between services.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Performance Module                        │
│  (Goals, Reviews, Appraisals, OKRs, PIPs, etc.)             │
└─────────────────────────────────────────────────────────────┘
            ↓           ↓           ↓           ↓
      ┌─────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐
      │Workflow │ │Notif.   │ │Payroll │ │Recruit.  │
      │Integration││Integration│Integration│Integration│
      └─────────┘ └─────────┘ └────────┘ └──────────┘
```

## 1. Workflow Integration

### Location
`server/src/modules/performance/integrations/workflowHooks.ts`

### Workflow Triggers

#### Goal Approval Workflow
- **Event**: `performance.goal_submitted`
- **Process Type**: `goal_approval`
- **Entities**: Goal
- **Approvers**: HR Manager, Organization Admin
- **Completion Events**: `performance.goal_approved`, `workflow.goal_approval_completed`

#### Review Approval Workflow
- **Event**: `performance.review_submitted`
- **Process Type**: `review_approval`
- **Entities**: Review
- **Approvers**: Department Head, HR Manager
- **Completion Events**: `performance.review_approved`, `workflow.review_approval_completed`

#### Appraisal Approval Workflow
- **Event**: `performance.appraisal_finalized`
- **Process Type**: `appraisal_approval`
- **Entities**: Appraisal
- **Approvers**: HR Director, Organization Admin
- **Completion Events**: `performance.appraisal_approved`, `workflow.appraisal_approval_completed`

#### PIP Approval Workflow
- **Event**: `performance.pip_created`
- **Process Type**: `pip_approval`
- **Entities**: PIP
- **Approvers**: HR Manager, Legal (if applicable)
- **Completion Events**: `performance.pip_approved`, `workflow.pip_approval_completed`

#### Salary Increment Approval Workflow
- **Event**: `performance.salary_increment_recommended`
- **Process Type**: `salary_increment_approval`
- **Entities**: Employee
- **Approvers**: Finance Manager, Organization Admin
- **Completion Events**: `performance.salary_increment_approved`, `workflow.salary_increment_approval_completed`

### Implementation Notes
- All workflows use multi-level approval chains
- Workflow context includes performance metrics and history
- Conditional routing based on increment amount or PIP type
- Audit trail maintained for all approvals
- Rejection workflows include re-submission capability

---

## 2. Notification Integration

### Location
`server/src/modules/performance/integrations/notificationHooks.ts`

### Notification Triggers

#### Review Cycle Started
- **Event**: `performance.review_cycle_activated`
- **Recipients**: All employees in cycle
- **Template**: `performance.review_cycle_started`
- **Channels**: In-app, Email
- **Priority**: Normal

#### Pending Feedback Requests
- **Event**: `performance.feedback_requested`
- **Recipients**: Assigned reviewers
- **Template**: `performance.feedback_pending`
- **Channels**: In-app, Email
- **Priority**: Normal
- **Due Date**: Configurable (default 7 days)

#### Goal Due Date Approaching
- **Event**: `performance.goal_due_date_approaching`
- **Recipients**: Goal owner (employee)
- **Template**: `performance.goal_due_soon`
- **Channels**: In-app, Email
- **Priority**: High (if < 3 days)
- **Sent**: 30, 14, 7, 3 days before deadline

#### PIP Milestone Reminders
- **Event**: `performance.pip_milestone_upcoming`
- **Recipients**: Employee, Manager
- **Template**: `performance.pip_milestone_reminder`
- **Channels**: In-app, Email
- **Priority**: High
- **Sent**: 14 and 7 days before milestone

#### Appraisal Completion
- **Event**: `performance.appraisal_completed`
- **Recipients**: Employee
- **Template**: `performance.appraisal_complete`
- **Channels**: In-app, Email
- **Priority**: Normal
- **Includes**: Final rating and feedback

#### Recognition Received
- **Event**: `performance.recognition_given`
- **Recipients**: Recognized employee
- **Template**: `performance.recognition_received`
- **Channels**: In-app, Email, SMS
- **Priority**: Normal
- **Includes**: Recognition text, points, giver details

#### Goal Approved
- **Event**: `performance.goal_approved`
- **Recipients**: Employee
- **Template**: `performance.goal_approved`
- **Channels**: In-app, Email
- **Priority**: Normal

#### Review Submitted for Approval
- **Event**: `performance.review_submitted`
- **Recipients**: Approvers
- **Template**: `performance.review_pending_approval`
- **Channels**: In-app, Email
- **Priority**: High

#### Appraisal Submitted for Approval
- **Event**: `performance.appraisal_finalized`
- **Recipients**: Approvers
- **Template**: `performance.appraisal_pending_approval`
- **Channels**: In-app, Email
- **Priority**: High

### Notification Preferences
- Users can disable notifications by category (performance, feedback, recognition)
- Template variables are rendered at send time
- Notification delivery respects user timezone
- Batch notifications for multiple items

---

## 3. Payroll Integration

### Location
`server/src/modules/performance/integrations/payrollHooks.ts`

### Integration Points

#### Performance Bonus Calculation
- **Event**: `performance.appraisal_approved`
- **Trigger**: When appraisal is finalized with rating
- **Calculation**: Rating → Bonus Percentage Mapping
  - Outstanding (5): 20% of monthly salary
  - Exceeds Expectations (4): 15% of monthly salary
  - Meets Expectations (3): 10% of monthly salary
  - Needs Improvement (2): 0%
  - Unsatisfactory (1): 0%
- **Payment**: Typically in next payroll cycle after approval
- **Audit**: All bonus calculations logged with rationale

#### Salary Increment Recommendation
- **Event**: `performance.appraisal_approved`
- **Trigger**: Annual performance review completion
- **Calculation**: Rating → Increment Percentage
  - Outstanding: 10% increment
  - Excellent: 8% increment
  - Good: 6% increment
  - Satisfactory: 3% increment
  - Needs Improvement: 0%
- **Effective Date**: Typically April 1st (fiscal year)
- **Approval**: Requires Finance Manager + Admin approval
- **Integration**: Sends to salary structure update process

#### Variable Pay Based on KPI Achievement
- **Event**: `performance.kpi_achievement_recorded`
- **Trigger**: When KPI/OKR achievements are recorded
- **Calculation**:
  - 100% achievement: 100% of target bonus
  - 80-99% achievement: 80% of target bonus
  - 60-79% achievement: 50% of target bonus
  - <60% achievement: 0%
- **Target Bonus**: Defined in payroll configuration per designation
- **Payment**: Quarterly or per performance cycle

#### Payroll Adjustment Creation
- **Event**: `performance.salary_increment_approved` or `performance.bonus_approved`
- **Action**: Create entry in payroll adjustments
- **Adjustment Types**:
  - SALARY_INCREMENT: Permanent salary increase
  - PERFORMANCE_BONUS: One-time bonus
  - VARIABLE_PAY: Performance-linked variable component
- **Status Flow**: pending_processing → applied → processed
- **Reversal**: Support for adjusting if appraisal is re-opened

### Payment Processing
- Adjustments must be approved before payroll run
- Payroll run locks further modifications
- Failed payroll includes adjustments in reversal
- Audit trail maintains complete history

---

## 4. Recruitment Integration

### Location
`server/src/modules/performance/integrations/recruitmentHooks.ts`

### Integration Points

#### New Hire Goal Setup
- **Event**: `recruitment.offer_accepted`
- **Trigger**: When candidate accepts offer
- **Default Goals**:
  - Complete Onboarding (100% target)
  - Department Familiarization (100% target)
  - Role-Specific Competencies (80% target)
  - Team Integration (100% target)
- **Goal Duration**: From hire date to probation end date (typically 6 months)
- **Weight Distribution**: Weighted by importance

#### Probation Review Workflow
- **Event**: `recruitment.candidate_hired`
- **Trigger**: When employee record is created
- **Review Schedule**:
  - 30-day check-in
  - 60-day review
  - 180-day (probation end) evaluation
- **Review Type**: Probation-specific templates
- **Approvers**: Direct Manager, HR Manager
- **Outcome**: Pass/Fail → Confirmation or extension

#### Offer Acceptance Mapping
- **Event**: `recruitment.offer_accepted_confirmation`
- **Actions**:
  - Create performance profile
  - Map candidate to performance system
  - Schedule initial competency assessment
  - Create onboarding goals
  - Set up review calendar
- **Effective Date**: Typically 30 days from acceptance

#### Competency Framework Assignment
- **Event**: `employee.onboarded`
- **Trigger**: When employee completes onboarding
- **Assignment Logic**:
  - By designation/role
  - By department
  - By seniority level
- **Assessment Schedule**: 90 days after hire
- **Initial Assessment**: Self + Manager assessment
- **Gap Analysis**: Identify development areas

### Probation Duration
- Default: 6 months (configurable per policy)
- Can be extended based on performance
- Extensions require formal approval
- Failed probation triggers exit process

---

## 5. Event Bus Events

### Published Events

#### Goal Events
- `performance.goal_created` → Goal created
- `performance.goal_submitted` → Goal submitted for approval
- `performance.goal_approved` → Goal approved by manager
- `performance.goal_rejected` → Goal rejected
- `performance.goal_updated` → Goal details updated
- `performance.goal_progress_updated` → Progress tracked
- `performance.goal_completed` → Goal marked complete
- `performance.goal_deleted` → Goal soft-deleted
- `performance.goal_due_date_approaching` → Due date reminder

#### OKR Events
- `performance.okr_created` → OKR created
- `performance.okr_activated` → OKR cycle activated
- `performance.okr_completed` → OKR cycle completed
- `performance.key_result_progress_updated` → KR progress tracked
- `performance.okr_deleted` → OKR deleted

#### Review Events
- `performance.review_cycle_created` → Cycle created
- `performance.review_cycle_activated` → Cycle activated
- `performance.review_created` → Review created
- `performance.review_submitted` → Review submitted
- `performance.review_approved` → Review approved
- `performance.review_cycle_completed` → Cycle completed

#### Appraisal Events
- `performance.appraisal_created` → Appraisal created
- `performance.appraisal_finalized` → Appraisal finalized
- `performance.appraisal_approved` → Appraisal approved
- `performance.appraisal_completed` → Appraisal completed

#### Feedback Events
- `performance.feedback_requested` → Feedback request sent
- `performance.feedback_submitted` → Feedback response received
- `performance.feedback_average_calculated` → Average rating calculated

#### PIP Events
- `performance.pip_created` → PIP created
- `performance.pip_approved` → PIP approved
- `performance.pip_milestone_upcoming` → Milestone reminder
- `performance.pip_milestone_completed` → Milestone completed
- `performance.pip_review_completed` → Review completed

#### Recognition Events
- `performance.recognition_given` → Recognition/award given
- `performance.reward_points_earned` → Points allocated
- `performance.reward_points_redeemed` → Points redeemed

#### Competency Events
- `performance.competency_framework_assigned` → Framework assigned
- `performance.competency_assessed` → Competency assessed
- `performance.competency_gap_identified` → Gap identified

#### Analytics Events
- `performance.analytics_dashboard_requested` → Dashboard data requested
- `performance.talent_matrix_generated` → Talent matrix created

### Workflow Events (consumed from workflow module)
- `workflow.goal_approval_completed` → Approval completed
- `workflow.review_approval_completed` → Approval completed
- `workflow.appraisal_approval_completed` → Approval completed
- `workflow.pip_approval_completed` → Approval completed
- `workflow.salary_increment_approval_completed` → Approval completed

---

## 6. External Service Dependencies

### Required Services
1. **Workflow Service** (`modules/workflow`)
   - Start approval processes
   - Track approval status
   - Handle rejections and re-submissions

2. **Notification Service** (`modules/notifications`)
   - Send notifications
   - Check user preferences
   - Render templates
   - Queue delivery

3. **Audit Service** (`modules/audit`)
   - Log all mutations
   - Track before/after state
   - Record user and timestamp

4. **Payroll Service** (`modules/payroll`)
   - Query employee salary
   - Create adjustments
   - Calculate bonuses
   - Update salary structures

5. **Recruitment Service** (`modules/recruitment`)
   - Track offer acceptance
   - Get candidate details
   - Link to employee records

6. **Employee Service** (`modules/employee`)
   - Get employee details
   - Query organization structure
   - Get designation/department info

### Optional Services
1. **Training/Development Service**
   - Link goals to training plans
   - Recommend courses based on gaps

2. **Learning Management Service**
   - Track competency development
   - Certificate management

---

## 7. Data Flow Diagrams

### Goal Creation and Approval Flow
```
Employee creates goal
    ↓
Goal validation
    ↓
Goal saved (draft status)
    ↓
publish: performance.goal_created
    ↓
Employee submits goal
    ↓
publish: performance.goal_submitted
    ↓
[Workflow Hook] Triggers goal_approval workflow
    ↓
Manager receives notification
    ↓
Manager approves/rejects
    ↓
publish: workflow.goal_approval_completed
    ↓
[Notification Hook] Sends approval notification
    ↓
Goal status → approved/rejected
```

### Performance Review Cycle Flow
```
HR creates review cycle
    ↓
publish: performance.review_cycle_created
    ↓
HR activates cycle
    ↓
publish: performance.review_cycle_activated
    ↓
[Notification Hook] Notifies all employees in cycle
    ↓
Employees/Managers write reviews
    ↓
publish: performance.review_created
    ↓
Review submitted
    ↓
publish: performance.review_submitted
    ↓
[Workflow Hook] Triggers review_approval workflow
    ↓
Manager/HR reviews and approves
    ↓
publish: performance.review_approved
    ↓
HR completes cycle
    ↓
publish: performance.review_cycle_completed
```

### Appraisal to Salary Integration Flow
```
Appraisal finalized with rating
    ↓
publish: performance.appraisal_finalized
    ↓
[Workflow Hook] Triggers appraisal_approval
    ↓
[Payroll Hook] Calculates bonus and increment
    ↓
publish: performance.appraisal_approved
    ↓
[Payroll Hook] Creates salary adjustment
    ↓
publish: payroll.adjustment_required
    ↓
Payroll service processes adjustment
    ↓
Adjustment applied to next payroll
```

### New Hire Onboarding Flow
```
Candidate accepts offer
    ↓
publish: recruitment.offer_accepted
    ↓
[Recruitment Hook] Creates probation goals
    ↓
[Recruitment Hook] Sets up review workflow
    ↓
Employee joins company
    ↓
publish: recruitment.candidate_hired
    ↓
[Recruitment Hook] Assigns competency framework
    ↓
publish: performance.profile_created_for_new_hire
    ↓
Onboarding goals activated
    ↓
Probation period begins (6 months)
    ↓
publish: performance.probation_cycle_to_create
```

---

## 8. Error Handling

### Graceful Degradation
- All integration hooks include try-catch blocks
- Errors logged but don't crash event bus
- Failed integrations allow system to continue
- Retry logic for transient failures

### Notification Failures
- Queued notifications retry 3 times
- Failed notifications logged for manual review
- User preferences respected even on failure
- Email delivery retried every hour

### Workflow Failures
- Failed workflow starts logged
- Manual intervention option provided
- Process can be retried from last checkpoint
- Escalation to admin on repeated failures

### Payroll Integration Failures
- Salary adjustments tracked separately
- Manual review queue for failed adjustments
- Cannot process payroll with pending adjustments
- Audit trail shows adjustment status changes

---

## 9. Configuration

### Environment Variables
```
PERFORMANCE_ENABLE_WORKFLOWS=true
PERFORMANCE_ENABLE_NOTIFICATIONS=true
PERFORMANCE_ENABLE_PAYROLL_INTEGRATION=true
PERFORMANCE_ENABLE_RECRUITMENT_INTEGRATION=true
NOTIFICATION_DEFAULT_CHANNELS=in_app,email
PAYROLL_BONUS_CALCULATION_MODE=automatic
PROBATION_DURATION_MONTHS=6
```

### Permission Codes
All 32 performance permissions defined in `database/seeds/performance_permissions.ts`:
- goal_read, goal_write, goal_approve, goal_delete
- okr_read, okr_write, okr_manage
- review_read, review_write, review_submit, review_approve, review_cycle_write, review_cycle_manage
- feedback_read, feedback_write, feedback_360
- appraisal_read, appraisal_write, appraisal_approve
- competency_read, competency_write, competency_assess
- pip_read, pip_write, pip_review
- succession_read, succession_write
- recognition_read, recognition_write, reward_read, reward_redeem
- analytics_read, talent_matrix_read

---

## 10. Testing Integration Points

### Unit Tests
- Test individual event handlers
- Mock event emissions
- Verify data transformations

### Integration Tests
- Test end-to-end workflows
- Mock external services
- Verify event flow

### E2E Tests
- Full scenario testing
- Multiple role testing
- Multi-tenant verification

See `__tests__/PerformanceService.test.ts` for test patterns.

---

## 11. Monitoring and Observability

### Metrics to Track
- Goal approval cycle time
- Review completion rate
- Appraisal distribution by rating
- Notification delivery success rate
- Workflow completion time
- Payroll adjustment processing time

### Logs
- All event emissions logged with context
- Hook execution logged with duration
- Errors logged with full stack trace
- Audit events tied to user and timestamp

### Alerts
- Failed workflow approval > 2 hours
- Notification delivery failures > 5%
- Payroll adjustment processing delays
- Event bus listener errors

---

## 12. Future Integration Considerations

1. **Training and Development**
   - Link competency gaps to training programs
   - Track course completion
   - Associate certifications

2. **Compensation Review**
   - Integrate with compensation bands
   - Market rate comparisons
   - Equity calculations

3. **Talent Marketplace**
   - Internal job posting for high performers
   - Internal mobility tracking
   - Career pathing

4. **Employee Engagement**
   - Link recognition to eNPS
   - Engagement surveys
   - Pulse surveys

5. **Analytics and Reporting**
   - Performance trend analysis
   - Department comparisons
   - Equity/fairness audits
   - Succession pipeline analysis
