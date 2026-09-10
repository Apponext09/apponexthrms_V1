# Employee Lifecycle Module - Architecture & Implementation Guide

## Overview

The Employee Lifecycle module manages the complete employee journey from candidate to alumni, including:
- Recruitment & Candidate Management
- Interview Process
- Offer Management
- Preboarding & Onboarding
- Probation & Confirmation
- Promotion & Transfer
- Resignation & Exit
- Final Settlement & Alumni

## Database Schema

### Core Tables

1. **candidates** - Candidate information and status
2. **interviews** - Interview tracking and feedback
3. **offers** - Offer letters with approval workflow
4. **preboarding** - Pre-joining activities and checklist
5. **onboarding** - First-day setup and training
6. **probation** - Probation period tracking
7. **confirmation** - Confirmation after probation
8. **promotions** - Promotion tracking with CTC changes
9. **transfers** - Department/location transfers
10. **role_history** - Track all role changes
11. **resignations** - Resignation tracking
12. **exit_clearance** - Exit clearance workflow
13. **final_settlement** - Final settlement calculations
14. **alumni** - Alumni status tracking
15. **employment_history** - Complete employment event log
16. **lifecycle_events** - Timeline events for audit trail
17. **lifecycle_state** - Current state machine

## Backend Services Architecture

### Service Classes

```
LifecycleService
├── State management
├── Lifecycle transitions
├── Timeline/audit tracking
└── Summary dashboards

CandidateService
├── Candidate CRUD
├── Status management
├── Validation
└── Notifications

InterviewService (✓ Implemented - Sprint 1)
├── Interview scheduling
├── Feedback management
├── Rating system (1-5 scale)
├── Interview pipeline
├── Interviewer schedule tracking
└── Interview statistics & analytics

OfferService (to be implemented)
├── Offer creation
├── Offer approvals
├── Offer acceptance/rejection
└── Offer letter generation

PreboardingService (to be implemented)
├── Preboarding checklist
├── Document collection
├── Task tracking
└── Progress monitoring

OnboardingService (to be implemented)
├── Onboarding checklist
├── Training assignment
├── Equipment allocation
└── System access provisioning

ProbationService (to be implemented)
├── Probation period management
├── Review scheduling
├── Performance tracking
└── Confirmation recommendation

PromotionService (to be implemented)
├── Promotion creation
├── CTC management
├── Approval workflow
└── Position change tracking

TransferService (to be implemented)
├── Transfer requests
├── Cross-department/location transfers
├── Reporting manager changes
└── Relocation support

ResignationService (to be implemented)
├── Resignation tracking
├── Notice period management
├── Exit interview
└── Final clearance initiation

ExitClearanceService (to be implemented)
├── Multi-department clearance
├── Asset recovery
├── Access revocation
└── Clearance tracking

FinalSettlementService (to be implemented)
├── Settlement calculations
├── Gratuity & leave encashment
├── Payment processing
└── Settlement validation

AlumniService (to be implemented)
├── Alumni profile management
├── Re-hire eligibility
├── Alumni network
└── Alumni communications
```

## REST API Endpoints

### Candidates
```
POST   /api/v1/lifecycle/candidates                 - Create candidate
GET    /api/v1/lifecycle/candidates/:id             - Get candidate
GET    /api/v1/lifecycle/candidates                 - List candidates
PUT    /api/v1/lifecycle/candidates/:id             - Update candidate
PATCH  /api/v1/lifecycle/candidates/:id/status      - Update status
DELETE /api/v1/lifecycle/candidates/:id             - Delete candidate
```

### Interviews (✓ Implemented - Sprint 1)
```
POST   /api/v1/lifecycle/interviews                      - Schedule interview
GET    /api/v1/lifecycle/interviews/:id                  - Get interview details
GET    /api/v1/lifecycle/interviews                      - List interviews with filters
GET    /api/v1/lifecycle/interviews/candidate/:candidateId - Get candidate interviews
PUT    /api/v1/lifecycle/interviews/:id                  - Update interview details
POST   /api/v1/lifecycle/interviews/:id/feedback         - Submit feedback & rating
PATCH  /api/v1/lifecycle/interviews/:id/status          - Update interview status
DELETE /api/v1/lifecycle/interviews/:id                  - Soft delete interview
GET    /api/v1/lifecycle/interviews/stats/organization   - Get interview statistics
GET    /api/v1/lifecycle/interviews/schedule/:interviewerId - Get interviewer schedule
```

