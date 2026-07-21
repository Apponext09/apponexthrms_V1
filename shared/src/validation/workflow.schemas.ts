import { z } from 'zod';

// Workflow Definition
export const CreateWorkflowSchema = z.object({
  workflow_code: z.string().min(1).max(100),
  workflow_name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum([
    'leave_request',
    'expense_claim',
    'asset_request',
    'recruitment',
    'promotion',
    'salary_revision',
    'exit_clearance',
    'travel_request',
    'attendance_regularization',
    'shift_change',
    'offer_approval',
    'candidate_approval',
    'payroll_approval',
    'offboarding',
    'document_verification',
    'asset_return',
    'employee_transfer',
  ]),
  approval_pattern: z.enum(['sequential', 'parallel', 'conditional']).optional(),
  max_escalation_levels: z.number().int().min(1).max(10).optional(),
  sla_days: z.number().int().positive().optional(),
  notify_on_completion: z.boolean().optional(),
  auto_approve_after_days: z.number().int().positive().optional(),
  auto_reject_after_days: z.number().int().positive().optional(),
});

export const UpdateWorkflowSchema = CreateWorkflowSchema.partial();

// Workflow Steps
export const CreateWorkflowStepSchema = z.object({
  workflow_id: z.number().int().positive(),
  step_number: z.number().int().positive(),
  step_name: z.string().min(1).max(255),
  step_description: z.string().optional(),
  approval_mode: z.enum(['single_person', 'any_one_person', 'all_people', 'manager_chain', 'department_head', 'role_based', 'dynamic_resolver']).optional(),
  approver_type: z.enum(['specific_user', 'user_role', 'reporting_manager', 'department_head', 'dynamic_group']),
  approver_id: z.number().int().positive().optional(),
  approver_role_id: z.number().int().positive().optional(),
  max_approvers: z.number().int().positive().optional(),
  can_delegate: z.boolean().optional(),
  can_reject: z.boolean().optional(),
  can_reassign: z.boolean().optional(),
  timeout_days: z.number().int().positive().optional(),
  sla_days: z.number().int().positive().optional(),
  is_final_step: z.boolean().optional(),
  action_on_approval: z.string().optional(),
  action_on_rejection: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateWorkflowStepSchema = CreateWorkflowStepSchema.partial();

// Workflow Conditions
export const CreateWorkflowConditionSchema = z.object({
  workflow_id: z.number().int().positive(),
  condition_type: z.enum(['field_value', 'numeric_comparison', 'date_comparison', 'approval_count']),
  field_name: z.string().optional(),
  operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'in_list', 'contains']),
  value: z.string().optional(),
  next_step_id: z.number().int().positive().optional(),
  description: z.string().optional(),
});

export const UpdateWorkflowConditionSchema = CreateWorkflowConditionSchema.partial();

// Workflow Rules
export const CreateWorkflowRuleSchema = z.object({
  workflow_id: z.number().int().positive(),
  rule_name: z.string().min(1).max(255),
  rule_description: z.string().optional(),
  rule_type: z.enum(['auto_approval', 'auto_rejection', 'skip_step', 'escalation_trigger']),
  condition_json: z.record(z.any()),
  action_json: z.record(z.any()),
  is_enabled: z.boolean().optional(),
});

export const UpdateWorkflowRuleSchema = CreateWorkflowRuleSchema.partial();

// Workflow Execution
export const StartWorkflowSchema = z.object({
  workflowCode: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.number().int().positive(),
  metadata: z.record(z.any()).optional(),
});

// Approvals
export const ApproveStepSchema = z.object({
  instanceStepId: z.number().int().positive(),
  comment: z.string().optional(),
});

export const RejectStepSchema = z.object({
  instanceStepId: z.number().int().positive(),
  reason: z.string().min(1),
});

export const DelegateStepSchema = z.object({
  instanceStepId: z.number().int().positive(),
  toUserId: z.number().int().positive(),
  reason: z.string().optional(),
  endDate: z.string().datetime().optional(),
});

export const ReassignStepSchema = z.object({
  instanceStepId: z.number().int().positive(),
  newApproverId: z.number().int().positive(),
});

export const EscalateStepSchema = z.object({
  instanceStepId: z.number().int().positive(),
  toUserId: z.number().int().positive(),
  reason: z.string().optional(),
});

// Templates
export const CreateWorkflowTemplateSchema = z.object({
  template_name: z.string().min(1).max(255),
  template_description: z.string().optional(),
  category: z.enum(['leave', 'expense', 'recruitment', 'hr', 'finance', 'operations']).optional(),
  is_default: z.boolean().optional(),
  template_data: z.record(z.any()),
});

export const UpdateWorkflowTemplateSchema = CreateWorkflowTemplateSchema.partial();

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;
export type CreateWorkflowStepInput = z.infer<typeof CreateWorkflowStepSchema>;
export type UpdateWorkflowStepInput = z.infer<typeof UpdateWorkflowStepSchema>;
export type CreateWorkflowConditionInput = z.infer<typeof CreateWorkflowConditionSchema>;
export type UpdateWorkflowConditionInput = z.infer<typeof UpdateWorkflowConditionSchema>;
export type CreateWorkflowRuleInput = z.infer<typeof CreateWorkflowRuleSchema>;
export type UpdateWorkflowRuleInput = z.infer<typeof UpdateWorkflowRuleSchema>;
export type StartWorkflowInput = z.infer<typeof StartWorkflowSchema>;
export type ApproveStepInput = z.infer<typeof ApproveStepSchema>;
export type RejectStepInput = z.infer<typeof RejectStepSchema>;
export type DelegateStepInput = z.infer<typeof DelegateStepSchema>;
export type ReassignStepInput = z.infer<typeof ReassignStepSchema>;
export type EscalateStepInput = z.infer<typeof EscalateStepSchema>;
export type CreateWorkflowTemplateInput = z.infer<typeof CreateWorkflowTemplateSchema>;
export type UpdateWorkflowTemplateInput = z.infer<typeof UpdateWorkflowTemplateSchema>;
