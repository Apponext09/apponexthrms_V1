import { z } from 'zod';

export const applyLeaveSchema = z.object({
  employeeId: z.number().int().positive(),
  leaveTypeId: z.number().int().positive(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  reason: z.string().optional(),
  isHalfDay: z.boolean().optional().default(false),
  halfDayPeriod: z.enum(['first_half', 'second_half']).optional(),
  isHourly: z.boolean().optional().default(false),
  hourlyDuration: z.number().optional(),
  supportingDocumentUrl: z.string().url().optional(),
});

export const submitApplicationSchema = z.object({
  applicationId: z.number().int().positive(),
});

export const cancelLeaveSchema = z.object({
  reason: z.string().min(10),
  requiresApproval: z.boolean().optional().default(false),
});

export const withdrawLeaveSchema = z.object({
  reason: z.string().min(5),
});

export const approveLeaveSchema = z.object({
  comment: z.string().optional(),
});

export const rejectLeaveSchema = z.object({
  reason: z.string().min(10),
});

export const requestCompOffSchema = z.object({
  compOffId: z.number().int().positive(),
  reason: z.string().optional(),
});

export const earnCompOffSchema = z.object({
  employeeId: z.number().int().positive(),
  earnedDate: z.string().date(),
  hours: z.number().positive(),
  reason: z.string(),
});

export const createLeavePolicyAssignmentSchema = z.object({
  employeeId: z.number().int().positive(),
  leavePolicyId: z.number().int().positive(),
  leaveTypeId: z.number().int().positive(),
  annualQuota: z.number().int().nonnegative(),
  monthlyAccrual: z.number().optional(),
  quarterlyAccrual: z.number().optional(),
  yearlyAccrual: z.number().int().optional(),
  carryForwardEnabled: z.boolean().optional().default(true),
  carryForwardLimit: z.number().int().optional(),
  encashmentEnabled: z.boolean().optional().default(false),
  encashmentLimit: z.number().int().optional(),
  maximumBalance: z.number().int().optional(),
  canTakeNegative: z.boolean().optional().default(false),
  sandwichPolicyEnabled: z.boolean().optional().default(true),
  probationExcluded: z.boolean().optional().default(false),
  assignmentStartDate: z.string().date(),
  assignmentEndDate: z.string().date().optional(),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
export type CancelLeaveInput = z.infer<typeof cancelLeaveSchema>;
export type WithdrawLeaveInput = z.infer<typeof withdrawLeaveSchema>;
export type ApproveLeaveInput = z.infer<typeof approveLeaveSchema>;
export type RejectLeaveInput = z.infer<typeof rejectLeaveSchema>;
export type RequestCompOffInput = z.infer<typeof requestCompOffSchema>;
export type EarnCompOffInput = z.infer<typeof earnCompOffSchema>;
export type CreateLeavePolicyAssignmentInput = z.infer<typeof createLeavePolicyAssignmentSchema>;