### Offers
```
POST   /api/v1/lifecycle/offers                     - Create offer
GET    /api/v1/lifecycle/offers/:id                 - Get offer
GET    /api/v1/lifecycle/candidates/:id/offers      - Get candidate's offer
PUT    /api/v1/lifecycle/offers/:id                 - Update offer
PATCH  /api/v1/lifecycle/offers/:id/status          - Update offer status
POST   /api/v1/lifecycle/offers/:id/approve         - Approve offer
POST   /api/v1/lifecycle/offers/:id/accept          - Candidate accept offer
POST   /api/v1/lifecycle/offers/:id/reject          - Candidate reject offer
```

### Preboarding
```
POST   /api/v1/lifecycle/preboarding                - Start preboarding
GET    /api/v1/lifecycle/preboarding/:id            - Get preboarding status
PUT    /api/v1/lifecycle/preboarding/:id            - Update checklist
PATCH  /api/v1/lifecycle/preboarding/:id/complete   - Mark complete
```

### Onboarding
```
POST   /api/v1/lifecycle/onboarding                 - Create onboarding
GET    /api/v1/lifecycle/onboarding/:id             - Get onboarding status
PUT    /api/v1/lifecycle/onboarding/:id             - Update training/equipment
PATCH  /api/v1/lifecycle/onboarding/:id/complete    - Mark complete
```

### Probation
```
POST   /api/v1/lifecycle/probation                  - Start probation
GET    /api/v1/lifecycle/probation/:id              - Get probation details
PUT    /api/v1/lifecycle/probation/:id              - Update probation
PATCH  /api/v1/lifecycle/probation/:id/review       - Submit review
PATCH  /api/v1/lifecycle/probation/:id/extend       - Extend probation
PATCH  /api/v1/lifecycle/probation/:id/confirm      - Confirm employee
```

### Promotions
```
POST   /api/v1/lifecycle/promotions                 - Create promotion
GET    /api/v1/lifecycle/promotions/:id             - Get promotion
GET    /api/v1/lifecycle/employees/:id/promotions   - List promotions
PATCH  /api/v1/lifecycle/promotions/:id/approve     - Approve promotion
PATCH  /api/v1/lifecycle/promotions/:id/reject      - Reject promotion
```

### Transfers
```
POST   /api/v1/lifecycle/transfers                  - Create transfer
GET    /api/v1/lifecycle/transfers/:id              - Get transfer
GET    /api/v1/lifecycle/employees/:id/transfers    - List transfers
PATCH  /api/v1/lifecycle/transfers/:id/approve      - Approve transfer
```

### Resignations
```
POST   /api/v1/lifecycle/resignations               - Submit resignation
GET    /api/v1/lifecycle/resignations/:id           - Get resignation
GET    /api/v1/lifecycle/employees/:id/resignation  - Get employee resignation
PUT    /api/v1/lifecycle/resignations/:id           - Update resignation
PATCH  /api/v1/lifecycle/resignations/:id/accept    - Accept resignation
PATCH  /api/v1/lifecycle/resignations/:id/exit-interview - Record exit interview
```

### Exit Clearance
```
POST   /api/v1/lifecycle/exit-clearance             - Start clearance
GET    /api/v1/lifecycle/exit-clearance/:id         - Get clearance status
PATCH  /api/v1/lifecycle/exit-clearance/:id/department - Update department clearance
PATCH  /api/v1/lifecycle/exit-clearance/:id/complete    - Complete clearance
```

### Final Settlement
```
POST   /api/v1/lifecycle/settlement                 - Create settlement
GET    /api/v1/lifecycle/settlement/:id             - Get settlement
PUT    /api/v1/lifecycle/settlement/:id             - Update settlement
PATCH  /api/v1/lifecycle/settlement/:id/process     - Process settlement
PATCH  /api/v1/lifecycle/settlement/:id/pay         - Mark as paid
```

### Alumni
```
POST   /api/v1/lifecycle/alumni                     - Create alumni record
GET    /api/v1/lifecycle/alumni/:id                 - Get alumni info
PUT    /api/v1/lifecycle/alumni/:id                 - Update alumni profile
GET    /api/v1/lifecycle/alumni                     - List alumni
```

