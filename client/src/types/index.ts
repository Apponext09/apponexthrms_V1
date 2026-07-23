import { z } from 'zod';

// Employee types
export interface Employee {
  id?: number;
  uuid?: string;
  employeeCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phone?: string | null;
  mobile?: string | null;
  phoneNumber?: string;
  dateOfBirth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  bloodGroup?: string | null;
  nationality?: string | null;
  aadharNumber?: string | null;
  panNumber?: string | null;
  passportNumber?: string | null;
  dateOfJoining?: string;
  dateOfConfirmation?: string | null;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'internship';
  department?: string;
  designation?: string;
  currentDepartmentId?: number | null;
  currentDesignationId?: number | null;
  currentBranchId?: number | null;
  currentLocationId?: number | null;
  reportingManager?: string;
  reportingManagerId?: number | null;
  avatarUrl?: string | null;
  status?: string;
  accessRole?: string;
  jobTitle?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeePersonalInfo {
  id?: number;
  uuid?: string;
  employeeId?: number;
  fatherName?: string | null;
  motherName?: string | null;
  spouseName?: string | null;
  childrenCount?: number;
  permanentAddress?: string | null;
  currentAddress?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

export interface EmployeeProfessionalInfo {
  id?: number;
  uuid?: string;
  employeeId?: number;
  qualification?: string | null;
  specialization?: string | null;
  university?: string | null;
  graduationYear?: number | null;
  yearsOfExperience?: number;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
}

export interface EmployeeLifecycleEntry {
  id: number;
  uuid?: string;
  employeeId: number;
  fromStatus?: string | null;
  toStatus: string;
  transitionDate: string;
  notes?: string | null;
  createdAt?: string;
}

export interface EmployeeCreate {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfJoining?: string;
  departmentId?: number;
  designationId?: number;
  reportingManagerId?: number;
}

// Asset types
export interface Asset {
  id?: number;
  uuid?: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  description?: string;
  status: 'available' | 'allocated' | 'maintenance' | 'retired';
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetAllocationCreate {
  assetId: number;
  employeeId: number;
  allocationDate: string;
  conditionAtAllocation?: 'good' | 'fair' | 'poor';
  notes?: string;
}

export interface AssetAllocationReturn {
  returnDate: string;
  conditionAtReturn?: 'good' | 'fair' | 'poor';
  notes?: string;
}

// Document types
export interface EmployeeDocument {
  id?: number;
  uuid?: string;
  employeeId: number;
  documentType: string;
  documentNumber?: string | null;
  fileUrl: string;
  fileSize?: number | null;
  fileType?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'expired';
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeDocumentCreate {
  employeeId: number;
  documentType: string;
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
}

// Validation schema types (stub)
export interface BranchCreate {
  branchCode: string;
  branchName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
}

export interface BranchUpdate extends BranchCreate {
  id: number;
}

export interface LocationCreate {
  locationCode: string;
  locationName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface LocationUpdate extends LocationCreate {
  id: number;
}

export interface DepartmentCreate {
  departmentCode: string;
  departmentName: string;
  description?: string;
}

export interface DepartmentUpdate extends DepartmentCreate {
  id: number;
}

export interface OrganizationProfileCreate {
  organizationName: string;
  organizationCode: string;
  industry?: string;
  website?: string;
  phone?: string;
  address?: string;
}

export interface OrganizationProfileUpdate extends OrganizationProfileCreate {
  id: number;
}

export interface BrandingSettingsUpdate {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
}

// Zod Schemas for form validation
export const branchCreateSchema = z.object({
  branchCode: z.string().min(1, 'Branch code is required'),
  branchName: z.string().min(1, 'Branch name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pinCode: z.string().optional(),
});

export const locationCreateSchema = z.object({
  locationCode: z.string().min(1, 'Location code is required'),
  locationName: z.string().min(1, 'Location name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export const departmentCreateSchema = z.object({
  departmentCode: z.string().min(1, 'Department code is required'),
  departmentName: z.string().min(1, 'Department name is required'),
  description: z.string().optional(),
});

export const organizationProfileUpdateSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationCode: z.string().min(1, 'Organization code is required'),
  industry: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const brandingSettingsUpdateSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
});
