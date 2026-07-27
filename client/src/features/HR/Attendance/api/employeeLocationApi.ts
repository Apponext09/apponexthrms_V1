import apiClient from '@/lib/api';
import { AdminLocation, EmployeeLocationAccess } from '../types';

export interface GetEmployeeLocationsResponse {
  employees: EmployeeLocationAccess[];
  adminLocations: AdminLocation[];
}

export const fetchEmployeeLocationData = async (): Promise<GetEmployeeLocationsResponse> => {
  const response = await apiClient.get('/attendance/employee-locations');
  return response.data.data;
};

export const saveEmployeeLocationAccess = async (payload: {
  employeeId: string;
  assignedLocationIds: string[];
  primaryLocationId?: string;
  allowRemotePunch?: boolean;
  allowFieldPunch?: boolean;
  notes?: string;
}) => {
  const response = await apiClient.post('/attendance/employee-locations/assign', payload);
  return response.data;
};

export const bulkSaveEmployeeLocationAccess = async (payload: {
  employeeIds: string[];
  assignedLocationIds: string[];
  overwriteMode?: boolean;
}) => {
  const response = await apiClient.post('/attendance/employee-locations/bulk-assign', payload);
  return response.data;
};
