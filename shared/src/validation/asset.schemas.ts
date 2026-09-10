import { z } from 'zod';

// Asset Category
export const assetCategoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const assetCategoryUpdateSchema = assetCategoryCreateSchema.partial();

export type AssetCategoryCreate = z.infer<typeof assetCategoryCreateSchema>;
export type AssetCategoryUpdate = z.infer<typeof assetCategoryUpdateSchema>;

// Asset
export const assetCreateSchema = z.object({
  categoryId: z.number().int(),
  assetCode: z.string().min(1).max(50),
  qrCode: z.string().max(255).nullable().optional(),
  barcode: z.string().max(255).nullable().optional(),
  serialNumber: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  cost: z.number().positive().nullable().optional(),
  purchaseDate: z.string().date().nullable().optional(),
  warrantyStart: z.string().date().nullable().optional(),
  warrantyEnd: z.string().date().nullable().optional(),
  vendorId: z.number().int().nullable().optional(),
  status: z.enum(['available', 'assigned', 'repair', 'retired', 'lost', 'disposed']).default('available'),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).default('good'),
  locationId: z.number().int().nullable().optional(),
  departmentId: z.number().int().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const assetUpdateSchema = assetCreateSchema.partial();

export type AssetCreate = z.infer<typeof assetCreateSchema>;
export type AssetUpdate = z.infer<typeof assetUpdateSchema>;

// Asset Assignment
export const assetAssignmentSchema = z.object({
  assetId: z.number().int(),
  employeeId: z.number().int(),
  assignmentType: z.enum(['permanent', 'temporary']).default('permanent'),
  assignedDate: z.string().date(),
  expectedReturnDate: z.string().date().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type AssetAssignment = z.infer<typeof assetAssignmentSchema>;

// Asset Transfer
export const assetTransferSchema = z.object({
  assetId: z.number().int(),
  fromEmployeeId: z.number().int(),
  toEmployeeId: z.number().int(),
  transferDate: z.string().date(),
  reason: z.string().max(500).nullable().optional(),
});

export type AssetTransfer = z.infer<typeof assetTransferSchema>;

// Asset Return
export const assetReturnSchema = z.object({
  assetId: z.number().int(),
  employeeId: z.number().int(),
  returnDate: z.string().date(),
  condition: z.enum(['good', 'minor_damage', 'major_damage', 'lost']).default('good'),
  damageNotes: z.string().max(500).nullable().optional(),
  isRecoverable: z.boolean().default(true),
  recoveryAmount: z.number().positive().nullable().optional(),
});

export type AssetReturn = z.infer<typeof assetReturnSchema>;

// Asset Maintenance
export const assetMaintenanceCreateSchema = z.object({
  assetId: z.number().int(),
  maintenanceType: z.enum(['repair', 'amc', 'scheduled', 'preventive']),
  startDate: z.string().date(),
  endDate: z.string().date().nullable().optional(),
  vendorId: z.number().int().nullable().optional(),
  cost: z.number().positive().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export const assetMaintenanceUpdateSchema = assetMaintenanceCreateSchema.partial();

export type AssetMaintenanceCreate = z.infer<typeof assetMaintenanceCreateSchema>;
export type AssetMaintenanceUpdate = z.infer<typeof assetMaintenanceUpdateSchema>;

// Software License
export const softwareLicenseCreateSchema = z.object({
  softwareName: z.string().min(1).max(200),
  licenseKey: z.string().max(255).nullable().optional(),
  licenseType: z.enum(['perpetual', 'subscription', 'trial']),
  totalLicenses: z.number().int().positive(),
  purchaseDate: z.string().date().nullable().optional(),
  expiryDate: z.string().date().nullable().optional(),
  cost: z.number().positive().nullable().optional(),
  vendorId: z.number().int().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const softwareLicenseUpdateSchema = softwareLicenseCreateSchema.partial();

export type SoftwareLicenseCreate = z.infer<typeof softwareLicenseCreateSchema>;
export type SoftwareLicenseUpdate = z.infer<typeof softwareLicenseUpdateSchema>;

// Asset Vendor
export const assetVendorCreateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  contactPerson: z.string().max(100).nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const assetVendorUpdateSchema = assetVendorCreateSchema.partial();

export type AssetVendorCreate = z.infer<typeof assetVendorCreateSchema>;
export type AssetVendorUpdate = z.infer<typeof assetVendorUpdateSchema>;

// Asset Request
export const assetRequestCreateSchema = z.object({
  employeeId: z.number().int(),
  categoryId: z.number().int(),
  assetModel: z.string().max(100).nullable().optional(),
  specification: z.string().max(500).nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
  requiredDate: z.string().date().nullable().optional(),
});

export type AssetRequestCreate = z.infer<typeof assetRequestCreateSchema>;
