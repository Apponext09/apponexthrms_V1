import { z } from 'zod';

// Organization Profile Schemas
export const organizationProfileCreateSchema = z.object({
  companyName: z.string().min(2).max(255),
  legalName: z.string().max(255).nullable().optional(),
  website: z.string().url().nullable().optional(),
  gstNumber: z.string().max(50).nullable().optional(),
  panNumber: z.string().max(50).nullable().optional(),
  cinNumber: z.string().max(50).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  logoDarkUrl: z.string().url().nullable().optional(),
  addressLine1: z.string().max(255).nullable().optional(),
  addressLine2: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  primaryContactEmail: z.string().email().nullable().optional(),
  primaryContactPhone: z.string().max(20).nullable().optional(),
});

export const organizationProfileUpdateSchema = organizationProfileCreateSchema.partial();

export type OrganizationProfileCreate = z.infer<typeof organizationProfileCreateSchema>;
export type OrganizationProfileUpdate = z.infer<typeof organizationProfileUpdateSchema>;

// Branch Schemas
export const branchCreateSchema = z.object({
  name: z.string().min(1).max(150),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  addressLine1: z.string().max(255).nullable().optional(),
  addressLine2: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  branchHeadId: z.number().int().nullable().optional(),
  isPrimary: z.boolean().optional().default(false),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const branchUpdateSchema = branchCreateSchema.partial();

export type BranchCreate = z.infer<typeof branchCreateSchema>;
export type BranchUpdate = z.infer<typeof branchUpdateSchema>;

// Location Schemas
export const locationCreateSchema = z.object({
  name: z.string().min(1).max(150),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  type: z.enum(['office', 'work']).optional().default('office'),
  branchId: z.number().int().nullable().optional(),
  addressLine1: z.string().max(255).nullable().optional(),
  addressLine2: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  geofenceRadiusM: z.number().int().min(0).nullable().optional(),
  timezone: z.string().optional().default('UTC'),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const locationUpdateSchema = locationCreateSchema.partial();

export type LocationCreate = z.infer<typeof locationCreateSchema>;
export type LocationUpdate = z.infer<typeof locationUpdateSchema>;

// Department Schemas
export const departmentCreateSchema = z.object({
  name: z.string().min(1).max(150),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  parentDepartmentId: z.number().int().nullable().optional(),
  departmentHeadId: z.number().int().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const departmentUpdateSchema = departmentCreateSchema.partial();

export type DepartmentCreate = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdate = z.infer<typeof departmentUpdateSchema>;

// Designation Schemas
export const designationCreateSchema = z.object({
  name: z.string().min(1).max(150),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  departmentId: z.number().int().nullable().optional(),
  level: z.number().int().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const designationUpdateSchema = designationCreateSchema.partial();

export type DesignationCreate = z.infer<typeof designationCreateSchema>;
export type DesignationUpdate = z.infer<typeof designationUpdateSchema>;

// Cost Center Schemas
export const costCenterCreateSchema = z.object({
  name: z.string().min(1).max(150),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  parentCostCenterId: z.number().int().nullable().optional(),
  budgetAmount: z.number().min(0).nullable().optional(),
  currency: z.string().length(3).optional().default('INR'),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const costCenterUpdateSchema = costCenterCreateSchema.partial();

export type CostCenterCreate = z.infer<typeof costCenterCreateSchema>;
export type CostCenterUpdate = z.infer<typeof costCenterUpdateSchema>;

// Holiday Calendar Schemas
export const holidayCalendarCreateSchema = z.object({
  name: z.string().min(1).max(150),
  year: z.number().int().min(2000).max(2100),
  description: z.string().max(500).nullable().optional(),
  isDefault: z.boolean().optional().default(false),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const holidayCalendarUpdateSchema = holidayCalendarCreateSchema.partial();

export type HolidayCalendarCreate = z.infer<typeof holidayCalendarCreateSchema>;
export type HolidayCalendarUpdate = z.infer<typeof holidayCalendarUpdateSchema>;

// Holiday Schemas
export const holidayCreateSchema = z.object({
  holidayCalendarId: z.number().int(),
  holidayName: z.string().min(1).max(150),
  holidayDate: z.string().date(),
  holidayType: z.enum(['national', 'regional', 'company']).optional().default('company'),
  isOptional: z.boolean().optional().default(false),
  description: z.string().max(500).nullable().optional(),
});

export const holidayUpdateSchema = holidayCreateSchema.partial();

export type HolidayCreate = z.infer<typeof holidayCreateSchema>;
export type HolidayUpdate = z.infer<typeof holidayUpdateSchema>;

// Attendance Policy Schemas
export const attendancePolicyCreateSchema = z.object({
  name: z.string().min(1).max(150),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  isDefault: z.boolean().optional().default(false),
  workingHoursPerDay: z.number().min(0).max(24).optional().default(8.5),
  gracePeriodMinutes: z.number().int().min(0).optional().default(15),
  overtimeEnabled: z.boolean().optional().default(false),
  overtimeRules: z.object({}).nullable().optional(),
  shiftPolicies: z.object({}).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const attendancePolicyUpdateSchema = attendancePolicyCreateSchema.partial();

export type AttendancePolicyCreate = z.infer<typeof attendancePolicyCreateSchema>;
export type AttendancePolicyUpdate = z.infer<typeof attendancePolicyUpdateSchema>;

// Leave Policy Schemas
export const leavePolicyCreateSchema = z.object({
  name: z.string().min(1).max(150),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  isDefault: z.boolean().optional().default(false),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const leavePolicyUpdateSchema = leavePolicyCreateSchema.partial();

export type LeavePolicyCreate = z.infer<typeof leavePolicyCreateSchema>;
export type LeavePolicyUpdate = z.infer<typeof leavePolicyUpdateSchema>;

// Leave Type Schemas
export const leaveTypeCreateSchema = z.object({
  leavePolicyId: z.number().int().nullable().optional(),
  leaveName: z.string().min(1).max(100),
  leaveCode: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  annualQuota: z.number().int().min(0).optional().default(0),
  carryForwardEnabled: z.boolean().optional().default(false),
  carryForwardLimit: z.number().int().nullable().optional(),
  encashmentEnabled: z.boolean().optional().default(false),
  encashmentLimit: z.number().int().nullable().optional(),
  sandwichRuleEnabled: z.boolean().optional().default(false),
  genderApplicable: z.enum(['all', 'male', 'female', 'other']).optional().default('all'),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const leaveTypeUpdateSchema = leaveTypeCreateSchema.partial();

export type LeaveTypeCreate = z.infer<typeof leaveTypeCreateSchema>;
export type LeaveTypeUpdate = z.infer<typeof leaveTypeUpdateSchema>;

// Payroll Policy Schemas
export const payrollPolicyCreateSchema = z.object({
  name: z.string().min(1).max(150),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/),
  isDefault: z.boolean().optional().default(false),
  payFrequency: z.enum(['monthly', 'biweekly', 'weekly']).optional().default('monthly'),
  salaryStructure: z.object({}).nullable().optional(),
  deductions: z.object({}).nullable().optional(),
  complianceSettings: z.object({}).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const payrollPolicyUpdateSchema = payrollPolicyCreateSchema.partial();

export type PayrollPolicyCreate = z.infer<typeof payrollPolicyCreateSchema>;
export type PayrollPolicyUpdate = z.infer<typeof payrollPolicyUpdateSchema>;

// Work Policy Schemas
export const workPolicyCreateSchema = z.object({
  policyName: z.string().min(1).max(150),
  policyType: z.enum(['office', 'hybrid', 'remote']).default('office'),
  applicableToAll: z.boolean().optional().default(false),
  rules: z.object({}).nullable().optional(),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const workPolicyUpdateSchema = workPolicyCreateSchema.partial();

export type WorkPolicyCreate = z.infer<typeof workPolicyCreateSchema>;
export type WorkPolicyUpdate = z.infer<typeof workPolicyUpdateSchema>;

// Branding Settings Schemas
export const brandingSettingsCreateSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#000000'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#FFFFFF'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#007BFF'),
  logoUrl: z.string().url().nullable().optional(),
  logoDarkUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional().default('system'),
  customCss: z.string().nullable().optional(),
});

export const brandingSettingsUpdateSchema = brandingSettingsCreateSchema.partial();

export type BrandingSettingsCreate = z.infer<typeof brandingSettingsCreateSchema>;
export type BrandingSettingsUpdate = z.infer<typeof brandingSettingsUpdateSchema>;

// Email Template Schemas
export const emailTemplateCreateSchema = z.object({
  templateType: z.enum(['offer_letter', 'welcome_email', 'leave_approval', 'attendance_alert', 'custom']).default('custom'),
  templateName: z.string().min(1).max(150),
  subject: z.string().min(1).max(255),
  bodyHtml: z.string().min(1),
  placeholders: z.array(z.string()).nullable().optional(),
  isDefault: z.boolean().optional().default(false),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const emailTemplateUpdateSchema = emailTemplateCreateSchema.partial();

export type EmailTemplateCreate = z.infer<typeof emailTemplateCreateSchema>;
export type EmailTemplateUpdate = z.infer<typeof emailTemplateUpdateSchema>;

// Organization Settings Schemas
export const organizationSettingCreateSchema = z.object({
  settingKey: z.string().min(1).max(100),
  settingValue: z.any().nullable().optional(),
  settingType: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export const organizationSettingUpdateSchema = organizationSettingCreateSchema.partial();

export type OrganizationSettingCreate = z.infer<typeof organizationSettingCreateSchema>;
export type OrganizationSettingUpdate = z.infer<typeof organizationSettingUpdateSchema>;