### Lifecycle Management
```
GET    /api/v1/lifecycle/employees/:id/state        - Get current lifecycle state
GET    /api/v1/lifecycle/employees/:id/timeline     - Get lifecycle timeline
GET    /api/v1/lifecycle/employees/:id/history      - Get employment history
GET    /api/v1/lifecycle/summary                    - Get lifecycle summary
```

## Interview Management - Sprint 1 Implementation

### Features Implemented
- **Interview Scheduling**: Create and schedule interviews by type (phone, technical, HR, manager, final)
- **Feedback Management**: Submit structured feedback with ratings (1-5) and recommendations (pass/fail/maybe)
- **Round Tracking**: Support for multiple interview rounds per candidate
- **Interviewer Scheduling**: Track interviewer availability and schedule
- **Interview Statistics**: Aggregate metrics on pass rates, ratings, interview volumes
- **Status Management**: Track interview lifecycle (scheduled, completed, cancelled, rescheduled)
- **Audit Logging**: Complete audit trail of all interview operations
- **Notifications**: Automatic notifications on scheduling, feedback submission, status changes

### Database Schema - Interviews Table
```sql
CREATE TABLE interviews (
  id UUID PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES candidates(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  interview_type VARCHAR(50) NOT NULL, -- phone, technical, hr, manager, final
  scheduled_date TIMESTAMP NOT NULL,
  actual_date TIMESTAMP,
  location VARCHAR(255),
  interviewer_id UUID REFERENCES users(id),
  round_number INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, rejected, passed
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  recommendation VARCHAR(20), -- pass, fail, maybe
  duration_minutes INTEGER,
  notes TEXT,
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_interviews_organization ON interviews(organization_id);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_interviews_scheduled_date ON interviews(scheduled_date);
CREATE INDEX idx_interviews_interviewer ON interviews(interviewer_id);
```

### InterviewService Class Methods
```typescript
class InterviewService {
  // Create and schedule interview
  createInterview(input: CreateInterviewInput): Promise<Interview>
  
  // Retrieve interview
  getInterviewById(interviewId: string, organizationId: string): Promise<Interview>
  
  // Get all interviews for candidate
  getInterviewsByCandidate(candidateId: string, organizationId: string): Promise<Interview[]>
  
  // List interviews with filters and pagination
  listInterviews(organizationId: string, filters?: ListFilters): Promise<PaginatedResult>
  
  // Update interview details (before completion)
  updateInterview(interviewId: string, organizationId: string, input: UpdateInterviewInput): Promise<Interview>
  
  // Submit feedback and rating after interview
  submitFeedback(interviewId: string, organizationId: string, input: SubmitFeedbackInput): Promise<Interview>
  
  // Update interview status
  updateInterviewStatus(interviewId: string, organizationId: string, input: UpdateStatusInput): Promise<Interview>
  
  // Get interview statistics for dashboard
  getInterviewStats(organizationId: string): Promise<InterviewStats>
  
  // Get interviewer's schedule for date range
  getInterviewerSchedule(interviewerId: string, organizationId: string, startDate: Date, endDate: Date): Promise<Interview[]>
  
  // Soft delete interview
  deleteInterview(interviewId: string, organizationId: string, userId: string): Promise<void>
}
```

### RBAC Permissions - Interview Operations
- `lifecycle:interview:create` - Schedule new interviews (HR Manager, Org Admin)
- `lifecycle:interview:read` - View interview details (HR Manager, Hiring Team)
- `lifecycle:interview:update` - Reschedule/cancel interviews (HR Manager)
- `lifecycle:interview:submit_feedback` - Submit feedback (Interviewers, HR Manager)

### Validation Rules
- Interview type must be valid (phone, technical, hr, manager, final)
- Scheduled date must be in the future
- Round number must be >= 1
- Rating must be between 1-5
- Feedback must be 10-5000 characters
- Recommendation must be pass/fail/maybe
- Candidate must exist and be active
- Interviewer must be valid user in organization

### Audit Events Logged
- `INTERVIEW_SCHEDULED` - Interview created
- `INTERVIEW_COMPLETED` - Feedback submitted, status = completed
- `INTERVIEW_FEEDBACK_SUBMITTED` - Rating and recommendation recorded
- `INTERVIEW_STATUS_CHANGED` - Status update (cancelled, rescheduled)

