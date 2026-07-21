import { z } from 'zod';

// Salary Component Schemas
export const createComponentSchema = z.object({
  componentCode: z.string().min(2).max(50),
  componentName: z.string().min(2).max(100),
  componentType: z.enum(['earnings', 'deductions']),
  earningsType: z.enum(['basic', 'hra', 'allowance', 'bonus', 'variable', 'overtime', 'lta']).optional(),
  deductionType: z.enum(['pf', 'esi', 'pt', 'tds', 'lwf', 'loan', 'advance', 'other']).optional(),
  isTaxable: z.boolean().default(false),
  isRecurring: z.boolean().default(true),
  isMonthly: z.boolean().default(true),
  percentageOfBasic: z.number().optional(),
  calculationMethod: z.enum(['fixed', 'percentage', 'formula', 'formula_based']),
  calculationFormula: z.string().optional(),
  minLimit: z.number().optional(),
  maxLimit: z.number().optional(),
  sortOrder: z.number().default(0)
});

// Salary Structure Schemas
export const createStructureSchema = z.object({
  structureName: z.string().min(2).max(100),
  structureCode: z.string().min(2).max(50),
  description: z.string().optional(),
  applicableToDesignationId: z.number().optional(),
  applicableToLocationId: z.number().optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional()
});

// Salary Revision Schemas
export const requestRevisionSchema = z.object({
  employeeId: z.number().int().positive(),
  revisionType: z.enum(['increment', 'promotion', 'compensation_change', 'adjustment']),
  newCTC: z.number().positive(),
  effectiveFrom: z.string().date(),
  incrementPercentage: z.number().optional(),
  incrementAmount: z.number().optional(),
  reason: z.string().optional(),
  components: z.array(z.object({
    componentId: z.number().int().positive(),
    oldValue: z.number(),
    newValue: z.number()
  })).optional()
});

// Payroll Cycle Schemas
export const createPayrollCycleSchema = z.object({
  cycleName: z.string().min(2).max(100),
  cycleCode: z.string().min(2).max(50),
  cycleType: z.enum(['monthly', 'biweekly', 'weekly', 'fortnightly']),
  cycleStartDate: z.string().date(),
  cycleEndDate: z.string().date(),
  payrollRunDate: z.string().date(),
  salaryCreditDate: z.string().date()
});

// Payroll Run Schemas
export const createPayrollRunSchema = z.object({
  payrollCycleId: z.number().int().positive(),
  runType: z.enum(['regular', 'off_cycle', 'final_settlement', 'arrears']).default('regular')
});

// Payslip Schemas
export const getPayslipSchema = z.object({
  employeeId: z.number().int().positive(),
  limit: z.number().int().min(1).max(100).optional()
});

export const sendPayslipSchema = z.object({
  payslipId: z.number().int().positive()
});

// Loan Schemas
export const createLoanSchema = z.object({
  employeeId: z.number().int().positive(),
  loanType: z.enum(['personal', 'vehicle', 'home', 'education']),
  loanAmount: z.number().positive(),
  loanDate: z.string().date(),
  tenureMonths: z.number().int().positive(),
  interestRate: z.number().nonnegative().optional()
});

// Tax Declaration Schemas
export const createTaxDeclarationSchema = z.object({
  employeeId: z.number().int().positive(),
  financialYear: z.string().regex(/^\d{4}-\d{2}$/),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i).optional()
});

export const addTaxInvestmentSchema = z.object({
  declarationId: z.number().int().positive(),
  investmentType: z.enum(['80c', '80d', '80tta', 'other']),
  investmentAmount: z.number().positive(),
  investmentProofUrl: z.string().url().optional()
});

export const calculateTDSSchema = z.object({
  employeeId: z.number().int().positive(),
  financialYear: z.string().regex(/^\d{4}-\d{2}$/),
  grossSalaryYtd: z.number().nonnegative()
});

// Settlement Schemas
export const createSettlementSchema = z.object({
  employeeId: z.number().int().positive(),
  exitDate: z.string().date(),
  noticePeriodDays: z.number().int().nonnegative().optional()
});

export const approveSettlementSchema = z.object({
  approverId: z.number().int().positive()
});

// Salary Advance Schemas
export const createAdvanceSchema = z.object({
  employeeId: z.number().int().positive(),
  advanceAmount: z.number().positive(),
  advanceDate: z.string().date(),
  recoveryMonths: z.number().int().positive(),
  reason: z.string().optional()
});

// Type exports for TypeScript
export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type CreateStructureInput = z.infer<typeof createStructureSchema>;
export type RequestRevisionInput = z.infer<typeof requestRevisionSchema>;
export type CreatePayrollCycleInput = z.infer<typeof createPayrollCycleSchema>;
export type CreatePayrollRunInput = z.infer<typeof createPayrollRunSchema>;
export type GetPayslipInput = z.infer<typeof getPayslipSchema>;
export type SendPayslipInput = z.infer<typeof sendPayslipSchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type CreateTaxDeclarationInput = z.infer<typeof createTaxDeclarationSchema>;
export type AddTaxInvestmentInput = z.infer<typeof addTaxInvestmentSchema>;
export type CalculateTDSInput = z.infer<typeof calculateTDSSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type ApproveSettlementInput = z.infer<typeof approveSettlementSchema>;
export type CreateAdvanceInput = z.infer<typeof createAdvanceSchema>;
