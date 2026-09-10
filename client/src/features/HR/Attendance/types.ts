export interface AdminLocation {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  type: 'head_office' | 'branch_office' | 'client_site' | 'remote_zone';
  isActive: boolean;
  ipAddress?: string;
  companyId?: string | number;
  company_id?: string | number;
}

export interface EmployeeLocationAccess {
  id: string;
  employeeId: string;
  companyId?: string | number;
  company_id?: string | number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  department: string;
  designation: string;
  reportingManager?: string;
  primaryLocationId: string;
  assignedLocationIds: string[]; // List of location IDs allowed for punch
  allowRemotePunch: boolean;
  allowFieldPunch: boolean;
  customRadiusMeters?: number;
  notes?: string;
  updatedAt: string;
}

export interface LocationAssignmentFilter {
  search: string;
  department: string;
  locationId: string;
  accessType: 'all' | 'multi' | 'single' | 'remote';
}
