import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface EmployeeCustomizationConfig {
  companyId?: number;
  // ── 1. Page Actions & Features ──
  enableBulkUpload: boolean;
  enableAddEmployee: boolean;
  enableSearchBar: boolean;
  enableFilterOption: boolean;
  enablePagination: boolean;
  defaultPageSize: number;

  // ── 2. Add Employee Form: Basic Info ──
  enableCustomEmployeeCodeFormat: boolean;
  customEmployeeCodePrefix: string; // e.g. "EMP-", "NX-2026-"
  customEmployeeCodeDigits: number; // e.g. 3 (001), 4 (0001)
  basicInfoFields: {
    employeeCode: boolean;
    firstName: boolean;
    lastName: boolean;
    email: boolean;
    mobile: boolean;
    dateOfJoining: boolean;
    departmentId: boolean;
    designationId: boolean;
    employmentType: boolean;
    status: boolean;
    locationId: boolean;
    reportingManagerId: boolean;
    accessRole: boolean;
    avatarUrl: boolean;
  };

  // ── 3. Add Employee Form: Personal Info ──
  enableCustomPasswordFormat: boolean;
  customPasswordPrefix: string; // e.g. "Appo@"
  personalInfoFields: {
    password: boolean;
    gender: boolean;
    dateOfBirth: boolean;
    maritalStatus: boolean;
    bloodGroup: boolean;
    personalEmail: boolean;
    emergencyContactName: boolean;
    emergencyContactPhone: boolean;
    address: boolean;
  };

  // ── 4. Add Employee Form: Professional Info ──
  professionalInfoFields: {
    jobTitle: boolean;
    gradeId: boolean;
    highestQualification: boolean;
    workExperienceYears: boolean;
    previousCompany: boolean;
    noticePeriodDays: boolean;
    probationMonths: boolean;
    skills: boolean;
  };

  // ── 5. Add Employee Form: Bank & Statutory Details ──
  bankDetailsFields: {
    bankName: boolean;
    accountNo: boolean;
    ifscCode: boolean;
    branchName: boolean;
    pan: boolean;
    uanNo: boolean;
    esicNo: boolean;
    salarySlabId: boolean;
    annualCtc: boolean;
  };

  // ── 6. Employee Table Columns Customization ──
  tableColumns: {
    employeeNameAvatar: boolean;
    employeeCode: boolean;
    contactInfo: boolean;
    statusBadge: boolean;
    accessRole: boolean;
    department: boolean;
    designation: boolean;
    employmentType: boolean;
    location: boolean;
    reportingManager: boolean;
    dateOfJoining: boolean;
    actions: boolean;
    actionViewProfile: boolean;
    actionEdit: boolean;
    actionDelete: boolean;
  };
}

const DEFAULT_CONFIG: EmployeeCustomizationConfig = {
  enableBulkUpload: true,
  enableAddEmployee: true,
  enableSearchBar: true,
  enableFilterOption: true,
  enablePagination: true,
  defaultPageSize: 25,

  enableCustomEmployeeCodeFormat: false,
  customEmployeeCodePrefix: 'EMP-',
  customEmployeeCodeDigits: 3,
  basicInfoFields: {
    employeeCode: true,
    firstName: true,
    lastName: true,
    email: true,
    mobile: true,
    dateOfJoining: true,
    departmentId: true,
    designationId: true,
    employmentType: true,
    status: true,
    locationId: true,
    reportingManagerId: true,
    accessRole: true,
    avatarUrl: true,
  },

  enableCustomPasswordFormat: false,
  customPasswordPrefix: 'Appo@',
  personalInfoFields: {
    password: true,
    gender: true,
    dateOfBirth: true,
    maritalStatus: true,
    bloodGroup: true,
    personalEmail: true,
    emergencyContactName: true,
    emergencyContactPhone: true,
    address: true,
  },

  professionalInfoFields: {
    jobTitle: true,
    gradeId: true,
    highestQualification: true,
    workExperienceYears: true,
    previousCompany: true,
    noticePeriodDays: true,
    probationMonths: true,
    skills: true,
  },

  bankDetailsFields: {
    bankName: true,
    accountNo: true,
    ifscCode: true,
    branchName: true,
    pan: true,
    uanNo: true,
    esicNo: true,
    salarySlabId: true,
    annualCtc: true,
  },

  tableColumns: {
    employeeNameAvatar: true,
    employeeCode: true,
    contactInfo: true,
    statusBadge: true,
    accessRole: true,
    department: true,
    designation: true,
    employmentType: true,
    location: true,
    reportingManager: true,
    dateOfJoining: true,
    actions: true,
    actionViewProfile: true,
    actionEdit: true,
    actionDelete: true,
  },
};

