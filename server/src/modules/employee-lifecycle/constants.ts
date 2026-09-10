// ============================================================
// Employee Lifecycle Module - Constants & Enums
// ============================================================

export const LIFECYCLE_STATES = {
  CANDIDATE: 'candidate',
  INTERVIEW: 'interview',
  OFFER: 'offer',
  PREBOARDING: 'preboarding',
  ONBOARDING: 'onboarding',
  PROBATION: 'probation',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  PROMOTION: 'promotion',
  TRANSFER: 'transfer',
  RESIGNED: 'resigned',
  EXIT: 'exit',
  ALUMNI: 'alumni',
} as const;

export const STATE_TRANSITIONS: Record<string, string[]> = {
  [LIFECYCLE_STATES.CANDIDATE]: [LIFECYCLE_STATES.INTERVIEW, LIFECYCLE_STATES.OFFER],
  [LIFECYCLE_STATES.INTERVIEW]: [LIFECYCLE_STATES.OFFER, LIFECYCLE_STATES.CANDIDATE],
  [LIFECYCLE_STATES.OFFER]: [LIFECYCLE_STATES.PREBOARDING, LIFECYCLE_STATES.CANDIDATE],
  [LIFECYCLE_STATES.PREBOARDING]: [LIFECYCLE_STATES.ONBOARDING],
  [LIFECYCLE_STATES.ONBOARDING]: [LIFECYCLE_STATES.PROBATION],
  [LIFECYCLE_STATES.PROBATION]: [LIFECYCLE_STATES.CONFIRMED, LIFECYCLE_STATES.EXIT],
  [LIFECYCLE_STATES.CONFIRMED]: [LIFECYCLE_STATES.ACTIVE],
  [LIFECYCLE_STATES.ACTIVE]: [
    LIFECYCLE_STATES.PROMOTION,
    LIFECYCLE_STATES.TRANSFER,
    LIFECYCLE_STATES.RESIGNED,
  ],
  [LIFECYCLE_STATES.PROMOTION]: [LIFECYCLE_STATES.ACTIVE],
  [LIFECYCLE_STATES.TRANSFER]: [LIFECYCLE_STATES.ACTIVE],
  [LIFECYCLE_STATES.RESIGNED]: [LIFECYCLE_STATES.EXIT],
  [LIFECYCLE_STATES.EXIT]: [LIFECYCLE_STATES.ALUMNI],
  [LIFECYCLE_STATES.ALUMNI]: [],
};

export const CANDIDATE_STATUSES = {
  APPLIED: 'applied',
  SHORTLISTED: 'shortlisted',
  INTERVIEWED: 'interviewed',
  REJECTED: 'rejected',
  OFFERED: 'offered',
  HIRED: 'hired',
} as const;

export const INTERVIEW_TYPES = {
  PHONE_SCREEN: 'phone_screen',
  TECHNICAL: 'technical',
  HR: 'hr',
  MANAGER: 'manager',
  FINAL: 'final',
} as const;

export const INTERVIEW_STATUSES = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const OFFER_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export const OFFER_APPROVAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const PROBATION_STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXTENDED: 'extended',
  TERMINATED: 'terminated',
} as const;

export const RESIGNATION_STATUSES = {
  SUBMITTED: 'submitted',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

export const EXIT_CLEARANCE_STATUSES = {
  IN_PROGRESS: 'in_progress',
  CLEARED: 'cleared',
  PENDING: 'pending',
} as const;

export const SETTLEMENT_STATUSES = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  PAID: 'paid',
} as const;

export const TRANSFER_TYPES = {
  LATERAL: 'lateral',
  INTERNAL_MOBILITY: 'internal_mobility',
  RELOCATION: 'relocation',
} as const;

export const RESIGNATION_REASONS = {
  BETTER_OPPORTUNITY: 'better_opportunity',
  SALARY: 'salary',
  WORK_LIFE_BALANCE: 'work_life_balance',
  RELOCATION: 'relocation',
  FAMILY_REASONS: 'family_reasons',
  FURTHER_STUDIES: 'further_studies',
  HEALTH_REASONS: 'health_reasons',
  OTHER: 'other',
} as const;

export const CLEARANCE_DEPARTMENTS = {
  FINANCE: 'finance',
  IT: 'it',
  OPERATIONS: 'operations',
  SECURITY: 'security',
} as const;

