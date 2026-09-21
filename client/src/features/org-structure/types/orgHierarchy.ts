export type OrgNodeType = 'root' | 'cxo' | 'department' | 'position';

export interface HierarchyRule {
  id: string;
  designationOrRole: string; // e.g., 'Employee', 'Intern', 'Team Lead', 'Project Manager', 'IT Head', 'HR Manager'
  allowedParentDesignations: string[]; // e.g., ['Team Lead'] for 'Employee'
  departmentScope?: string; // Optional department filter e.g., 'IT Department'
  hierarchyLevel: number; // e.g., 1 for CEO, 2 for CXOs, 3 for Dept Head, 4 for PM, 5 for TL, 6 for Employee, 7 for Intern
}

export interface ValidationResult {
  isValid: boolean;
  errorTitle?: string;
  errorMessage?: string;
}

export interface HierarchyConfig {
  rules: HierarchyRule[];
  allowSameDepartmentOnly?: boolean;
}

export interface TreeNodeData {
  id: string | number;
  nodeType: OrgNodeType;
  name: string;
  designation: string;
  role: string;
  department: string;
  reportingManagerName?: string;
  hierarchyLevel: number;
  empId?: number;
  isDepartmentNode?: boolean;
  children?: TreeNodeData[];
  originalEmp?: any;
}
