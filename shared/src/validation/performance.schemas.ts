import { z } from 'zod';

// Goal Schemas
export const goalCreateSchema = z.object({
  employeeId: z.number().int(),
  goalTemplateId: z.number().int().nullable().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().min(1).max(100),
  startDate: z.string().date(),
  endDate: z.string().date(),
  targetValue: z.number().nullable().optional(),
  weight: z.number().min(0).max(100).default(1),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
});

export const goalUpdateSchema = goalCreateSchema.partial();
export type GoalCreate = z.infer<typeof goalCreateSchema>;
export type GoalUpdate = z.infer<typeof goalUpdateSchema>;

// Goal Progress Schemas
export const goalProgressCreateSchema = z.object({
  goalId: z.number().int(),
  progressValue: z.number().min(0).max(100),
  notes: z.string().max(1000).nullable().optional(),
});

export type GoalProgressCreate = z.infer<typeof goalProgressCreateSchema>;

// OKR Schemas
export const okrCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  alignedToGoalId: z.number().int().nullable().optional(),
  ownerId: z.number().int(),
  status: z.enum(['planning', 'active', 'completed', 'abandoned']).default('planning'),
  startDate: z.string().date(),
  endDate: z.string().date(),
});

export const okrUpdateSchema = okrCreateSchema.partial();
export type OKRCreate = z.infer<typeof okrCreateSchema>;
export type OKRUpdate = z.infer<typeof okrUpdateSchema>;

// OKR Key Result Schemas
export const okrKeyResultCreateSchema = z.object({
  okrId: z.number().int(),
  description: z.string().min(1).max(500),
  targetValue: z.number().min(0),
  currentValue: z.number().min(0).default(0),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
  weight: z.number().min(0).max(100).default(1),
});

export const okrKeyResultUpdateSchema = okrKeyResultCreateSchema.partial();
export type OKRKeyResultCreate = z.infer<typeof okrKeyResultCreateSchema>;
export type OKRKeyResultUpdate = z.infer<typeof okrKeyResultUpdateSchema>;

// KPI Template Schemas
export const kpiTemplateCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  roleBased: z.boolean().default(false),
  departmentBased: z.boolean().default(false),
  measurementType: z.string().min(1).max(50),
  targetValue: z.number().min(0),
});

export const kpiTemplateUpdateSchema = kpiTemplateCreateSchema.partial();
export type KPITemplateCreate = z.infer<typeof kpiTemplateCreateSchema>;
export type KPITemplateUpdate = z.infer<typeof kpiTemplateUpdateSchema>;

// Employee KPI Schemas
export const employeeKpiCreateSchema = z.object({
  employeeId: z.number().int(),
  kpiTemplateId: z.number().int(),
  targetValue: z.number().min(0),
  actualValue: z.number().min(0).default(0),
});

export const employeeKpiUpdateSchema = employeeKpiCreateSchema.partial();
export type EmployeeKPICreate = z.infer<typeof employeeKpiCreateSchema>;
export type EmployeeKPIUpdate = z.infer<typeof employeeKpiUpdateSchema>;

// Review Cycle Schemas
export const reviewCycleCreateSchema = z.object({
  name: z.string().min(1).max(255),
  cycleType: z.enum(['annual', 'semi_annual', 'quarterly', 'monthly']),
  startDate: z.string().date(),
  endDate: z.string().date(),
  status: z.enum(['planning', 'active', 'review', 'completed', 'archived']).default('planning'),
});

export const reviewCycleUpdateSchema = reviewCycleCreateSchema.partial();
export type ReviewCycleCreate = z.infer<typeof reviewCycleCreateSchema>;
export type ReviewCycleUpdate = z.infer<typeof reviewCycleUpdateSchema>;