export const LIFECYCLE_EVENTS = {
  CANDIDATE_CREATED: 'CANDIDATE_CREATED',
  CANDIDATE_STATUS_CHANGED: 'CANDIDATE_STATUS_CHANGED',
  INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
  INTERVIEW_COMPLETED: 'INTERVIEW_COMPLETED',
  OFFER_CREATED: 'OFFER_CREATED',
  OFFER_APPROVED: 'OFFER_APPROVED',
  OFFER_SENT: 'OFFER_SENT',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  OFFER_REJECTED: 'OFFER_REJECTED',
  PREBOARDING_STARTED: 'PREBOARDING_STARTED',
  PREBOARDING_COMPLETED: 'PREBOARDING_COMPLETED',
  ONBOARDING_STARTED: 'ONBOARDING_STARTED',
  ONBOARDING_COMPLETED: 'ONBOARDING_COMPLETED',
  PROBATION_STARTED: 'PROBATION_STARTED',
  PROBATION_REVIEW_SUBMITTED: 'PROBATION_REVIEW_SUBMITTED',
  PROBATION_EXTENDED: 'PROBATION_EXTENDED',
  CONFIRMATION_COMPLETED: 'CONFIRMATION_COMPLETED',
  PROMOTION_INITIATED: 'PROMOTION_INITIATED',
  PROMOTION_APPROVED: 'PROMOTION_APPROVED',
  TRANSFER_INITIATED: 'TRANSFER_INITIATED',
  TRANSFER_APPROVED: 'TRANSFER_APPROVED',
  RESIGNATION_SUBMITTED: 'RESIGNATION_SUBMITTED',
  RESIGNATION_ACCEPTED: 'RESIGNATION_ACCEPTED',
  EXIT_INTERVIEW_CONDUCTED: 'EXIT_INTERVIEW_CONDUCTED',
  CLEARANCE_STARTED: 'CLEARANCE_STARTED',
  CLEARANCE_COMPLETED: 'CLEARANCE_COMPLETED',
  SETTLEMENT_CREATED: 'SETTLEMENT_CREATED',
  SETTLEMENT_PROCESSED: 'SETTLEMENT_PROCESSED',
  SETTLEMENT_PAID: 'SETTLEMENT_PAID',
  ALUMNI_CREATED: 'ALUMNI_CREATED',
} as const;

export const NOTIFICATION_TYPES = {
  CANDIDATE_CREATED: 'lifecycle.candidate.created',
  CANDIDATE_STATUS_CHANGED: 'lifecycle.candidate.status_changed',
  INTERVIEW_SCHEDULED: 'lifecycle.interview.scheduled',
  OFFER_PENDING_APPROVAL: 'lifecycle.offer.pending_approval',
  OFFER_APPROVED: 'lifecycle.offer.approved',
  OFFER_SENT: 'lifecycle.offer.sent',
  OFFER_ACCEPTED: 'lifecycle.offer.accepted',
  PROBATION_ENDING: 'lifecycle.probation.ending',
  RESIGNATION_ACCEPTED: 'lifecycle.resignation.accepted',
  CLEARANCE_PENDING: 'lifecycle.clearance.pending',
  SETTLEMENT_PROCESSED: 'lifecycle.settlement.processed',
} as const;

export const APPROVAL_WORKFLOW_TYPES = {
  OFFER_APPROVAL: 'offer',
  PROMOTION_APPROVAL: 'promotion',
  TRANSFER_APPROVAL: 'transfer',
  RESIGNATION_ACCEPTANCE: 'resignation',
} as const;

export const RBAC_PERMISSIONS = {
  CANDIDATE_CREATE: 'lifecycle:candidate:create',
  CANDIDATE_READ: 'lifecycle:candidate:read',
  CANDIDATE_UPDATE: 'lifecycle:candidate:update',
  CANDIDATE_DELETE: 'lifecycle:candidate:delete',

  INTERVIEW_CREATE: 'lifecycle:interview:create',
  INTERVIEW_READ: 'lifecycle:interview:read',
  INTERVIEW_UPDATE: 'lifecycle:interview:update',
  INTERVIEW_SUBMIT_FEEDBACK: 'lifecycle:interview:submit_feedback',

  OFFER_CREATE: 'lifecycle:offer:create',
  OFFER_READ: 'lifecycle:offer:read',
  OFFER_UPDATE: 'lifecycle:offer:update',
  OFFER_APPROVE: 'lifecycle:offer:approve',
  OFFER_SEND: 'lifecycle:offer:send',

  PREBOARDING_MANAGE: 'lifecycle:preboarding:manage',
  ONBOARDING_MANAGE: 'lifecycle:onboarding:manage',

  PROBATION_MANAGE: 'lifecycle:probation:manage',
  PROBATION_REVIEW: 'lifecycle:probation:review',

  PROMOTION_CREATE: 'lifecycle:promotion:create',
  PROMOTION_APPROVE: 'lifecycle:promotion:approve',

  TRANSFER_CREATE: 'lifecycle:transfer:create',
  TRANSFER_APPROVE: 'lifecycle:transfer:approve',

  RESIGNATION_SUBMIT: 'lifecycle:resignation:submit',
  RESIGNATION_ACCEPT: 'lifecycle:resignation:accept',

  CLEARANCE_MANAGE: 'lifecycle:clearance:manage',
  SETTLEMENT_MANAGE: 'lifecycle:settlement:manage',

  ALUMNI_MANAGE: 'lifecycle:alumni:manage',
  LIFECYCLE_DASHBOARD: 'lifecycle:dashboard:read',
} as const;

export const DEFAULT_PROBATION_PERIOD_DAYS = 90;
export const DEFAULT_NOTICE_PERIOD_DAYS = 30;
export const OFFER_VALIDITY_DAYS = 7;

export const LIFECYCLE_VALIDATION_RULES = {
  MIN_FIRST_NAME_LENGTH: 2,
  MAX_FIRST_NAME_LENGTH: 100,
  MIN_LAST_NAME_LENGTH: 2,
  MAX_LAST_NAME_LENGTH: 100,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\d\s\-\+\(\)]+$/,
} as const;
