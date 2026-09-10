-- ============================================================
-- Employee Lifecycle Module - Database Schema
-- ============================================================
-- Normalized schema supporting complete employee journey
-- from candidate to alumni with full audit trails
-- ============================================================

-- ============================================================
-- 1. CANDIDATES TABLE
-- ============================================================
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  position_id UUID NOT NULL,

  -- Basic Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),

  -- Candidate Status
  status VARCHAR(50) NOT NULL DEFAULT 'applied', -- applied, shortlisted, interviewed, rejected, offered, hired
  source VARCHAR(50), -- job_portal, referral, walk_in, linkedin, etc.
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Address
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (position_id) REFERENCES job_positions(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_candidates_organization ON candidates(organization_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_deleted_at ON candidates(deleted_at);

-- ============================================================
-- 2. INTERVIEWS TABLE
-- ============================================================
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Interview Details
  round_number INTEGER NOT NULL DEFAULT 1,
  interview_type VARCHAR(50) NOT NULL, -- phone, technical, hr, manager, etc.
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- scheduled, completed, rejected, passed

  -- Schedule
  scheduled_date TIMESTAMP NOT NULL,
  actual_date TIMESTAMP,
  duration_minutes INTEGER,
  location VARCHAR(255),

  -- Interviewer
  interviewer_id UUID NOT NULL,

  -- Feedback & Rating
  feedback TEXT,
  rating INTEGER, -- 1-5 scale
  recommendation VARCHAR(50), -- pass, fail, maybe

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (candidate_id) REFERENCES candidates(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (interviewer_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_interviews_organization ON interviews(organization_id);
CREATE INDEX idx_interviews_status ON interviews(status);

-- ============================================================
-- 3. OFFERS TABLE
-- ============================================================
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Offer Details
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, sent, accepted, rejected, expired

  -- Position Details
  position_id UUID NOT NULL,
  department_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  business_unit_id UUID,

  -- Compensation
  ctc_amount DECIMAL(12, 2) NOT NULL,
  base_salary DECIMAL(12, 2) NOT NULL,
  variable_component DECIMAL(12, 2),
  benefits TEXT,

  -- Dates
  offered_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMP NOT NULL,
  acceptance_date TIMESTAMP,
  rejection_date TIMESTAMP,

  -- Offer Letter
  offer_letter_content TEXT,
  offer_letter_file_url VARCHAR(500),

  -- Approval Workflow
  approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID,
  approved_at TIMESTAMP,

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (candidate_id) REFERENCES candidates(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (position_id) REFERENCES job_positions(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (business_unit_id) REFERENCES business_units(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_offers_candidate ON offers(candidate_id);
CREATE INDEX idx_offers_organization ON offers(organization_id);
CREATE INDEX idx_offers_status ON offers(status);

-- ============================================================
-- 4. PREBOARDING TABLE
-- ============================================================
CREATE TABLE preboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'initiated', -- initiated, in_progress, completed

  -- Dates
  start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completion_date TIMESTAMP,
  joining_date TIMESTAMP NOT NULL,

  -- Assigned Tasks
  task_checklist TEXT[], -- JSON array of tasks
  completion_percentage INTEGER DEFAULT 0,

  -- Documents
  documents_requested TEXT[], -- JSON array
  documents_received BOOLEAN DEFAULT FALSE,

  -- Contact Person (HR)
  assigned_to UUID NOT NULL,

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (candidate_id) REFERENCES candidates(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_preboarding_candidate ON preboarding(candidate_id);
CREATE INDEX idx_preboarding_status ON preboarding(status);

-- ============================================================
-- 5. ONBOARDING TABLE
-- ============================================================
CREATE TABLE onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'initiated', -- initiated, in_progress, completed

  -- Dates
  start_date TIMESTAMP NOT NULL,
  completion_date TIMESTAMP,

  -- Training & Setup
  training_sessions TEXT[], -- JSON array
  equipment_assigned TEXT[], -- JSON array
  system_access_granted BOOLEAN DEFAULT FALSE,

  -- Assigned Mentor/Buddy
  buddy_id UUID,

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (buddy_id) REFERENCES employees(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_onboarding_employee ON onboarding(employee_id);
CREATE INDEX idx_onboarding_status ON onboarding(status);

-- ============================================================
-- 6. PROBATION TABLE
-- ============================================================
CREATE TABLE probation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Probation Period
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  duration_months INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, completed, extended, terminated

  -- Extension (if applicable)
  extended BOOLEAN DEFAULT FALSE,
  extension_months INTEGER,
  extension_reason TEXT,
  extended_until TIMESTAMP,

  -- Probation Review
  review_date TIMESTAMP,
  reviewer_id UUID,
  feedback TEXT,
  performance_rating INTEGER, -- 1-5 scale
  recommendation VARCHAR(50), -- confirm, extend, terminate

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_probation_employee ON probation(employee_id);
CREATE INDEX idx_probation_status ON probation(status);
CREATE INDEX idx_probation_end_date ON probation(end_date);

-- ============================================================
-- 7. CONFIRMATION TABLE
-- ============================================================
CREATE TABLE confirmation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Confirmation Details
  confirmation_date TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed', -- confirmed, rejected

  -- Related Probation
  probation_id UUID NOT NULL,

  -- Confirmation Letter
  letter_content TEXT,
  letter_file_url VARCHAR(500),

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (probation_id) REFERENCES probation(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_confirmation_employee ON confirmation(employee_id);

-- ============================================================
-- 8. PROMOTIONS TABLE
-- ============================================================
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Current & New Position
  from_position_id UUID NOT NULL,
  to_position_id UUID NOT NULL,
  from_designation_id UUID,
  to_designation_id UUID,
  from_department_id UUID,
  to_department_id UUID,

  -- Promotion Details
  promotion_date TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'approved', -- pending, approved, rejected, reverted

  -- Compensation Change
  new_ctc_amount DECIMAL(12, 2),
  new_base_salary DECIMAL(12, 2),
  old_ctc_amount DECIMAL(12, 2),
  old_base_salary DECIMAL(12, 2),

  -- Reason & Justification
  reason TEXT,
  approval_status VARCHAR(50) DEFAULT 'approved',
  approved_by UUID,
  approved_at TIMESTAMP,

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (from_position_id) REFERENCES job_positions(id),
  FOREIGN KEY (to_position_id) REFERENCES job_positions(id),
  FOREIGN KEY (from_department_id) REFERENCES departments(id),
  FOREIGN KEY (to_department_id) REFERENCES departments(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_promotions_employee ON promotions(employee_id);
CREATE INDEX idx_promotions_status ON promotions(status);

-- ============================================================
-- 9. TRANSFERS TABLE
-- ============================================================
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Transfer Details
  from_department_id UUID NOT NULL,
  to_department_id UUID NOT NULL,
  from_branch_id UUID,
  to_branch_id UUID,
  from_business_unit_id UUID,
  to_business_unit_id UUID,

  -- New Reporting Manager
  from_reporting_manager_id UUID,
  to_reporting_manager_id UUID,

  -- Transfer Date
  transfer_date TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'approved', -- pending, approved, rejected

  -- Reason
  reason TEXT,
  transfer_type VARCHAR(50), -- lateral, internal_mobility, relocation

  -- Approval
  approval_status VARCHAR(50) DEFAULT 'approved',
  approved_by UUID,
  approved_at TIMESTAMP,

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (from_department_id) REFERENCES departments(id),
  FOREIGN KEY (to_department_id) REFERENCES departments(id),
  FOREIGN KEY (from_branch_id) REFERENCES branches(id),
  FOREIGN KEY (to_branch_id) REFERENCES branches(id),
  FOREIGN KEY (from_reporting_manager_id) REFERENCES employees(id),
  FOREIGN KEY (to_reporting_manager_id) REFERENCES employees(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_transfers_employee ON transfers(employee_id);
CREATE INDEX idx_transfers_status ON transfers(status);

-- ============================================================
-- 10. ROLE HISTORY TABLE
-- ============================================================
CREATE TABLE role_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Role Change
  from_role_id UUID,
  to_role_id UUID,
  change_date TIMESTAMP NOT NULL,
  reason VARCHAR(255),

  -- Scope Change
  from_scope VARCHAR(255),
  to_scope VARCHAR(255),

  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (from_role_id) REFERENCES roles(id),
  FOREIGN KEY (to_role_id) REFERENCES roles(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_role_history_employee ON role_history(employee_id);

-- ============================================================
-- 11. RESIGNATIONS TABLE
-- ============================================================
CREATE TABLE resignations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Resignation Details
  resignation_date TIMESTAMP NOT NULL,
  last_working_day TIMESTAMP NOT NULL,
  notice_period_days INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted', -- submitted, accepted, rejected, withdrawn

  -- Reason
  reason_for_resignation VARCHAR(500),
  reason_category VARCHAR(50), -- better_opportunity, salary, work_life_balance, relocation, etc.

  -- Communication
  resignation_letter_url VARCHAR(500),
  accepted_by UUID,
  accepted_at TIMESTAMP,

  -- Exit Interview
  exit_interview_conducted BOOLEAN DEFAULT FALSE,
  exit_interview_date TIMESTAMP,
  exit_feedback TEXT,

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (accepted_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_resignations_employee ON resignations(employee_id);
CREATE INDEX idx_resignations_status ON resignations(status);

-- ============================================================
-- 12. EXIT CLEARANCE TABLE
-- ============================================================
CREATE TABLE exit_clearance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resignation_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Clearance Status
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- in_progress, cleared, pending
  clearance_date TIMESTAMP,

  -- Departments to Clear
  finance_cleared BOOLEAN DEFAULT FALSE,
  it_cleared BOOLEAN DEFAULT FALSE,
  operations_cleared BOOLEAN DEFAULT FALSE,
  security_cleared BOOLEAN DEFAULT FALSE,

  -- Assets Return
  equipment_returned BOOLEAN DEFAULT FALSE,
  documents_returned BOOLEAN DEFAULT FALSE,
  access_revoked BOOLEAN DEFAULT FALSE,

  -- Remarks
  remarks TEXT,

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (resignation_id) REFERENCES resignations(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_exit_clearance_employee ON exit_clearance(employee_id);
CREATE INDEX idx_exit_clearance_status ON exit_clearance(status);

-- ============================================================
-- 13. FINAL SETTLEMENT TABLE
-- ============================================================
CREATE TABLE final_settlement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resignation_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Settlement Date
  settlement_date TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processed, paid

  -- Financial Details
  final_salary DECIMAL(12, 2),
  gratuity DECIMAL(12, 2),
  leave_encashment DECIMAL(12, 2),
  bonus DECIMAL(12, 2),
  other_benefits DECIMAL(12, 2),
  deductions DECIMAL(12, 2),
  net_amount DECIMAL(12, 2),

  -- Payment
  payment_mode VARCHAR(50), -- bank_transfer, cheque, etc.
  payment_date TIMESTAMP,
  transaction_id VARCHAR(100),

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (resignation_id) REFERENCES resignations(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_final_settlement_employee ON final_settlement(employee_id);
CREATE INDEX idx_final_settlement_status ON final_settlement(status);

-- ============================================================
-- 14. ALUMNI TABLE
-- ============================================================
CREATE TABLE alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Alumni Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive
  alumni_since TIMESTAMP NOT NULL,

  -- Final Settlement Reference
  final_settlement_id UUID,

  -- Alumni Profile
  current_organization VARCHAR(255),
  current_designation VARCHAR(255),
  linkedin_url VARCHAR(500),
  contact_email VARCHAR(255),

  -- Re-hire Eligibility
  eligible_for_rehire BOOLEAN DEFAULT TRUE,

  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (final_settlement_id) REFERENCES final_settlement(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_alumni_employee ON alumni(employee_id);
CREATE INDEX idx_alumni_status ON alumni(status);

-- ============================================================
-- 15. EMPLOYMENT HISTORY TABLE (Tracks all employment changes)
-- ============================================================
CREATE TABLE employment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Event Type
  event_type VARCHAR(50) NOT NULL, -- joining, promotion, transfer, role_change, resignation, etc.
  event_date TIMESTAMP NOT NULL,

  -- Previous Values
  previous_position_id UUID,
  previous_designation_id UUID,
  previous_department_id UUID,
  previous_branch_id UUID,
  previous_business_unit_id UUID,
  previous_reporting_manager_id UUID,

  -- New Values
  new_position_id UUID,
  new_designation_id UUID,
  new_department_id UUID,
  new_branch_id UUID,
  new_business_unit_id UUID,
  new_reporting_manager_id UUID,

  -- Compensation
  previous_ctc DECIMAL(12, 2),
  new_ctc DECIMAL(12, 2),

  -- Details
  details TEXT,

  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_employment_history_employee ON employment_history(employee_id);
CREATE INDEX idx_employment_history_event_date ON employment_history(event_date);

-- ============================================================
-- 16. LIFECYCLE EVENTS TABLE (For timeline/audit trail)
-- ============================================================
CREATE TABLE lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Event Details
  event_type VARCHAR(100) NOT NULL,
  event_description TEXT NOT NULL,
  event_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Related Entity
  related_entity_type VARCHAR(50), -- offer, interview, promotion, transfer, etc.
  related_entity_id UUID,

  -- Triggered By
  triggered_by UUID,

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (triggered_by) REFERENCES users(id)
);

CREATE INDEX idx_lifecycle_events_employee ON lifecycle_events(employee_id);
CREATE INDEX idx_lifecycle_events_event_date ON lifecycle_events(event_date);

-- ============================================================
-- 17. LIFECYCLE STATE TABLE (Current state machine)
-- ============================================================
CREATE TABLE lifecycle_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Current State
  current_state VARCHAR(50) NOT NULL, -- candidate, offer, preboarding, onboarding, probation, confirmed, active, promotion, transfer, resigned, exited, alumni
  previous_state VARCHAR(50),

  -- State Transition
  state_changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  state_changed_by UUID,

  -- Additional Flags
  is_active BOOLEAN DEFAULT TRUE,
  on_probation BOOLEAN DEFAULT FALSE,
  is_alumni BOOLEAN DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (state_changed_by) REFERENCES users(id)
);

CREATE INDEX idx_lifecycle_state_employee ON lifecycle_state(employee_id);
CREATE INDEX idx_lifecycle_state_current_state ON lifecycle_state(current_state);

-- ============================================================
-- FOREIGN KEY CONSTRAINTS NOTES
-- ============================================================
-- These tables reference core entities that must exist:
-- - organizations: Multi-tenant support
-- - users: System users (HR, managers, approvers)
-- - employees: Core employee table (extends beyond lifecycle)
-- - departments: Organization structure
-- - branches: Location-based organization
-- - business_units: Business unit structure
-- - roles: System roles (Manager, HR, Admin, etc.)
-- - job_positions: Job position catalog
-- ============================================================