// Review Template Schemas
export const reviewTemplateCreateSchema = z.object({
  cycleId: z.number().int(),
  name: z.string().min(1).max(255),
  sections: z.array(z.object({
    name: z.string(),
    questions: z.array(z.string()).optional(),
  })).nullable().optional(),
  maxScore: z.number().min(0).default(100),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const reviewTemplateUpdateSchema = reviewTemplateCreateSchema.partial();
export type ReviewTemplateCreate = z.infer<typeof reviewTemplateCreateSchema>;
export type ReviewTemplateUpdate = z.infer<typeof reviewTemplateUpdateSchema>;

// Performance Review Schemas
export const performanceReviewCreateSchema = z.object({
  employeeId: z.number().int(),
  reviewerId: z.number().int(),
  cycleId: z.number().int(),
  templateId: z.number().int(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
  overallRating: z.number().min(0).max(100).nullable().optional(),
  reviewDate: z.string().date().nullable().optional(),
});

export const performanceReviewUpdateSchema = performanceReviewCreateSchema.partial();
export type PerformanceReviewCreate = z.infer<typeof performanceReviewCreateSchema>;
export type PerformanceReviewUpdate = z.infer<typeof performanceReviewUpdateSchema>;

// Feedback Request Schemas
export const feedbackRequestCreateSchema = z.object({
  employeeId: z.number().int(),
  reviewerId: z.number().int(),
  cycleId: z.number().int(),
  feedbackType: z.enum(['self', 'peer', 'manager', 'direct_report', '360']),
  status: z.enum(['pending', 'completed', 'expired']).default('pending'),
  deadline: z.string().date(),
});

export const feedbackRequestUpdateSchema = feedbackRequestCreateSchema.partial();
export type FeedbackRequestCreate = z.infer<typeof feedbackRequestCreateSchema>;
export type FeedbackRequestUpdate = z.infer<typeof feedbackRequestUpdateSchema>;

// Feedback Response Schemas
export const feedbackResponseCreateSchema = z.object({
  feedbackRequestId: z.number().int(),
  responseText: z.string().min(1).max(5000),
  score: z.number().min(0).max(100).nullable().optional(),
  isAnonymous: z.boolean().default(true),
});

export type FeedbackResponseCreate = z.infer<typeof feedbackResponseCreateSchema>;

// Appraisal Schemas
export const appraisalCreateSchema = z.object({
  employeeId: z.number().int(),
  cycleId: z.number().int(),
  overallRating: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'archived']).default('draft'),
});

export const appraisalUpdateSchema = appraisalCreateSchema.partial();
export type AppraisalCreate = z.infer<typeof appraisalCreateSchema>;
export type AppraisalUpdate = z.infer<typeof appraisalUpdateSchema>;

// Competency Framework Schemas
export const competencyFrameworkCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const competencyFrameworkUpdateSchema = competencyFrameworkCreateSchema.partial();
export type CompetencyFrameworkCreate = z.infer<typeof competencyFrameworkCreateSchema>;
export type CompetencyFrameworkUpdate = z.infer<typeof competencyFrameworkUpdateSchema>;

// Competency Schemas
export const competencyCreateSchema = z.object({
  frameworkId: z.number().int(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  proficiencyLevels: z.array(z.string()).nullable().optional(),
});

export const competencyUpdateSchema = competencyCreateSchema.partial();
export type CompetencyCreate = z.infer<typeof competencyCreateSchema>;
export type CompetencyUpdate = z.infer<typeof competencyUpdateSchema>;

// Employee Competency Schemas
export const employeeCompetencyCreateSchema = z.object({
  employeeId: z.number().int(),
  competencyId: z.number().int(),
  currentLevel: z.number().min(0).nullable().optional(),
  targetLevel: z.number().min(0).nullable().optional(),
  gapAnalysis: z.string().max(5000).nullable().optional(),
});

export const employeeCompetencyUpdateSchema = employeeCompetencyCreateSchema.partial();
export type EmployeeCompetencyCreate = z.infer<typeof employeeCompetencyCreateSchema>;
export type EmployeeCompetencyUpdate = z.infer<typeof employeeCompetencyUpdateSchema>;

// Development Plan Schemas
export const developmentPlanCreateSchema = z.object({
  employeeId: z.number().int(),
  cycleId: z.number().int(),
  competencyId: z.number().int(),
  objective: z.string().min(1).max(5000),
  timeline: z.string().max(1000).nullable().optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
});

export const developmentPlanUpdateSchema = developmentPlanCreateSchema.partial();
export type DevelopmentPlanCreate = z.infer<typeof developmentPlanCreateSchema>;
export type DevelopmentPlanUpdate = z.infer<typeof developmentPlanUpdateSchema>;

// Performance Improvement Plan Schemas
export const pipCreateSchema = z.object({
  employeeId: z.number().int(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  reason: z.string().min(1).max(5000),
  status: z.enum(['active', 'completed', 'passed', 'failed']).default('active'),
});

export const pipUpdateSchema = pipCreateSchema.partial();
export type PIPCreate = z.infer<typeof pipCreateSchema>;
export type PIPUpdate = z.infer<typeof pipUpdateSchema>;

// Succession Position Schemas
export const successionPositionCreateSchema = z.object({
  positionTitle: z.string().min(1).max(255),
  critical: z.boolean().default(false),
  numSuccessors: z.number().int().min(1).default(1),
});

export const successionPositionUpdateSchema = successionPositionCreateSchema.partial();
export type SuccessionPositionCreate = z.infer<typeof successionPositionCreateSchema>;
export type SuccessionPositionUpdate = z.infer<typeof successionPositionUpdateSchema>;

// Successor Schemas
export const successorCreateSchema = z.object({
  positionId: z.number().int(),
  employeeId: z.number().int(),
  readinessLevel: z.enum(['not_ready', 'emerging', 'ready_now', 'high_potential']).default('not_ready'),
});

export const successorUpdateSchema = successorCreateSchema.partial();
export type SuccessorCreate = z.infer<typeof successorCreateSchema>;
export type SuccessorUpdate = z.infer<typeof successorUpdateSchema>;

// Recognition Schemas
export const recognitionCreateSchema = z.object({
  recognizedBy: z.number().int(),
  employeeId: z.number().int(),
  recognitionType: z.enum(['team_work', 'innovation', 'leadership', 'customer_focus', 'quality', 'other']),
  pointsAwarded: z.number().int().min(0).default(0),
  message: z.string().max(1000).nullable().optional(),
});

export type RecognitionCreate = z.infer<typeof recognitionCreateSchema>;

// Talent Matrix Schemas
export const talentMatrixCreateSchema = z.object({
  employeeId: z.number().int(),
  performanceRating: z.number().min(0).max(100),
  potentialRating: z.number().min(0).max(100),
  quadrant: z.enum(['emerging', 'solid_performer', 'rising_star', 'superstar']),
});

export const talentMatrixUpdateSchema = talentMatrixCreateSchema.partial();
export type TalentMatrixCreate = z.infer<typeof talentMatrixCreateSchema>;
export type TalentMatrixUpdate = z.infer<typeof talentMatrixUpdateSchema>;
