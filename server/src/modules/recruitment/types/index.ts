import { z } from 'zod';

// Job schemas
export const createJobSchema = z.object({
  mrfRequestId: z.number().optional(),
  jobCode: z.string().min(1).max(50),
  jobTitle: z.string().min(1).max(255),
  jobDescription: z.string().min(1),
  departmentId: z.number().optional(),
  designationId: z.number().optional(),
  locationId: z.number().optional(),
  jobType: z.string().default('full_time'),
  experienceLevel: z.string().default('mid'),
  minExperienceYears: z.number().optional(),
  maxExperienceYears: z.number().optional(),
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
  currency: z.string().optional().default('INR'),
  employmentType: z.enum(['onsite', 'remote', 'hybrid']).default('onsite'),
  noOfPositions: z.number().min(1).default(1),
  expiryDate: z.string().optional(),
  jobTemplateId: z.number().optional(),
  isInternal: z.boolean().optional(),
  isPublishedExternal: z.boolean().optional(),
  skills: z.any().optional(),
  locations: z.any().optional(),
  aiSettings: z.any().optional(),
});

export const updateJobSchema = createJobSchema.partial();

// Candidate schemas
export const createCandidateSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  alternativePhone: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  qualification: z.string().optional(),
  skills: z.string().optional(),
  dateOfBirth: z.string().optional(),
  currentLocation: z.number().optional(),
  preferredLocation: z.number().optional(),
  currentSalary: z.number().optional(),
  salaryCurrency: z.string().optional(),
  expectedSalary: z.number().optional(),
  noticePeriodDays: z.number().optional(),
  currentCompany: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  linkedinUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  portfolioUrl: z.string().url().optional(),
  source: z.enum(['job_board', 'employee_referral', 'direct_apply', 'recruitment_agency']),
  resumeUrl: z.string().optional(),
});

export const updateCandidateSchema = createCandidateSchema.partial();

// Application schemas
export const createApplicationSchema = z.object({
  candidateId: z.number(),
  jobId: z.number(),
  appliedFromSource: z.string().optional().default('Candidate Management'),
});

export const moveApplicationStageSchema = z.object({
  stageId: z.number(),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const assignRecruiterSchema = z.object({
  assignedRecruiterId: z.number().nullable(),
});

// Interview schemas
export const scheduleInterviewSchema = z.object({
  applicationId: z.union([z.number(), z.string()]).transform(val => Number(val)),
  interviewType: z.string().optional().default('video'),
  interviewRound: z.union([z.number(), z.string()]).transform(val => Number(val) || 1).optional().default(1),
  scheduledDate: z.string(),
  durationMinutes: z.union([z.number(), z.string()]).transform(val => Number(val) || 30).optional().default(30),
  meetingUrl: z.string().optional().nullable(),
  interviewerIds: z.array(z.union([z.number(), z.string()])).optional().default([]),
  templateId: z.union([z.number(), z.string()]).transform(val => Number(val)).optional().nullable(),
  customSubject: z.string().optional().nullable(),
  customCandidateBody: z.string().optional().nullable(),
  customInterviewerBody: z.string().optional().nullable(),
  sendEmails: z.boolean().optional().default(true),
});

export const submitFeedbackSchema = z.object({
  interviewId: z.number(),
  overallRating: z.number().min(1).max(5),
  technicalRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
  culturalFitRating: z.number().min(1).max(5).optional(),
  feedbackText: z.string().optional(),
  wouldRecommend: z.boolean().optional(),
});

// Assessment schemas
export const createAssessmentSchema = z.object({
  assessmentName: z.string().min(3).max(255),
  assessmentType: z.enum(['coding', 'mcq', 'assignment', 'form']),
  durationMinutes: z.number().min(5).max(1440),
  passingScore: z.number().min(0).max(100),
  description: z.string().optional(),
  departmentId: z.number().optional().nullable(),
  designationId: z.number().optional().nullable(),
});

export const assignAssessmentSchema = z.object({
  applicationId: z.number(),
  assessmentId: z.number(),
});

export const submitAssessmentResultSchema = z.object({
  attemptId: z.number(),
  answers: z.array(z.object({
    questionNumber: z.number(),
    answerText: z.string(),
    isCorrect: z.boolean(),
    score: z.number().optional(),
  })),
});

// Offer schemas
export const generateOfferSchema = z.object({
  applicationId: z.number(),
  positionTitle: z.string().min(1).max(255),
  departmentId: z.number().optional(),
  designationId: z.number().optional(),
  costToCompany: z.number().min(0),
  baseSalary: z.number().min(0),
  currency: z.string().min(1).max(5),
  offerStartDate: z.string().min(1),
  offerExpiryDate: z.string().min(1),
  meta: z.any().optional(),
});

// Requisition schemas
export const createRequisitionSchema = z.object({
  requisitionCode: z.string().min(3).max(50),
  positionTitle: z.string().min(3).max(255),
  departmentId: z.number().optional(),
  headcountCount: z.number().min(1),
  requisitionType: z.enum(['new_position', 'replacement_hiring']),
  budgetAllocated: z.number().optional(),
  hiringJustification: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

// Referral schemas
export const createReferralSchema = z.object({
  employeeId: z.number(),
  candidateId: z.number(),
  referralRewardAmount: z.number().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type MoveApplicationStageInput = z.infer<typeof moveApplicationStageSchema>;
export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type AssignAssessmentInput = z.infer<typeof assignAssessmentSchema>;
export type SubmitAssessmentResultInput = z.infer<typeof submitAssessmentResultSchema>;
export type GenerateOfferInput = z.infer<typeof generateOfferSchema>;
export type CreateRequisitionInput = z.infer<typeof createRequisitionSchema>;
export type CreateReferralInput = z.infer<typeof createReferralSchema>;
export type AssignRecruiterInput = z.infer<typeof assignRecruiterSchema>;
