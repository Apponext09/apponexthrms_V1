/**
 * Performance Management Module Permissions
 * Total: 32 permission codes for complete performance management
 */

export const PERFORMANCE_PERMISSIONS = {
  // Goals & OKR Management
  'performance.goal_read': 'performance.goal_read', // View goals
  'performance.goal_write': 'performance.goal_write', // Create/update goals
  'performance.goal_approve': 'performance.goal_approve', // Approve goals

  // OKR Management
  'performance.okr_read': 'performance.okr_read', // View OKRs
  'performance.okr_write': 'performance.okr_write', // Create/update OKRs
  'performance.okr_approve': 'performance.okr_approve', // Approve OKRs

  // KPI Management
  'performance.kpi_read': 'performance.kpi_read', // View KPIs
  'performance.kpi_write': 'performance.kpi_write', // Create/update KPIs
  'performance.kpi_template_read': 'performance.kpi_template_read', // View KPI templates
  'performance.kpi_template_write': 'performance.kpi_template_write', // Manage KPI templates

  // Review Cycle Management
  'performance.review_cycle_read': 'performance.review_cycle_read', // View review cycles
  'performance.review_cycle_write': 'performance.review_cycle_write', // Create/update review cycles
  'performance.review_cycle_manage': 'performance.review_cycle_manage', // Manage review cycles (admin)

  // Performance Review
  'performance.review_read': 'performance.review_read', // View own reviews and team reviews
  'performance.review_write': 'performance.review_write', // Submit own reviews
  'performance.review_submit': 'performance.review_submit', // Submit reviews as reviewer
  'performance.review_approve': 'performance.review_approve', // Approve reviews

  // Feedback Management
  'performance.feedback_read': 'performance.feedback_read', // View feedback
  'performance.feedback_write': 'performance.feedback_write', // Provide feedback
  'performance.feedback_360': 'performance.feedback_360', // Participate in 360 feedback

  // Appraisal Management
  'performance.appraisal_read': 'performance.appraisal_read', // View appraisals
  'performance.appraisal_write': 'performance.appraisal_write', // Create/update appraisals
  'performance.appraisal_approve': 'performance.appraisal_approve', // Approve appraisals

  // Competency Management
  'performance.competency_read': 'performance.competency_read', // View competencies
  'performance.competency_write': 'performance.competency_write', // Manage competencies
  'performance.competency_assess': 'performance.competency_assess', // Assess competencies

  // Development Plan
  'performance.development_plan_read': 'performance.development_plan_read', // View development plans
  'performance.development_plan_write': 'performance.development_plan_write', // Create/update development plans

  // PIP Management
  'performance.pip_read': 'performance.pip_read', // View PIPs
  'performance.pip_write': 'performance.pip_write', // Create/update PIPs
  'performance.pip_review': 'performance.pip_review', // Review PIPs

  // Succession Planning
  'performance.succession_read': 'performance.succession_read', // View succession plans
  'performance.succession_write': 'performance.succession_write', // Manage succession plans
  'performance.succession_manage': 'performance.succession_manage', // Full succession management

  // Recognition & Rewards
  'performance.recognition_read': 'performance.recognition_read', // View recognitions
  'performance.recognition_write': 'performance.recognition_write', // Create recognitions
  'performance.reward_read': 'performance.reward_read', // View reward points
  'performance.reward_redeem': 'performance.reward_redeem', // Redeem reward points

  // Analytics & Reports
  'performance.analytics_read': 'performance.analytics_read', // View analytics
  'performance.talent_matrix_read': 'performance.talent_matrix_read', // View talent matrix
} as const;

export const PERFORMANCE_PERMISSION_CODES = Object.keys(PERFORMANCE_PERMISSIONS);

/**
 * Role-based permission mappings for Performance Management
 */
