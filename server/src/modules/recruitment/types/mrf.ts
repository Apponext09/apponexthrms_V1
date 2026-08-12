import { z } from 'zod';

// ──────────────────────────────────────────────────────────
// MRF Request schemas
// ──────────────────────────────────────────────────────────

export const createMrfRequestSchema = z.object({
  positionTitle: z.string().min(2).max(255),
  numberOfPositions: z.number().min(1).default(1),
  recruitmentType: z.string().optional().default('Both'),
  companyId: z.number().optional(),
  companyLocationId: z.number().optional(),
  departmentId: z.number().optional(),
  gradeId: z.number().optional(),
  employmentType: z.string().optional(),
  qualificationRequired: z.string().optional(),
  experienceDesired: z.string().optional(),
  interviewerId: z.number().optional(),
  payScaleType: z.string().optional(),
  payScaleForPosition: z.string().optional(),
  reasonForRequirement: z.string().optional(),
  listInJobPage: z.enum(['Yes', 'No']).optional().default('Yes'),
  skills: z.any().optional(),
  comment: z.string().optional(),
  jobDescription: z.string().optional(),
  targetClosureDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

export const updateMrfRequestSchema = createMrfRequestSchema.partial();

export const mrfApprovalSchema = z.object({
  comment: z.string().optional(),
});

export const mrfListQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  mrNumber: z.string().optional(),
  positionTitle: z.string().optional(),
  requestedBy: z.string().optional(),
  status: z.enum(['Open', 'Closed']).optional(),
  departmentId: z.coerce.number().optional(),
  sortBy: z.string().optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ──────────────────────────────────────────────────────────
// MRF Table Settings schemas
// ──────────────────────────────────────────────────────────

export const mrfTableSettingsSchema = z.object({
  configType: z.enum([
    'recruitment_fields',
    'candidate_fields',
    'user_creation_mapping',
    'keywords_map',
  ]),
  settingsJson: z.any(),
});

// ──────────────────────────────────────────────────────────
// Resume Bank schemas
// ──────────────────────────────────────────────────────────

export const createResumeBankEntrySchema = z.object({
  name: z.string().min(2),
  dob: z.string().optional(),
  gender: z.string().optional(),
  email: z.string().email(),
  contactType: z.string().optional(),
  contact: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  country: z.string().optional(),
  zipcode: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  maritalStatus: z.string().optional(),
  company: z.string().optional(),
  qualification: z.string().optional(),
  university: z.string().optional(),
  relevantExp: z.string().optional(),
  totalExp: z.string().optional(),
  skills: z.string().optional(),
  source: z.string().optional(),
  position: z.string().optional(),
  jobId: z.number().optional(),
  mrfRequestId: z.number().optional(),
});

export const shortlistResumeSchema = z.object({
  jobId: z.number().optional(),
  pipelineStageId: z.number().optional(),
});

export const resumeBankListQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
  trackerId: z.string().optional(),
  search: z.string().optional(),
  source: z.string().optional(),
  position: z.string().optional(),
  status: z.string().optional(),
  jobId: z.coerce.number().optional(),
});

// ──────────────────────────────────────────────────────────
// Job Reference (Public) schemas
// ──────────────────────────────────────────────────────────

export const jobReferenceApplySchema = z.object({
  name: z.string().min(2),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  emailId: z.string().email(),
  contactType: z.string().optional(),
  contactNumber: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  country: z.string().optional(),
  zipcode: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  maritalStatus: z.string().optional(),
  currentCompany: z.string().optional(),
  qualification: z.string().optional(),
  university: z.string().optional(),
  relevantExperience: z.string().optional(),
  totalExperience: z.string().optional(),
  skills: z.string().optional(),
  comments: z.string().optional(),
  resumeUrl: z.string().optional(),
  signatureUrl: z.string().optional(),
});

export const jobReferenceReferExistingSchema = z.object({
  candidateId: z.number(),
  referrerName: z.string().optional(),
});

// ──────────────────────────────────────────────────────────
// Type exports
// ──────────────────────────────────────────────────────────

export type CreateMrfRequestInput = z.infer<typeof createMrfRequestSchema>;
export type UpdateMrfRequestInput = z.infer<typeof updateMrfRequestSchema>;
export type MrfApprovalInput = z.infer<typeof mrfApprovalSchema>;
export type MrfListQuery = z.infer<typeof mrfListQuerySchema>;
export type MrfTableSettingsInput = z.infer<typeof mrfTableSettingsSchema>;
export type CreateResumeBankEntryInput = z.infer<typeof createResumeBankEntrySchema>;
export type ShortlistResumeInput = z.infer<typeof shortlistResumeSchema>;
export type ResumeBankListQuery = z.infer<typeof resumeBankListQuerySchema>;
export type JobReferenceApplyInput = z.infer<typeof jobReferenceApplySchema>;
export type JobReferenceReferExistingInput = z.infer<typeof jobReferenceReferExistingSchema>;