### Frontend Components - Interview Management
```
InterviewSchedulerPage (Main interview management page)
├── InterviewScheduleForm (Create/schedule interview form)
├── InterviewFeedbackForm (Submit feedback form)
├── Interview list with status tabs
├── Interview metrics cards
└── Interviewer schedule view

Interview Types Supported:
- Phone Screening (initial screening)
- Technical Round (technical assessment)
- HR Round (HR discussion)
- Manager Round (manager interview)
- Final Round (executive/final approval)
```

### API Response Examples
```json
// Create Interview (201 Created)
{
  "success": true,
  "data": {
    "id": "int-12345",
    "candidateId": "cand-98765",
    "interviewType": "technical",
    "scheduledDate": "2024-01-20T10:00:00Z",
    "location": "Conference Room A",
    "interviewerId": "user-54321",
    "roundNumber": 2,
    "status": "scheduled",
    "createdAt": "2024-01-18T14:30:00Z"
  },
  "message": "Interview created successfully"
}

// Submit Feedback (200 OK)
{
  "success": true,
  "data": {
    "id": "int-12345",
    "status": "completed",
    "rating": 4,
    "recommendation": "pass",
    "feedback": "Strong technical skills, good problem-solving approach",
    "actualDate": "2024-01-20T10:30:00Z",
    "updatedAt": "2024-01-20T11:00:00Z"
  },
  "message": "Feedback submitted successfully"
}

// Get Interview Stats (200 OK)
{
  "success": true,
  "data": {
    "total": "45",
    "scheduled": "12",
    "completed": "33",
    "positive_feedback": "28",
    "avg_rating": "3.9"
  }
}
```

## Frontend Components

### Pages
- `/lifecycle` - Dashboard with summary
- `/lifecycle/candidates` - Candidate management
- `/lifecycle/candidates/:id` - Candidate detail & timeline
- `/lifecycle/interviews` - Interview management
- `/lifecycle/offers` - Offer management
- `/lifecycle/employees/:id/lifecycle` - Employee lifecycle view
- `/lifecycle/employees/:id/onboarding` - Onboarding checklist
- `/lifecycle/employees/:id/probation` - Probation tracking
- `/lifecycle/promotions` - Promotion management
- `/lifecycle/transfers` - Transfer management
- `/lifecycle/resignations` - Resignation management
- `/lifecycle/exit` - Exit clearance
- `/lifecycle/settlement` - Final settlement
- `/lifecycle/alumni` - Alumni management

### Components
- CandidateList - Kanban view of candidates by status
- InterviewScheduler - Calendar-based interview scheduling
- OfferBuilder - WYSIWYG offer letter editor
- ChecklistComponent - Reusable checklist UI
- TimelineComponent - Visual lifecycle timeline
- ApprovalFlow - Approval workflow UI
- StateTransitionDialog - State change confirmation

## RBAC Matrix

| Role | Candidates | Interviews | Offers | Preboarding | Onboarding | Probation | Promotions | Transfers | Resignations | Exit Clearance | Settlement | Alumni |
|------|-----------|-----------|--------|-------------|-----------|----------|-----------|----------|--------------|----------------|-----------|--------|
| Super Admin | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full |
| Org Admin | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full |
| HR Manager | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full | Full |
| Department Head | Read | Read | Read | Read | Read | Read | View Own | View Own | View Own | View Own | View Own | Read |
| Manager | View | View | View | View | View | View | View | View | View | View | View | View |
| Employee | None | None | Apply | View Own | View Own | View Own | None | None | Own Resign | View | View Own | View |

## Workflow Diagrams

### Recruitment to Employment
```
Candidate Created
    ↓
Interview Scheduled
    ↓
Interview Completed (Pass/Fail)
    ↓
Offer Created
    ↓
Offer Approved (HR Manager)
    ↓
Offer Sent to Candidate
    ↓
Candidate Accepts Offer
    ↓
Preboarding Initiated
    ↓
Preboarding Completed
    ↓
Onboarding Initiated
    ↓
Onboarding Completed
    ↓
Employee Created
    ↓
Probation Started
    ↓
Probation Review
    ↓
Confirmation
    ↓
Employee Active
```

### Employee Transitions
```
Employee Active
    ├→ Promotion Requested
    │   ├→ Approved → New Position
    │   └→ Rejected → Active (no change)
    │
    ├→ Transfer Requested
    │   ├→ Approved → New Department
    │   └→ Rejected → Active (no change)
    │
    ├→ Role Change
    │   → New Role with Updated Permissions
    │
    └→ Resignation Submitted
        ├→ Notice Period Started
        ├→ Exit Clearance Started
        │   ├→ Finance Clearance
        │   ├→ IT Clearance
        │   ├→ Operations Clearance
        │   └→ Security Clearance
        ├→ Final Settlement Created
        ├→ Settlement Processed
        ├→ Settlement Paid
        └→ Alumni Record Created
```