interface EmployeeCustomizationStore {
  config: EmployeeCustomizationConfig;
  updateConfig: (patch: Partial<EmployeeCustomizationConfig>) => void;
  updateBasicField: (field: keyof EmployeeCustomizationConfig['basicInfoFields'], enabled: boolean) => void;
  updatePersonalField: (field: keyof EmployeeCustomizationConfig['personalInfoFields'], enabled: boolean) => void;
  updateProfessionalField: (field: keyof EmployeeCustomizationConfig['professionalInfoFields'], enabled: boolean) => void;
  updateBankField: (field: keyof EmployeeCustomizationConfig['bankDetailsFields'], enabled: boolean) => void;
  updateTableColumn: (col: keyof EmployeeCustomizationConfig['tableColumns'], enabled: boolean) => void;
  generateEmployeeCode: (nextIndex: number) => string;
  generatePassword: () => string;
  resetToDefaults: () => void;
}

export const useEmployeeCustomizationStore = create<EmployeeCustomizationStore>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      updateConfig: (patch) =>
        set((state) => ({
          config: { ...state.config, ...patch },
        })),
      updateBasicField: (field, enabled) =>
        set((state) => ({
          config: {
            ...state.config,
            basicInfoFields: { ...state.config.basicInfoFields, [field]: enabled },
          },
        })),
      updatePersonalField: (field, enabled) =>
        set((state) => ({
          config: {
            ...state.config,
            personalInfoFields: { ...state.config.personalInfoFields, [field]: enabled },
          },
        })),
      updateProfessionalField: (field, enabled) =>
        set((state) => ({
          config: {
            ...state.config,
            professionalInfoFields: { ...state.config.professionalInfoFields, [field]: enabled },
          },
        })),
      updateBankField: (field, enabled) =>
        set((state) => ({
          config: {
            ...state.config,
            bankDetailsFields: { ...state.config.bankDetailsFields, [field]: enabled },
          },
        })),
      updateTableColumn: (col, enabled) =>
        set((state) => ({
          config: {
            ...state.config,
            tableColumns: { ...state.config.tableColumns, [col]: enabled },
          },
        })),
      generateEmployeeCode: (nextIndex: number) => {
        const { config } = get();
        if (config.enableCustomEmployeeCodeFormat) {
          const prefix = config.customEmployeeCodePrefix || 'EMP-';
          const digits = Math.max(1, config.customEmployeeCodeDigits || 3);
          return `${prefix}${String(nextIndex).padStart(digits, '0')}`;
        }
        return `EMP${String(nextIndex % 1000).padStart(3, '0')}`;
      },
      generatePassword: () => {
        const { config } = get();
        if (config.enableCustomPasswordFormat && config.customPasswordPrefix) {
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          return `${config.customPasswordPrefix}${randomSuffix}`;
        }
        return `Appo@${new Date().getFullYear()}`;
      },
      resetToDefaults: () =>
        set(() => ({
          config: DEFAULT_CONFIG,
        })),
    }),
    {
      name: 'apponext_employee_customization_v1',
    }
  )
);
