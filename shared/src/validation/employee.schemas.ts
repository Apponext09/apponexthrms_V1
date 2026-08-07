import { z } from 'zod';

// ── Safe date helper ──────────────────────────────────────────────────────────
// Accepts YYYY-MM-DD or ISO datetime strings (DB returns ISO), strips time part.
// Empty strings and null are treated as undefined (optional fields).
const safeDate = z.preprocess((val) => {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'string') {
    // Strip time part from ISO datetime like "2024-01-15T00:00:00.000Z"
    const stripped = val.split('T')[0];
    // Validate it's a proper YYYY-MM-DD
    return /^\d{4}-\d{2}-\d{2}$/.test(stripped) ? stripped : val;
  }
  return val;
}, z.string().date().optional());

// ── Employee Schemas ──────────────────────────────────────────────────────────
export const employeeCreateSchema = z.object({
  employeeCode: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  middleName: z.string().max(100).nullable().optional(),
  email: z.string().email(),
  phone: z.string().max(20).nullable().optional(),
  mobile: z.string().max(20).nullable().optional(),
  dateOfBirth: safeDate,
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  bloodGroup: z.string().max(10).nullable().optional(),
  nationality: z.string().max(100).nullable().optional(),
  aadharNumber: z.string().max(20).nullable().optional(),
  panNumber: z.string().max(20).nullable().optional(),
  passportNumber: z.string().max(50).nullable().optional(),
  dateOfJoining: safeDate,
  employmentType: z.string().max(100).default('full_time'),
  designationId: z.number().int().nullable().optional(),
  status: z.string().max(100).optional(),
  jobTitle: z.string().max(150).nullable().optional(),
  departmentId: z.number().int().nullable().optional(),
  branchId: z.number().int().nullable().optional(),
  locationId: z.number().int().nullable().optional(),
  reportingManagerId: z.number().int().nullable().optional(),
  costCenterId: z.number().int().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  accessRole: z.enum(['employee', 'team_lead', 'hr_manager', 'department_head']).default('employee'),
  password: z.string().min(6),
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

export const employeeBulkCreateSchema = z.object({
  employees: z.array(employeeCreateSchema),
});

export type EmployeeCreate = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;
export type EmployeeBulkCreate = z.infer<typeof employeeBulkCreateSchema>;

// Employee Personal Info Schemas
export const employeePersonalInfoCreateSchema = z.object({
  fatherName: z.string().max(100).nullable().optional(),
  motherName: z.string().max(100).nullable().optional(),
  spouseName: z.string().max(100).nullable().optional(),
  childrenCount: z.number().int().min(0).optional().default(0),
  permanentAddress: z.string().max(500).nullable().optional(),
  currentAddress: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
});

export const employeePersonalInfoUpdateSchema = employeePersonalInfoCreateSchema.partial();

export type EmployeePersonalInfoCreate = z.infer<typeof employeePersonalInfoCreateSchema>;
export type EmployeePersonalInfoUpdate = z.infer<typeof employeePersonalInfoUpdateSchema>;

// Employee Professional Info Schemas
export const employeeProfessionalInfoCreateSchema = z.object({
  qualification: z.string().max(50).nullable().optional(),
  specialization: z.string().max(100).nullable().optional(),
  university: z.string().max(200).nullable().optional(),
  graduationYear: z.number().int().nullable().optional(),
  yearsOfExperience: z.number().int().min(0).default(0),
  linkedinUrl: z.string().url().nullable().optional(),
  githubUrl: z.string().url().nullable().optional(),
});

export const employeeProfessionalInfoUpdateSchema = employeeProfessionalInfoCreateSchema.partial();

export type EmployeeProfessionalInfoCreate = z.infer<typeof employeeProfessionalInfoCreateSchema>;
export type EmployeeProfessionalInfoUpdate = z.infer<typeof employeeProfessionalInfoUpdateSchema>;

// Employee Compensation Schemas
export const employeeCompensationCreateSchema = z.object({
  baseSalary: z.number().min(0).nullable().optional(),
  currency: z.string().length(3).default('INR'),
  salaryStructureId: z.number().int().nullable().optional(),
  bankName: z.string().max(100).nullable().optional(),
  accountNumber: z.string().max(30).nullable().optional(),
  ifscCode: z.string().max(20).nullable().optional(),
  uanNumber: z.string().max(50).nullable().optional(),
  esicNumber: z.string().max(50).nullable().optional(),
  pensionNumber: z.string().max(50).nullable().optional(),
});

export const employeeCompensationUpdateSchema = employeeCompensationCreateSchema.partial();

export type EmployeeCompensationCreate = z.infer<typeof employeeCompensationCreateSchema>;
export type EmployeeCompensationUpdate = z.infer<typeof employeeCompensationUpdateSchema>;

// Employee Document Schemas
export const employeeDocumentCreateSchema = z.object({
  employeeId: z.number().int(),
  documentType: z.enum([
    'aadhaar', 'pan', 'passport', 'visa', 'driving_license',
    'offer_letter', 'appointment_letter', 'confirmation_letter',
    'relieving_letter', 'experience_letter', 'resume', 'certificate'
  ]),
  fileUrl: z.string().url(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().nullable().optional(),
  fileType: z.string().max(50).nullable().optional(),
  documentNumber: z.string().max(50).nullable().optional(),
  issueDate: z.string().date().nullable().optional(),
  expiryDate: z.string().date().nullable().optional(),
  issuedBy: z.string().max(100).nullable().optional(),
});

export const employeeDocumentUpdateSchema = employeeDocumentCreateSchema.partial().omit({ employeeId: true });

export type EmployeeDocumentCreate = z.infer<typeof employeeDocumentCreateSchema>;
export type EmployeeDocumentUpdate = z.infer<typeof employeeDocumentUpdateSchema>;

// Asset Schemas
export const assetCreateSchema = z.object({
  assetTypeId: z.number().int(),
  assetCode: z.string().min(1).max(50),
  brand: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  serialNumber: z.string().max(100).nullable().optional(),
  purchaseDate: z.string().date().nullable().optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  currency: z.string().length(3).default('INR'),
});

export const assetUpdateSchema = assetCreateSchema.partial();

export type AssetCreate = z.infer<typeof assetCreateSchema>;
export type AssetUpdate = z.infer<typeof assetUpdateSchema>;

// Asset Allocation Schemas
export const assetAllocationCreateSchema = z.object({
  employeeId: z.number().int(),
  assetId: z.number().int(),
  allocationDate: z.string().date(),
  conditionAtAllocation: z.enum(['good', 'fair', 'poor']).default('good'),
  notes: z.string().nullable().optional(),
});

export const assetAllocationReturnSchema = z.object({
  returnDate: z.string().date(),
  conditionAtReturn: z.enum(['good', 'fair', 'poor']).default('good'),
  notes: z.string().nullable().optional(),
});

export type AssetAllocationCreate = z.infer<typeof assetAllocationCreateSchema>;
export type AssetAllocationReturn = z.infer<typeof assetAllocationReturnSchema>;

// Status Transition Schema
export const statusTransitionSchema = z.object({
  employeeId: z.number().int(),
  toStatus: z.enum(['candidate', 'onboarding', 'probation', 'active', 'notice', 'exit', 'alumni']),
  transitionDate: z.string().date(),
  notes: z.string().nullable().optional(),
});

export type StatusTransition = z.infer<typeof statusTransitionSchema>;