## Notifications Triggered

### Candidates
- `candidate.created` - New candidate added
- `candidate.status_changed` - Status updated
- `candidate.interview_scheduled` - Interview scheduled
- `candidate.interview_completed` - Interview feedback given
- `candidate.offer_sent` - Offer sent to candidate

### Offers
- `offer.created` - Offer created
- `offer.pending_approval` - Awaiting HR approval
- `offer.approved` - Offer approved
- `offer.sent_to_candidate` - Candidate notified
- `offer.accepted` - Candidate accepted
- `offer.rejected` - Candidate rejected

### Employees
- `employee.probation_started` - Probation begins
- `employee.probation_ending_soon` - 2 weeks before end
- `employee.confirmation_pending` - Review due
- `employee.confirmed` - Confirmed to permanent
- `employee.promoted` - Promotion effective
- `employee.transferred` - Transfer effective
- `employee.resignation_accepted` - Resignation accepted
- `employee.exit_clearance_pending` - Clearance started
- `employee.settlement_processed` - Settlement processed

## Testing Checklist

### Unit Tests
- [x] Candidate CRUD operations
- [x] Email validation and uniqueness
- [x] State transitions validation
- [x] Interview scheduling and feedback (Sprint 1)
- [x] Interview validation rules (Sprint 1)
- [x] Interview rating validation (Sprint 1)
- [ ] Offer approval workflow
- [ ] Probation period calculations
- [ ] Settlement calculations

### Integration Tests
- [ ] Candidate to Interview to Offer flow
- [ ] Offer approval notifications
- [ ] Probation to Confirmation transition
- [ ] Resignation to Exit workflow
- [ ] Settlement payment processing
- [ ] Multi-step approvals

### API Tests
- [ ] All endpoints for 200/400/401/403/404 responses
- [ ] Pagination and filtering
- [ ] Bulk operations
- [ ] Data scoping (org/branch/dept)

### UI Tests
- [ ] Candidate Kanban board
- [ ] Offer builder WYSIWYG
- [ ] Preboarding checklist
- [ ] Timeline visualization
- [ ] Approval workflows
- [ ] Mobile responsiveness

### Security Tests
- [ ] RBAC enforcement on all endpoints
- [ ] Data scoping by organization/branch
- [ ] Soft deletes respected
- [ ] Audit logs created
- [ ] No SQL injection
- [ ] No privilege escalation

## Performance Considerations

### Database
- Indexes on: organization_id, employee_id, status, event_date
- Pagination for large lists (default 50, max 500)
- Read replicas for analytics queries

### Backend
- Cache lifecycle states (5 min TTL)
- Batch notification processing
- Async email sending via queue

### Frontend
- Lazy load timeline events
- Virtual scrolling for large lists
- Debounce search inputs

## Known Limitations & Future Work

### Phase 2 Enhancements
- [ ] Advanced analytics & reports
- [ ] Custom workflow rules
- [ ] Offer letter templates
- [ ] E-signature integration
- [ ] Background check integration
- [ ] Document management integration
- [ ] Bulk candidate import
- [ ] Candidate scoring/ranking

### Integration Points (Phase 3)
- Background check vendors
- E-signature services
- Document management systems
- Employee handbook systems
- Learning management systems
- Payroll systems

## Development Guidelines

### Code Style
- Use TypeScript with strict mode
- Include JSDoc comments for public methods
- Follow naming conventions (camelCase)
- Use async/await for database operations

### Error Handling
- Use custom AppError and ValidationError classes
- Include proper HTTP status codes
- Log errors with context

### Audit Trail
- Log all CRUD operations
- Track state transitions
- Record user actions
- Include metadata where relevant

### Testing
- Minimum 80% code coverage
- Test both happy path and error cases
- Use fixtures for test data
- Clean up after each test

## Deployment Checklist

- [ ] Database migrations executed
- [ ] API endpoints tested
- [ ] Frontend pages deployed
- [ ] RBAC matrix enforced
- [ ] Notifications configured
- [ ] Audit logs enabled
- [ ] Performance tested
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Training completed
