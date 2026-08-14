import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import type {  Employee, EmployeeCreate  } from '@/types';

interface ListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  status?: string;
  employmentType?: string;
  departmentId?: number;
}

/**
 * Hook to fetch a single employee
 */
export function useEmployee(employeeId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const response = await apiClient.get(`/employees/${employeeId}`);
      return (response.data?.data ?? response.data) as Employee;
    },
    enabled: employeeId > 0,
  });

  return {
    employee: data || null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to fetch employee list
 */
export function useEmployees(options: ListOptions = {}) {
  const { selectedCompanyId } = useCompanyStore();
  const {
    page = 1,
    pageSize = 25,
    search = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
    status = '',
    employmentType = '',
    departmentId,
  } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employees', selectedCompanyId, page, pageSize, search, sortBy, sortOrder, status, employmentType, departmentId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search && { search }),
        sortBy,
        sortOrder,
        ...(status && { status }),
        ...(employmentType && { employmentType }),
        ...(departmentId !== undefined && { departmentId: String(departmentId) }),
      });

      const response = await apiClient.get(`/employees?${params}`);
      return response.data;
    },
  });

  const employeeList = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.data?.items)
      ? data.data.items
      : (Array.isArray(data?.items)
        ? data.items
        : (Array.isArray(data) ? data : [])));

  const totalCount = data?.pagination?.total ?? data?.meta?.total ?? data?.total ?? (Array.isArray(employeeList) ? employeeList.length : 0);

  return {
    employees: employeeList,
    total: totalCount,
    meta: data?.meta || data?.pagination,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to create employee
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: EmployeeCreate) => {
      setError(null);
      const response = await apiClient.post('/employees', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => {
      const errorData = err.response?.data?.error;
      const message = errorData?.details?.message || errorData?.message || err.response?.data?.message || 'Failed to create employee';
      setError(message);
      throw err;
    },
  });

  return {
    createEmployee: mutateAsync,
    isLoading: isPending,
    error,
  };
}

/**
 * Hook to update employee
 */
export function useUpdateEmployee(employeeId: number) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      setError(null);
      const response = await apiClient.patch(`/employees/${employeeId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'Failed to update employee';
      setError(message);
      throw err;
    },
  });

  return {
    updateEmployee: mutateAsync,
    isLoading: isPending,
    error,
  };
}

/**
 * Hook to delete employee
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (employeeId: number) => {
      setError(null);
      await apiClient.delete(`/employees/${employeeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'Failed to delete employee';
      setError(message);
      throw err;
    },
  });

  return {
    deleteEmployee: mutateAsync,
    isLoading: isPending,
    error,
  };
}

/**
 * Hook to get direct reports
 */
export function useDirectReports(managerId: number, options: ListOptions = {}) {
  const { page = 1, pageSize = 20 } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['directReports', managerId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      const response = await apiClient.get(
        `/employees/${managerId}/direct-reports?${params}`
      );
      return response.data;
    },
    enabled: managerId > 0,
  });

  return {
    directReports: data?.data || [],
    total: data?.meta?.total || 0,
    meta: data?.meta,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to bulk upload employees
 */
export function useBulkUploadEmployees() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (employees: Partial<Employee>[]) => {
      setError(null);
      const response = await apiClient.post('/employees/bulk', { employees });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => {
      const errorData = err.response?.data?.error;
      const message = errorData?.message || err.response?.data?.message || 'Failed to import employees';
      const details = errorData?.details?.message || (typeof errorData?.details === 'string' ? errorData.details : '');
      const fullMessage = details ? `${message}: ${details}` : message;
      setError(fullMessage);
      throw err;
    },
  });

  return {
    bulkUploadEmployees: mutateAsync,
    isLoading: isPending,
    error,
  };
}


