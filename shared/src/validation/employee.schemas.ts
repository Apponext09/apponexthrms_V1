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

const safeEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((val) => (val === '' || val === null ? undefined : val), z.enum(values).nullable().optional());

const safeInt = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
}, z.number().int().nullable().optional());

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
  gender: safeEnum(['male', 'female', 'other']),
  bloodGroup: z.string().max(10).nullable().optional(),
  aadharNumber: z.string().max(50).nullable().optional(),
  aadhar_number: z.string().max(50).nullable().optional(),
  panNumber: z.string().max(50).nullable().optional(),
  pan_number: z.string().max(50).nullable().optional(),
  passportNumber: z.string().max(50).nullable().optional(),
  passport_number: z.string().max(50).nullable().optional(),
  dateOfJoining: safeDate,
  employmentType: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.string().max(100).default('full_time')),
  designationId: safeInt,
  status: z.string().max(100).optional(),
  jobTitle: z.string().max(150).nullable().optional(),
  departmentId: safeInt,
  branchId: safeInt,
  locationId: safeInt,
  currentLocationId: safeInt,
  gradeId: safeInt,
  currentGradeId: safeInt,
  companyId: safeInt,
  reportingManagerId: safeInt,
  costCenterId: safeInt,
  avatarUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  accessRole: z.enum(['employee', 'team_lead', 'hr_manager', 'department_head', 'organization_admin', 'intern', 'consultant', 'admin', 'ceo', 'hr_admin', 'hr', 'support', 'super_admin']).default('employee'),
  password: z.string().min(6).optional(),
  // Statutory and Banking details
  bankName: z.string().max(100).nullable().optional(),
  bank_name: z.string().max(100).nullable().optional(),
  accountNumber: z.string().max(50).nullable().optional(),
  account_no: z.string().max(50).nullable().optional(),
  ifscCode: z.string().max(20).nullable().optional(),
  ifsc_code: z.string().max(20).nullable().optional(),
  companyBank: z.string().max(100).nullable().optional(),
  company_bank: z.string().max(100).nullable().optional(),
  pfNumber: z.string().max(50).nullable().optional(),
  pf_no: z.string().max(50).nullable().optional(),
  pf_number: z.string().max(50).nullable().optional(),
  uanNumber: z.string().max(50).nullable().optional(),
  uan_no: z.string().max(50).nullable().optional(),
  uan_number: z.string().max(50).nullable().optional(),
  esicNumber: z.string().max(50).nullable().optional(),
  esic_no: z.string().max(50).nullable().optional(),
  esic_number: z.string().max(50).nullable().optional(),
  userBand: z.string().max(50).nullable().optional(),
  user_band: z.string().max(50).nullable().optional(),
  payrollSlab: z.string().max(50).nullable().optional(),
  payroll_slab: z.string().max(50).nullable().optional(),
  employeeShare: z.string().max(50).nullable().optional(),
  employee_share: z.string().max(50).nullable().optional(),
  employerShare: z.string().max(50).nullable().optional(),
  employer_share: z.string().max(50).nullable().optional(),
  backgroundVerification: z.string().max(50).nullable().optional(),
  background_verification: z.string().max(50).nullable().optional(),
  eligibleForEps: z.string().max(10).nullable().optional(),
  eligible_for_eps: z.string().max(10).nullable().optional(),
  panStatus: z.string().max(50).nullable().optional(),
  pan_status: z.string().max(50).nullable().optional(),
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
