import { HR_MODULES } from './hr_modules/hr';
import { MANAGER_MODULES } from './manager_modules/manager';
import { TL_MODULES } from './tl_modules/tl';
import { EMP_MODULES } from './emp_modules/emp';

export interface ModuleNode {
  id: string;
  name: string;
  description?: string;
  badge?: string;
  iconName?: string;
  defaultEnabled?: boolean;
  children?: ModuleNode[];
}

export type RoleType = 'hr' | 'manager' | 'tl' | 'emp';

export interface RoleModulesMap {
  [nodeId: string]: boolean;
}

export type ModulesStateMap = Record<RoleType, RoleModulesMap>;

export const ROLE_MODULES: Record<RoleType, ModuleNode[]> = {
  hr: HR_MODULES,
  manager: MANAGER_MODULES,
  tl: TL_MODULES,
  emp: EMP_MODULES,
};

export const ROLE_LABELS: Record<RoleType, { title: string; subtitle: string; iconName: string; color: string }> = {
  hr: {
    title: 'HR',
    subtitle: 'Human Resources, Recruitment, Payroll & Compliance',
    iconName: 'Users',
    color: 'bg-blue-600 text-white',
  },
  manager: {
    title: 'Manager',
    subtitle: 'Departmental Strategy, Resource Planning & Analytics',
    iconName: 'Briefcase',
    color: 'bg-indigo-600 text-white',
  },
  tl: {
    title: 'Team Lead',
    subtitle: 'Team Allocation, Approvals, Workload & Meetings',
    iconName: 'UserCheck',
    color: 'bg-emerald-600 text-white',
  },
  emp: {
    title: 'Employee',
    subtitle: 'Personal Self-Service, Attendance, Leaves & Pay',
    iconName: 'User',
    color: 'bg-purple-600 text-white',
  },
};

const STORAGE_KEY = 'apponext_module_management_state_v1';

// Helper to flatten tree into map of default state
export function getDefaultStateForRole(role: RoleType): RoleModulesMap {
  const map: RoleModulesMap = {};
  function traverse(nodes: ModuleNode[]) {
    for (const node of nodes) {
      map[node.id] = node.defaultEnabled !== false;
      if (node.children) {
        traverse(node.children);
      }
    }
  }
  traverse(ROLE_MODULES[role] || []);
  return map;
}

export function getDefaultModulesState(): ModulesStateMap {
  return {
    hr: getDefaultStateForRole('hr'),
    manager: getDefaultStateForRole('manager'),
    tl: getDefaultStateForRole('tl'),
    emp: getDefaultStateForRole('emp'),
  };
}

export function loadModulesState(): ModulesStateMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultModulesState();
    const parsed = JSON.parse(raw);
    return {
      hr: { ...getDefaultStateForRole('hr'), ...(parsed.hr || {}) },
      manager: { ...getDefaultStateForRole('manager'), ...(parsed.manager || {}) },
      tl: { ...getDefaultStateForRole('tl'), ...(parsed.tl || {}) },
      emp: { ...getDefaultStateForRole('emp'), ...(parsed.emp || {}) },
    };
  } catch (e) {
    console.warn('[Modules] Failed to load modules state from localStorage:', e);
    return getDefaultModulesState();
  }
}

export function saveModulesState(state: ModulesStateMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('apponext_modules_updated'));
  } catch (e) {
    console.warn('[Modules] Failed to save modules state to localStorage:', e);
  }
}
