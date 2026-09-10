export interface AssetCategory {
  id: number;
  organizationId: number;
  uuid: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: number;
  organizationId: number;
  uuid: string;
  categoryId: number;
  assetCode: string;
  qrCode?: string;
  barcode?: string;
  serialNumber?: string;
  model?: string;
  brand?: string;
  cost?: number;
  purchaseDate?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  vendorId?: number;
  status: 'available' | 'assigned' | 'repair' | 'retired' | 'lost' | 'disposed';
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  locationId?: number;
  departmentId?: number;
  currentOwnerId?: number;
  notes?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetAssignment {
  id: number;
  organizationId: number;
  uuid: string;
  assetId: number;
  employeeId: number;
  assignmentType: 'permanent' | 'temporary';
  assignedDate: string;
  expectedReturnDate?: string;
  status: 'active' | 'returned' | 'lost' | 'damaged';
  notes?: string;
  assignedBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetTransfer {
  id: number;
  organizationId: number;
  uuid: string;
  assetId: number;
  fromEmployeeId: number;
  toEmployeeId: number;
  transferDate: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedBy: number;
  approvedBy?: number;
  approvalDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetReturn {
  id: number;
  organizationId: number;
  uuid: string;
  assetId: number;
  employeeId: number;
  returnDate: string;
  condition: 'good' | 'minor_damage' | 'major_damage' | 'lost';
  damageNotes?: string;
  isRecoverable: boolean;
  recoveryAmount?: number;
  status: 'pending' | 'completed' | 'processing';
  receivedBy: number;
  receivedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetMaintenance {
  id: number;
  organizationId: number;
  uuid: string;
  assetId: number;
  maintenanceType: 'repair' | 'amc' | 'scheduled' | 'preventive';
  startDate: string;
  endDate?: string;
  vendorId?: number;
  cost?: number;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completionNotes?: string;
  completedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetVendor {
  id: number;
  organizationId: number;
  uuid: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  contactPerson?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface SoftwareLicense {
  id: number;
  organizationId: number;
  uuid: string;
  softwareName: string;
  licenseKey?: string;
  licenseType: 'perpetual' | 'subscription' | 'trial';
  totalLicenses: number;
  usedLicenses: number;
  purchaseDate?: string;
  expiryDate?: string;
  cost?: number;
  vendorId?: number;
  notes?: string;
  status: 'active' | 'expired' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface AssetRequest {
  id: number;
  organizationId: number;
  uuid: string;
  employeeId: number;
  categoryId: number;
  assetModel?: string;
  specification?: string;
  reason?: string;
  requiredDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  requestedBy: number;
  approvedBy?: number;
  approvalDate?: string;
  fulfilledBy?: number;
  fulfilledDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetListQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: string;
  condition?: string;
  owner?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedList<T> {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
