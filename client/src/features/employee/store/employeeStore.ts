import { create } from 'zustand';
import type {  Employee  } from '@/types';

interface EmployeeFilters {
  search?: string;
  status?: string;
  departmentId?: number;
  branchId?: number;
}

interface EmployeeStore {
  // State
  employees: Employee[];
  selectedEmployee: Employee | null;
  filters: EmployeeFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  setEmployees: (employees: Employee[]) => void;
  setSelectedEmployee: (employee: Employee | null) => void;
  setFilters: (filters: EmployeeFilters) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearFilters: () => void;

  // Helpers
  getEmployeeById: (id: number) => Employee | undefined;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: number, updates: Partial<Employee>) => void;
  removeEmployee: (id: number) => void;
}

export const useEmployeeStore = create<EmployeeStore>((set, get) => ({
  // Initial state
  employees: [],
  selectedEmployee: null,
  filters: {},
  isLoading: false,
  error: null,

  // Actions
  setEmployees: (employees) => set({ employees }),
  setSelectedEmployee: (employee) => set({ selectedEmployee: employee }),
  setFilters: (filters) => set({ filters }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  clearFilters: () => set({ filters: {} }),

  // Helpers
  getEmployeeById: (id) => {
    const { employees } = get();
    return employees.find((e) => e.id === id);
  },

  addEmployee: (employee) => {
    set((state) => ({
      employees: [employee, ...state.employees],
    }));
  },

  updateEmployee: (id, updates) => {
    set((state) => ({
      employees: state.employees.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
      selectedEmployee:
        state.selectedEmployee?.id === id
          ? { ...state.selectedEmployee, ...updates }
          : state.selectedEmployee,
    }));
  },

  removeEmployee: (id) => {
    set((state) => ({
      employees: state.employees.filter((e) => e.id !== id),
      selectedEmployee:
        state.selectedEmployee?.id === id ? null : state.selectedEmployee,
    }));
  },
}));