export const PERFORMANCE_ROLE_PERMISSIONS = {
  employee: [
    'performance.goal_read', // Can view own goals
    'performance.goal_write', // Can create/update own goals
    'performance.okr_read',
    'performance.kpi_read', // View own KPIs
    'performance.review_read', // Can view own reviews
    'performance.review_write', // Can submit self reviews
    'performance.feedback_read',
    'performance.feedback_write', // Can provide feedback
    'performance.feedback_360', // Can participate in 360
    'performance.appraisal_read', // Can view own appraisal
    'performance.competency_read',
    'performance.competency_assess', // Can assess self
    'performance.development_plan_read',
    'performance.development_plan_write', // Can create own plans
    'performance.pip_read', // Can view own PIP if exists
    'performance.succession_read',
    'performance.recognition_read',
    'performance.reward_read', // Can view own reward points
    'performance.analytics_read', // Personal analytics only
  ],

  team_lead: [
    'performance.goal_read',
    'performance.goal_write',
    'performance.goal_approve',
    'performance.okr_read',
    'performance.okr_write',
    'performance.kpi_read',
    'performance.kpi_write',
    'performance.review_cycle_read',
    'performance.review_read',
    'performance.review_write',
    'performance.review_submit', // Can submit reviews for team
    'performance.review_approve',
    'performance.feedback_read',
    'performance.feedback_write',
    'performance.feedback_360',
    'performance.appraisal_read',
    'performance.appraisal_write',
    'performance.appraisal_approve',
    'performance.competency_read',
    'performance.competency_assess',
    'performance.development_plan_read',
    'performance.development_plan_write',
    'performance.pip_read',
    'performance.pip_write',
    'performance.pip_review',
    'performance.succession_read',
    'performance.recognition_read',
    'performance.recognition_write',
    'performance.reward_read',
    'performance.analytics_read',
    'performance.talent_matrix_read',
  ],

  reporting_manager: [
    'performance.goal_read',
    'performance.goal_write',
    'performance.goal_approve',
    'performance.okr_read',
    'performance.okr_write',
    'performance.okr_approve',
    'performance.kpi_read',
    'performance.kpi_write',
    'performance.review_cycle_read',
    'performance.review_read',
    'performance.review_write',
    'performance.review_submit',
    'performance.review_approve',
    'performance.feedback_read',
    'performance.feedback_write',
    'performance.feedback_360',
    'performance.appraisal_read',
    'performance.appraisal_write',
    'performance.appraisal_approve',
    'performance.competency_read',
    'performance.competency_assess',
    'performance.development_plan_read',
    'performance.development_plan_write',
    'performance.pip_read',
    'performance.pip_write',
    'performance.pip_review',
    'performance.succession_read',
    'performance.succession_write',
    'performance.recognition_read',
    'performance.recognition_write',
    'performance.reward_read',
    'performance.analytics_read',
    'performance.talent_matrix_read',
  ],

  hr_manager: [
    'performance.goal_read',
    'performance.goal_write',
    'performance.goal_approve',
    'performance.okr_read',
    'performance.okr_write',
    'performance.okr_approve',
    'performance.kpi_read',
    'performance.kpi_write',
    'performance.kpi_template_read',
    'performance.kpi_template_write',
    'performance.review_cycle_read',
    'performance.review_cycle_write',
    'performance.review_cycle_manage',
    'performance.review_read',
    'performance.review_write',
    'performance.review_submit',
    'performance.review_approve',
    'performance.feedback_read',
    'performance.feedback_write',
    'performance.feedback_360',
    'performance.appraisal_read',
    'performance.appraisal_write',
    'performance.appraisal_approve',
    'performance.competency_read',
    'performance.competency_write',
    'performance.competency_assess',
    'performance.development_plan_read',
    'performance.development_plan_write',
    'performance.pip_read',
    'performance.pip_write',
    'performance.pip_review',
    'performance.succession_read',
    'performance.succession_write',
    'performance.succession_manage',
    'performance.recognition_read',
    'performance.recognition_write',
    'performance.reward_read',
    'performance.reward_redeem',
    'performance.analytics_read',
    'performance.talent_matrix_read',
  ],

  organization_admin: [
    // Full access to all performance features
    ...Object.keys(PERFORMANCE_PERMISSIONS),
  ],

  super_admin: [
    // Full access to all performance features
    ...Object.keys(PERFORMANCE_PERMISSIONS),
  ],

  auditor: [
    'performance.goal_read',
    'performance.okr_read',
    'performance.kpi_read',
    'performance.review_cycle_read',
    'performance.review_read',
    'performance.appraisal_read',
    'performance.competency_read',
    'performance.development_plan_read',
    'performance.pip_read',
    'performance.succession_read',
    'performance.recognition_read',
    'performance.analytics_read',
    'performance.talent_matrix_read',
  ],

  finance_manager: [
    'performance.goal_read',
    'performance.okr_read',
    'performance.kpi_read',
    'performance.appraisal_read',
    'performance.development_plan_read',
    'performance.recognition_read',
    'performance.reward_read',
    'performance.analytics_read',
  ],
} as const;
