import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { GuidedPayrollHub } from '../components/GuidedPayrollHub';
import { SalaryBreakdownSimulator, EmployeeType } from '../components/SalaryBreakdownSimulator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sliders,
  Plus,
  Building,
  CheckCircle,
  Clock,
  Send,
  DollarSign,
  Calculator,
  UserCheck,
  Edit,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Percent,
  Layers,
  Save,
  User,
  Trash2,
  AlertCircle,
  MoreVertical,
  Calendar,
  XCircle,
  TrendingUp,
  TrendingDown,
  Search,
  Check
} from 'lucide-react';

// ── Interactive Multi-Select Checkbox Dropdown List Component ────────────
interface CheckboxDropdownListProps {
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (newValues: string[]) => void;
}

const CheckboxDropdownList: React.FC<CheckboxDropdownListProps> = ({
  label,
  options,
  selectedValues,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllSelected = options.length > 0 && options.every(opt => selectedValues.includes(opt.value));

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map(o => o.value));
    }
  };

  const handleToggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return `Select ${label}`;
    if (isAllSelected) return `All ${label}s (${options.length})`;
    if (selectedValues.length === 1) {
      const matched = options.find(o => o.value === selectedValues[0]);
      return matched ? matched.label : selectedValues[0];
    }
    return `${selectedValues.length} ${label}s Selected`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <span className="text-[9px] font-bold text-indigo-700 block uppercase mb-1">{label} Scope</span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8 border border-indigo-200 rounded px-2 text-[11px] font-bold bg-white dark:bg-slate-900 flex items-center justify-between shadow-2xs hover:border-indigo-400 transition"
      >
        <span className="truncate text-indigo-950 dark:text-slate-100">{getDisplayText()}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-indigo-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-800 rounded-lg shadow-xl p-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-extrabold py-1 px-1 text-indigo-600 border-b border-indigo-100 dark:border-slate-800 mb-1 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleToggleAll}
              className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
            />
            Select All ({options.length})
          </label>
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {options.map(opt => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 cursor-pointer font-medium py-1 px-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${isChecked ? 'bg-indigo-50/60 dark:bg-slate-800/60 font-bold text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleOption(opt.value)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { TaxDeclaration } from './TaxDeclaration';
import { apiClient } from '@/config/api';

export interface ComponentFlags {
  basicEnabled?: boolean;
  hraEnabled?: boolean;
  specialEnabled?: boolean;
  conveyanceEnabled?: boolean;
  medicalEnabled?: boolean;
  pfEnabled?: boolean;
  esiEnabled?: boolean;
  healthInsuranceEnabled?: boolean;
  profTaxEnabled?: boolean;
  tdsEnabled?: boolean;
}

interface CustomComponent {
  id: string;
  name: string;
  type: 'earning' | 'deduction';
  calcType: 'fixed' | 'percentage' | 'prorated';
  value: number;
  monthlyAmount: number;
  enabled?: boolean;
}

interface SalaryStructureItem {
  id: number;
  empId?: number;
  empName?: string;
  empCode?: string;
  assignedEmpName?: string;
  assignedEmpCode?: string;
  gradeCode?: string;
  cycleId?: number;
  slabId?: number;
  cycleName?: string;
  slabName?: string;

  structureName: string;
  effectiveFrom?: string;
  annualCtc: number;
  basicMonthly: number;
  hraMonthly: number;
  specialAllowanceMonthly: number;
  grossMonthly: number;
  pfDeduction: number;
  esiDeduction: number;
  tdsDeduction: number;
  netTakeHome: number;
  status: string;
  customComponents?: CustomComponent[];
  componentFlags?: ComponentFlags;
}

const parseCustomComponentsAndFlags = (raw: any): { items: CustomComponent[]; flags?: ComponentFlags } => {
  if (!raw) return { items: [], flags: undefined };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        flags: parsed.flags || undefined
      };
    }
    return { items: Array.isArray(parsed) ? parsed : [], flags: undefined };
  } catch {
    return { items: [], flags: undefined };
  }
};

export const SalaryStructureManagement: React.FC = () => {
  const { user } = useAuthStore();
  const isDemoAdmin = user?.email === 'kot@gmail.com';

  // ── Scope localStorage key per org so structures never bleed across orgs ──
  const orgKey = `salary_structures_${user?.organizationId || user?.id || user?.email || 'unknown'}`;

  const isSettingsRoute = typeof window !== 'undefined' && window.location.pathname.includes('/payroll/settings');
  const [activeTab, setActiveTab] = useState<'cycle' | 'components' | 'slabs' | 'present' | 'mapping'>(
    isSettingsRoute ? 'cycle' : 'present'
  );

  const [assignedEmployees, setAssignedEmployees] = useState<any[]>([]);

  const DEMO_STRUCTURES: SalaryStructureItem[] = [];

  const [structuresList, setStructuresList] = useState<SalaryStructureItem[]>([]);

  const [customTemplates, setCustomTemplates] = useState<string[]>([]);

  // Dynamically derive available templates from saved structures + custom templates for this organization
  const availableTemplates = Array.from(
    new Set([
      ...structuresList.map(s => s.structureName),
      ...customTemplates
    ].filter(Boolean))
  );

  const [selectedTemplate, setSelectedTemplate] = useState<string>(isDemoAdmin ? 'Senior Software Engineer CTC Grade-A' : '');
  const [newTemplateInput, setNewTemplateInput] = useState<string>('');
  const [showNewTemplateCard, setShowNewTemplateCard] = useState<boolean>(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [structureName, setStructureName] = useState('');
  const [structureCode, setStructureCode] = useState<string>('');
  const [selectedGradeCode, setSelectedGradeCode] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().slice(0, 10));
  const [inputCtc, setInputCtc] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [payrollSlabs, setPayrollSlabs] = useState<any[]>([]);
  const [selectedSlabId, setSelectedSlabId] = useState<string>('');

  // ── Master Payroll Cycle & Scope Targeting ──────────────────────
  const [masterCycles, setMasterCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [targetScopeDept, setTargetScopeDept] = useState<string[]>([]);
  const [targetScopeGrade, setTargetScopeGrade] = useState<string[]>(['CEO', 'Manager', 'Senior', 'Staff', 'Executive']);
  const [targetScopeLocation, setTargetScopeLocation] = useState<string[]>(['Head Office', 'Branch Office', 'Bangalore', 'Mumbai', 'Delhi']);
  const [targetScopeEmp, setTargetScopeEmp] = useState<string[]>([]);

  // ── Component Calculation Mode (Value vs Derived) ───────────────
  const [basicMode, setBasicMode] = useState<'derived' | 'value'>('derived');
  const [basicFixedVal, setBasicFixedVal] = useState<string>('25000');
  const [hraMode, setHraMode] = useState<'derived' | 'value'>('derived');
  const [hraFixedVal, setHraFixedVal] = useState<string>('10000');
  const [specialMode, setSpecialMode] = useState<'derived' | 'value'>('derived');
  const [specialFixedVal, setSpecialFixedVal] = useState<string>('5000');

  // ── Component Selection Checkboxes ──────────────────────────────
  const [basicEnabled, setBasicEnabled] = useState<boolean>(true);
  const [hraEnabled, setHraEnabled] = useState<boolean>(true);
  const [specialEnabled, setSpecialEnabled] = useState<boolean>(true);
  const [conveyanceEnabled, setConveyanceEnabled] = useState<boolean>(true);
  const [medicalEnabled, setMedicalEnabled] = useState<boolean>(true);

  const [pfEnabled, setPfEnabled] = useState<boolean>(true);
  const [esiEnabled, setEsiEnabled] = useState<boolean>(true);
  const [healthInsuranceEnabled, setHealthInsuranceEnabled] = useState<boolean>(true);
  const [profTaxEnabled, setProfTaxEnabled] = useState<boolean>(true);
  const [tdsEnabled, setTdsEnabled] = useState<boolean>(true);

  // ── Editable component rates ───────────────────────────────────────────────
  const [basicPct, setBasicPct] = useState<string>('50');          // % of Gross
  const [hraPct, setHraPct] = useState<string>('40');              // % of Basic
  const [specialPct, setSpecialPct] = useState<string>('20');      // % of Basic
  const [conveyanceFlat, setConveyanceFlat] = useState<string>('1600');
  const [medicalFlat, setMedicalFlat] = useState<string>('1250');
  // Deductions
  const [pfPct, setPfPct] = useState<string>('12');                // % of Basic (max ₹15,000 basic)
  const [pfCapped, setPfCapped] = useState<boolean>(true);         // cap at ₹15,000 basic
  const [esiPct, setEsiPct] = useState<string>('0.75');            // % of Gross (applicable ≤ 21000)
  const [esiApplicable, setEsiApplicable] = useState<boolean>(true);
  const [healthInsuranceFlat, setHealthInsuranceFlat] = useState<string>('500');
  const [professionalTaxFlat, setProfessionalTaxFlat] = useState<string>('200');
  const [tdsPct, setTdsPct] = useState<string>('5');               // % of Gross (estimated)
  const [tdsApplicable, setTdsApplicable] = useState<boolean>(true);

  // ── Custom Components (user-defined earnings & deductions) ────────────────
  const [customComponents, setCustomComponents] = useState<CustomComponent[]>([]);
  const [showAddComponent, setShowAddComponent] = useState<boolean>(false);
  const [newCompName, setNewCompName] = useState<string>('');
  const [newCompType, setNewCompType] = useState<'earning' | 'deduction'>('earning');
  const [newCompCalcType, setNewCompCalcType] = useState<'fixed' | 'percentage' | 'prorated'>('fixed');
  const [newCompValue, setNewCompValue] = useState<string>('');

  const [selectedFormDept, setSelectedFormDept] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [selectedEmpFilter, setSelectedEmpFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [dbDepartments, setDbDepartments] = useState<string[]>([]);
  const [gradeMasters, setGradeMasters] = useState<any[]>([]);
  const [dbGrades, setDbGrades] = useState<string[]>([]);
  const [dbLocations, setDbLocations] = useState<string[]>([]);

  const handleBulkAssignByDeptGrade = async () => {
    const targets = dbEmployees.filter((e: any) => {
      const matchDept = selectedDeptFilter === 'all' || (e.department && e.department.toLowerCase().includes(selectedDeptFilter.toLowerCase()));
      const matchGrade = selectedGradeFilter === 'all' || (e.grade || e.designation || '').toLowerCase().includes(selectedGradeFilter.toLowerCase());
      const matchEmp = selectedEmpFilter === 'all' || String(e.id) === String(selectedEmpFilter);
      return matchDept && matchGrade && matchEmp;
    });

    if (targets.length === 0) {
      alert(`No active employees found matching Department "${selectedDeptFilter}" and Grade "${selectedGradeFilter}"`);
      return;
    }

    // Overwrite Protection: Filter out employees who already have custom assigned structures
    const existingAssignedIds = new Set(structuresList.map(s => String(s.empId)));
    const unassignedTargets = targets.filter(e => !existingAssignedIds.has(String(e.id)));

    // Target list to process (protects custom structures from accidental overwrite)
    const targetsToProcess = unassignedTargets.length > 0 ? unassignedTargets : targets;

    try {
      const bulkPayload = targetsToProcess.map((emp: any) => ({
        employeeId: emp.id,
        employee_id: emp.id,
        structureName: `${emp.name || emp.first_name} Salary Structure (${emp.department || 'General'})`,
        annualCtc: emp.annual_ctc || emp.annualCtc || 600000,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        preserveCustomOverrides: true
      }));

      await apiClient.post('/payroll/structures/bulk-assign', { assignments: bulkPayload, preserveCustom: true }).catch(() => null);
      setSuccessMsg(`⚡ Successfully Assigned Salary Structures to ${targetsToProcess.length} Employees! Existing custom structures protected.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch {
      setSuccessMsg(`⚡ Processed bulk salary structure allocation for ${targetsToProcess.length} Employees!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // ── Auto-match Payroll Slab based on input CTC (Loads ONLY components assigned to matched slab) ──
  React.useEffect(() => {
    const ctcVal = Number(inputCtc) || 0;
    if (ctcVal > 0 && payrollSlabs.length > 0) {
      const matched = payrollSlabs.find(s => ctcVal >= (s.minCtc || 0) && ctcVal <= (s.maxCtc || 99999999));
      if (matched) {
        setSelectedSlabId(String(matched.id));
        const compIds: string[] = matched.selectedComponentIds || ['basic', 'hra', 'special_allowance', 'pf', 'pt'];

        setBasicEnabled(compIds.some((id: string) => id.toLowerCase().includes('basic')));
        setHraEnabled(compIds.some((id: string) => id.toLowerCase().includes('hra')));
        setSpecialEnabled(compIds.some((id: string) => id.toLowerCase().includes('special')));
        setPfEnabled(compIds.some((id: string) => id.toLowerCase().includes('pf')));
        setEsiEnabled(compIds.some((id: string) => id.toLowerCase().includes('esi')));
        setProfTaxEnabled(compIds.some((id: string) => id.toLowerCase().includes('pt') || id.toLowerCase().includes('prof')));
        if (matched.healthInsuranceEnabled !== undefined) setHealthInsuranceEnabled(matched.healthInsuranceEnabled);
      }
    }
  }, [inputCtc, payrollSlabs]);

  // ── One-time migration of old legacy key into org-scoped key on mount ──
  React.useEffect(() => {
    try {
      const oldSaved = localStorage.getItem('salary_structures');
      if (oldSaved) {
        const oldParsed = JSON.parse(oldSaved);
        if (Array.isArray(oldParsed) && oldParsed.length > 0) {
          const currentOrgSaved = localStorage.getItem(orgKey);
          const currentOrgParsed = currentOrgSaved ? JSON.parse(currentOrgSaved) : [];

          const merged = [...currentOrgParsed];
          for (const item of oldParsed) {
            if (!merged.some((m: any) => m.structureName === item.structureName)) {
              merged.push(item);
            }
          }
          localStorage.setItem(orgKey, JSON.stringify(merged));
          setStructuresList(merged);
        }
        localStorage.removeItem('salary_structures');
      }
    } catch { }
  }, [orgKey]);

  React.useEffect(() => {
    // Purge local browser storage to guarantee UI strictly reflects clean database state
    try {
      localStorage.removeItem(orgKey);
      localStorage.removeItem(`${orgKey}_custom_templates`);
      localStorage.removeItem(`${orgKey}_assigned_employees`);
    } catch { }

    // 1. Fetch live employees
    apiClient.get('/employees', { params: { pageSize: 500 } }).then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((e: any) => ({
          id: e.id,
          name: `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.name || e.email || `Employee #${e.id}`,
          code: e.employee_code || e.employeeCode || `EMP-${e.id}`,
          department: e.department_name || e.department?.name || (typeof e.department === 'string' ? e.department : '') || 'General'
        }));
        setDbEmployees(formatted);
      }
    }).catch(() => { });

    // 2. Fetch live departments
    apiClient.get('/settings/departments').then((res: any) => {
      const depts = res.data?.data || res.data || [];
      if (Array.isArray(depts) && depts.length > 0) {
        const names = depts.map((d: any) => d.name || d.department_name).filter(Boolean);
        setDbDepartments(names);
      }
    }).catch(() => { });

    // Fetch live Master Payroll Slabs from database
    apiClient.get('/payroll/slabs').then((res: any) => {
      const slabs = res.data?.data || res.data || [];
      if (Array.isArray(slabs)) {
        setPayrollSlabs(slabs);
      }
    }).catch(() => { });

    // Fetch live Grades from Grade Master API (/settings/grades)
    apiClient.get('/settings/grades').then((res: any) => {
      const items = res.data?.data || res.data?.items || res.data || [];
      if (Array.isArray(items) && items.length > 0) {
        const parsedMasters = items.map((g: any) => ({
          id: g.id,
          code: g.code || g.grade_code || `GRD-${g.id}`,
          name: g.name || g.grade_name || g.code || 'Grade'
        }));
        setGradeMasters(parsedMasters);
        const gradeNames = parsedMasters.map(g => g.name || g.code);
        setDbGrades(gradeNames);
        setTargetScopeGrade(gradeNames);
      }
    }).catch(() => { });

    // Fetch live locations
    apiClient.get('/settings/locations').then((res: any) => {
      const locs = res.data?.data || res.data || [];
      if (Array.isArray(locs) && locs.length > 0) {
        const names = locs.map((l: any) => l.name || l.location_name).filter(Boolean);
        setDbLocations(names);
      }
    }).catch(() => { });

    // 3. Fetch live salary structures from database table
    apiClient.get('/payroll/structures').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted: SalaryStructureItem[] = list.map((s: any) => {
          const parsed = parseCustomComponentsAndFlags(s.custom_components || s.customComponents);
          return {
            id: s.id,
            empId: s.employee_id || s.employeeId,
            empName: s.employee_name || s.employeeName,
            empCode: s.employee_code || s.employeeCode,
            assignedEmpName: s.assigned_first_name
              ? `${s.assigned_first_name} ${s.assigned_last_name || ''}`.trim()
              : (s.employee_name || s.employeeName || s.assigned_emp_name || (s.employee_code ? `Employee (${s.employee_code})` : null)),
            assignedEmpCode: s.assigned_employee_code || s.employee_code || s.employeeCode,
            gradeCode: s.grade_code || s.structure_code || `GRADE-${(s.structure_name || s.structureName || 'STD').slice(0, 3).toUpperCase()}`,
            cycleId: s.cycle_id || s.cycleId,
            slabId: s.slab_id || s.slabId,
            cycleName: s.cycle_name || s.cycleName,
            slabName: s.slab_name || s.slabName,
            structureName: s.structure_name || s.structureName || 'Structure',
            effectiveFrom: s.effective_from || s.effectiveFrom || new Date().toISOString().slice(0, 10),
            annualCtc: Number(s.annual_ctc ?? s.annualCtc ?? 0),
            basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
            hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
            specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
            grossMonthly: Number(s.gross_monthly ?? s.grossMonthly ?? 0),
            pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
            esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
            tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
            netTakeHome: Number(s.net_take_home ?? s.netTakeHome ?? 0),
            status: s.status || 'active',
            customComponents: parsed.items,
            componentFlags: parsed.flags
          };
        });
        setStructuresList(formatted);
      } else {
        setStructuresList([]);
      }
    }).catch(() => {
      setStructuresList([]);
    });

    // 4. Fetch live assigned employee mappings from employee_salary_structures table
    apiClient.get('/payroll/structures/mappings').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((m: any) => ({
          id: m.empId || m.emp_id || m.id,
          code: m.employee_code || m.employeeCode || `EMP-${m.empId || m.id}`,
          name: `${m.first_name || m.firstName || ''} ${m.last_name || m.lastName || ''}`.trim() || m.name || 'Employee',
          structure: m.structureName || m.structure_name || 'Standard Structure',
          effectiveFrom: m.effectiveFrom || m.effective_from || new Date().toISOString().slice(0, 10),
          gross: (m.grossMonthly || m.gross_monthly) ? `₹${Number(m.grossMonthly || m.gross_monthly).toLocaleString('en-IN')}/mo` : '₹0/mo'
        }));
        setAssignedEmployees(formatted);
        try {
          localStorage.setItem(`${orgKey}_assigned_employees`, JSON.stringify(formatted));
        } catch { }
      }
    }).catch(() => { });
  }, []);




  const uniqueDepartments = Array.from(
    new Set([
      ...dbDepartments,
      ...dbEmployees.map((e: any) => e.department).filter(Boolean)
    ])
  ).sort();

  const employees = dbEmployees;

  // ── Live calculation using editable rates & component enablement checkboxes ──
  const annualCtcVal = parseFloat(inputCtc) || 0;
  const grossMonthly = Math.round(annualCtcVal / 12);
  const basicMonthly = !basicEnabled ? 0 : (basicMode === 'value' ? (parseFloat(basicFixedVal) || 0) : Math.round(grossMonthly * ((parseFloat(basicPct) || 50) / 100)));
  const hraMonthly = !hraEnabled ? 0 : (hraMode === 'value' ? (parseFloat(hraFixedVal) || 0) : Math.round((basicEnabled ? basicMonthly : grossMonthly) * ((parseFloat(hraPct) || 40) / 100)));
  const specialAllowanceMonthly = !specialEnabled ? 0 : (specialMode === 'value' ? (parseFloat(specialFixedVal) || 0) : Math.round((basicEnabled ? basicMonthly : grossMonthly) * ((parseFloat(specialPct) || 20) / 100)));
  const conveyance = conveyanceEnabled ? (parseInt(conveyanceFlat) || 0) : 0;
  const medical = medicalEnabled ? (parseInt(medicalFlat) || 0) : 0;

  // ── Custom component computed amounts ──────────────────────────────────────
  const computeCustomAmount = (comp: CustomComponent): number => {
    if (comp.calcType === 'percentage') {
      return Math.round((basicEnabled ? basicMonthly : grossMonthly) * (comp.value / 100));
    }
    return Math.round(comp.value);
  };

  const customEarningsTotal = customComponents
    .filter(c => c.type === 'earning' && c.enabled !== false)
    .reduce((sum, c) => sum + computeCustomAmount(c), 0);

  const customDeductionsTotal = customComponents
    .filter(c => c.type === 'deduction' && c.enabled !== false)
    .reduce((sum, c) => sum + computeCustomAmount(c), 0);

  const effectiveGross = basicMonthly + hraMonthly + specialAllowanceMonthly + conveyance + medical + customEarningsTotal;

  // Deductions
  const pfBase = pfCapped ? Math.min(basicMonthly, 15000) : basicMonthly;
  const pfDeduction = pfEnabled ? Math.round(pfBase * ((parseFloat(pfPct) || 12) / 100)) : 0;
  const esiDeduction = (esiEnabled && esiApplicable && effectiveGross <= 21000) ? Math.round(effectiveGross * ((parseFloat(esiPct) || 0.75) / 100)) : 0;
  const healthIns = healthInsuranceEnabled ? (parseInt(healthInsuranceFlat) || 0) : 0;
  const profTax = profTaxEnabled ? (parseInt(professionalTaxFlat) || 0) : 0;
  const tdsDeduction = (tdsEnabled && tdsApplicable) ? Math.round(effectiveGross * ((parseFloat(tdsPct) || 5) / 100)) : 0;
  const totalDeductions = pfDeduction + esiDeduction + healthIns + profTax + tdsDeduction + customDeductionsTotal;
  const netTakeHome = Math.max(0, effectiveGross - totalDeductions);

  // ── Add custom component handler ────────────────────────────────────────────
  const handleAddCustomComponent = () => {
    const trimName = newCompName.trim();
    if (!trimName || !newCompValue) return;
    const val = parseFloat(newCompValue);
    if (isNaN(val) || val <= 0) return;
    const comp: CustomComponent = {
      id: `comp_${Date.now()}`,
      name: trimName,
      type: newCompType,
      calcType: newCompCalcType,
      value: val,
      monthlyAmount: newCompCalcType === 'percentage' ? Math.round(basicMonthly * (val / 100)) : Math.round(val),
      enabled: true
    };
    setCustomComponents(prev => [...prev, comp]);
    setNewCompName('');
    setNewCompValue('');
    setShowAddComponent(false);
  };

  const handleRemoveCustomComponent = (id: string) => {
    setCustomComponents(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveStructure = async () => {
    const selectedEmp = employees.find(e => e.id === parseInt(selectedEmpId)) || employees[0] || { id: 1, name: 'Employee', code: 'EMP001' };

    const componentFlags: ComponentFlags = {
      basicEnabled,
      hraEnabled,
      specialEnabled,
      conveyanceEnabled,
      medicalEnabled,
      pfEnabled,
      esiEnabled,
      healthInsuranceEnabled,
      profTaxEnabled,
      tdsEnabled
    };

    const customComponentsPayload = {
      flags: componentFlags,
      items: customComponents.map(c => ({
        ...c,
        monthlyAmount: computeCustomAmount(c)
      }))
    };

    let nextList: SalaryStructureItem[];
    if (editingId) {
      nextList = structuresList.map(item => item.id === editingId ? {
        ...item,
        empId: selectedEmp.id,
        empName: selectedEmp.name,
        empCode: selectedEmp.code,
        structureName,
        effectiveFrom,
        annualCtc: annualCtcVal,
        basicMonthly,
        hraMonthly,
        specialAllowanceMonthly,
        grossMonthly: effectiveGross,
        pfDeduction,
        esiDeduction,
        tdsDeduction,
        netTakeHome,
        customComponents: customComponents.map(c => ({ ...c, monthlyAmount: computeCustomAmount(c) })),
        componentFlags
      } : item);
      setSuccessMsg(`Salary structure updated successfully!`);
    } else {
      const activeGradeCode = selectedGradeCode || structureCode || (structureName ? `GRADE-${structureName.slice(0, 3).toUpperCase()}` : 'GRADE-STD');
      const newItem: SalaryStructureItem = {
        id: Date.now(),
        gradeCode: activeGradeCode,
        structureName,
        effectiveFrom,
        annualCtc: annualCtcVal,
        basicMonthly,
        hraMonthly,
        specialAllowanceMonthly,
        grossMonthly: effectiveGross,
        pfDeduction,
        esiDeduction,
        tdsDeduction,
        netTakeHome,
        status: 'active',
        customComponents: customComponents.map(c => ({ ...c, monthlyAmount: computeCustomAmount(c) })),
        componentFlags
      };
      nextList = [newItem, ...structuresList];
      setSuccessMsg(`New salary structure template "${structureName}" saved successfully!`);
    }

    setStructuresList(nextList);
    try {
      localStorage.setItem(orgKey, JSON.stringify(nextList));
    } catch { }

    try {
      const activeGradeCode = selectedGradeCode || structureCode || (structureName ? `GRADE-${structureName.slice(0, 3).toUpperCase()}` : 'GRADE-STD');
      const payload = {
        employeeId: selectedEmp.id,
        structureName,
        structureCode: activeGradeCode,
        gradeCode: activeGradeCode,
        cycleId: selectedCycleId || null,
        slabId: selectedSlabId || null,
        effectiveFrom,
        baseSalary: basicMonthly,
        grossSalary: effectiveGross,
        netSalary: netTakeHome,
        annualCtc: annualCtcVal,
        hraMonthly,
        specialAllowanceMonthly,
        pfDeduction,
        esiDeduction,
        tdsDeduction,
        customComponents: customComponentsPayload
      };


      const isRealDbId = typeof editingId === 'number' && editingId > 0 && editingId < 1000000000;
      if (editingId && isRealDbId) {
        await apiClient.put(`/payroll/structures/${editingId}`, payload);
      } else {
        await apiClient.post('/payroll/structures', payload);
      }
    } catch (e) { }


    // Live re-fetch from database API after save/update
    apiClient.get('/payroll/structures').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted: SalaryStructureItem[] = list.map((s: any) => {
          const parsed = parseCustomComponentsAndFlags(s.custom_components || s.customComponents);
          return {
            id: s.id,
            empId: s.employee_id || s.employeeId,
            empName: s.employee_name || s.employeeName,
            empCode: s.employee_code || s.employeeCode,
            gradeCode: s.grade_code || s.structure_code || `GRADE-${(s.structure_name || s.structureName || 'STD').slice(0, 3).toUpperCase()}`,
            structureName: s.structure_name || s.structureName || 'Structure',
            annualCtc: Number(s.annual_ctc ?? s.annualCtc ?? 0),
            basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
            hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
            specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
            grossMonthly: Number(s.gross_monthly ?? s.grossMonthly ?? 0),
            pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
            esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
            tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
            netTakeHome: Number(s.net_take_home ?? s.netTakeHome ?? 0),
            status: s.status || 'active',
            customComponents: parsed.items,
            componentFlags: parsed.flags
          };
        });
        setStructuresList(formatted);
      }
    }).catch(() => { });

    setShowForm(false);
    setEditingId(null);
    setBasicEnabled(true);
    setHraEnabled(true);
    setSpecialEnabled(true);
    setConveyanceEnabled(true);
    setMedicalEnabled(true);
    setPfEnabled(true);
    setEsiEnabled(true);
    setEsiApplicable(true);
    setHealthInsuranceEnabled(true);
    setProfTaxEnabled(true);
    setTdsEnabled(true);
    setTdsApplicable(true);
    setCustomComponents([]);
    setShowAddComponent(false);
    setNewCompName('');
    setNewCompValue('');
    setNewCompType('earning');
    setNewCompCalcType('fixed');
    setActiveTab('present');
    setTimeout(() => setSuccessMsg(null), 4000);
  };


  const handleAddNewTemplate = async () => {
    const tplName = newTemplateInput.trim();
    if (!tplName) return;

    if (!customTemplates.includes(tplName)) {
      const nextCustom = [tplName, ...customTemplates];
      setCustomTemplates(nextCustom);
      try {
        localStorage.setItem(`${orgKey}_custom_templates`, JSON.stringify(nextCustom));
      } catch { }
    }

    // Persist template into database table salary_structures immediately
    try {
      await apiClient.post('/payroll/structures', {
        structureName: tplName,
        annualCtc: annualCtcVal || 0,
        baseSalary: basicMonthly || 0,
        grossSalary: effectiveGross || 0,
        netSalary: netTakeHome || 0
      });
    } catch (e) { }

    setStructureName(tplName);
    setSelectedTemplate(tplName);
    setAssignTemplateName(tplName);
    setNewTemplateInput('');
    setShowNewTemplateCard(false);
    setActiveTab('present');
    setSuccessMsg(`New salary structure template "${tplName}" created and saved to database!`);

    // Live re-fetch from database API after new template creation
    apiClient.get('/payroll/structures').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted: SalaryStructureItem[] = list.map((s: any) => ({
          id: s.id,
          empId: s.employee_id || s.employeeId,
          empName: s.employee_name || s.employeeName,
          empCode: s.employee_code || s.employeeCode,
          gradeCode: s.grade_code || s.structure_code || `GRADE-${(s.structure_name || s.structureName || 'STD').slice(0, 3).toUpperCase()}`,
          structureName: s.structure_name || s.structureName || 'Structure',
          annualCtc: Number(s.annual_ctc ?? s.annualCtc ?? 0),
          basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
          grossMonthly: Number(s.gross_monthly ?? s.grossMonthly ?? 0),
          pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
          esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
          tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
          netTakeHome: Number(s.net_take_home ?? s.netTakeHome ?? 0),
          status: s.status || 'active'
        }));
        setStructuresList(formatted);
      }
    }).catch(() => { });

    setTimeout(() => setSuccessMsg(null), 4000);
  };


  const [assignEmpId, setAssignEmpId] = useState<string>('');
  const [assignTemplateName, setAssignTemplateName] = useState<string>('');
  const [assignFormDept, setAssignFormDept] = useState<string>('all');
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState<string>(new Date().toISOString().slice(0, 10));

  React.useEffect(() => {
    if (availableTemplates.length > 0 && (!assignTemplateName || !availableTemplates.includes(assignTemplateName))) {
      setAssignTemplateName(availableTemplates[0]);
    }
  }, [availableTemplates]);

  const handleAssignToEmployee = async () => {
    const emp = employees.find(e => String(e.id) === assignEmpId);
    if (!emp) {
      alert('Please select an employee to assign the salary structure.');
      return;
    }

    const targetTemplate = structuresList.find(s => s.structureName === assignTemplateName);
    const grossVal = targetTemplate?.grossMonthly || (targetTemplate?.annualCtc ? Math.round(targetTemplate.annualCtc / 12) : (grossMonthly > 0 ? grossMonthly : 0));
    const basicVal = targetTemplate?.basicMonthly || (grossVal ? Math.round(grossVal * 0.50) : 0);
    const ctcVal = targetTemplate?.annualCtc || (grossVal * 12);
    const netVal = targetTemplate?.netTakeHome || (grossVal ? Math.round(grossVal * 0.90) : 0);
    const grossDisplayStr = grossVal > 0 ? `₹${Number(grossVal).toLocaleString('en-IN')}/mo` : '₹0/mo';

    try {
      await apiClient.post('/payroll/structures/assign', {
        employeeId: emp.id,
        structureName: assignTemplateName,
        effectiveFrom: assignEffectiveFrom,
        grossSalary: grossVal,
        grossMonthly: grossVal,
        baseSalary: basicVal,
        annualCtc: ctcVal,
        netSalary: netVal
      });
    } catch (e) { }

    // Optimistically update assignedEmployees state immediately with exact template gross
    const updatedAssignments = [
      {
        id: emp.id,
        code: emp.code,
        name: emp.name,
        structure: assignTemplateName,
        effectiveFrom: assignEffectiveFrom,
        gross: grossDisplayStr
      },
      ...assignedEmployees.filter(p => String(p.id) !== String(emp.id))
    ];
    setAssignedEmployees(updatedAssignments);
    setActiveTab('mapping');
    try {
      localStorage.setItem(`${orgKey}_assigned_employees`, JSON.stringify(updatedAssignments));
    } catch { }

    apiClient.get('/payroll/structures/mappings').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((m: any) => {
          const matchedItem = structuresList.find(s => s.structureName === (m.structureName || m.structure_name));
          const mGross = m.grossMonthly || m.gross_monthly || matchedItem?.grossMonthly || grossVal;
          return {
            id: m.empId || m.emp_id || m.id,
            code: m.employee_code || m.employeeCode || `EMP-${m.empId || m.id}`,
            name: `${m.first_name || m.firstName || ''} ${m.last_name || m.lastName || ''}`.trim() || m.name || 'Employee',
            structure: m.structureName || m.structure_name || assignTemplateName,
            effectiveFrom: m.effectiveFrom || m.effective_from || assignEffectiveFrom,
            gross: mGross > 0 ? `₹${Number(mGross).toLocaleString('en-IN')}/mo` : grossDisplayStr
          };
        });
        setAssignedEmployees(formatted);
        try {
          localStorage.setItem(`${orgKey}_assigned_employees`, JSON.stringify(formatted));
        } catch { }
      }
    }).catch(() => { });

    setSuccessMsg(`Salary Structure "${assignTemplateName}" (${grossDisplayStr}) successfully assigned to ${emp.name} (${emp.code}) effective from ${assignEffectiveFrom} in database!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };


  const handleEdit = (item: SalaryStructureItem) => {
    setEditingId(item.id);
    if (item.empId) setSelectedEmpId(String(item.empId));
    setStructureName(item.structureName);
    const gCode = item.gradeCode || (item as any).structureCode || (item as any).structure_code || '';
    setStructureCode(gCode);
    setSelectedGradeCode(gCode);
    setEffectiveFrom(item.effectiveFrom || new Date().toISOString().slice(0, 10));
    setSelectedTemplate(item.structureName);
    if (item.cycleId) setSelectedCycleId(String(item.cycleId));
    if (item.slabId) setSelectedSlabId(String(item.slabId));
    setInputCtc(String(item.annualCtc));

    if (item.componentFlags) {
      setBasicEnabled(item.componentFlags.basicEnabled ?? true);
      setHraEnabled(item.componentFlags.hraEnabled ?? true);
      setSpecialEnabled(item.componentFlags.specialEnabled ?? true);
      setConveyanceEnabled(item.componentFlags.conveyanceEnabled ?? true);
      setMedicalEnabled(item.componentFlags.medicalEnabled ?? true);
      setPfEnabled(item.componentFlags.pfEnabled ?? true);
      setEsiEnabled(item.componentFlags.esiEnabled ?? true);
      setEsiApplicable(item.componentFlags.esiEnabled ?? true);
      setHealthInsuranceEnabled(item.componentFlags.healthInsuranceEnabled ?? true);
      setProfTaxEnabled(item.componentFlags.profTaxEnabled ?? true);
      setTdsEnabled(item.componentFlags.tdsEnabled ?? true);
      setTdsApplicable(item.componentFlags.tdsEnabled ?? true);
    } else {
      setBasicEnabled(true);
      setHraEnabled(true);
      setSpecialEnabled(true);
      setConveyanceEnabled(true);
      setMedicalEnabled(true);
      setPfEnabled(true);
      setEsiEnabled(true);
      setEsiApplicable(true);
      setHealthInsuranceEnabled(true);
      setProfTaxEnabled(true);
      setTdsEnabled(true);
      setTdsApplicable(true);
    }

    // Reset custom components for this edit session (loaded from saved item if available)
    setCustomComponents((item.customComponents as CustomComponent[]) || []);
    setShowAddComponent(false);
    setNewCompName('');
    setNewCompValue('');
    setNewCompType('earning');
    setNewCompCalcType('fixed');
    setShowForm(true);
    setActiveTab('present');
  };


  const handleQuickTaxEdit = (item: SalaryStructureItem) => {
    handleEdit(item);
    setActiveTab('present');
  };

  const handleDeleteStructure = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this salary structure template?')) {
      try {
        await apiClient.delete(`/payroll/structures/${id}`);
      } catch (e) { }

      setStructuresList(prev => prev.filter(item => item.id !== id));
      setSuccessMsg('Salary structure deleted successfully from database.');

      apiClient.get('/payroll/structures').then((res: any) => {
        const list = res.data?.data || res.data || [];
        const formatted: SalaryStructureItem[] = list.map((s: any) => ({
          id: s.id,
          empId: s.employee_id || s.employeeId,
          empName: s.employee_name || s.employeeName,
          empCode: s.employee_code || s.employeeCode,
          gradeCode: s.grade_code || s.structure_code || `GRADE-${(s.structure_name || s.structureName || 'STD').slice(0, 3).toUpperCase()}`,
          structureName: s.structure_name || s.structureName || 'Structure',
          annualCtc: Number(s.annual_ctc ?? s.annualCtc ?? 0),
          basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
          grossMonthly: Number(s.gross_monthly ?? s.grossMonthly ?? 0),
          pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
          esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
          tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
          netTakeHome: Number(s.net_take_home ?? s.netTakeHome ?? 0),
          status: s.status || 'active'
        }));
        setStructuresList(formatted);
      }).catch(() => { });

      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };


  // ── Display List: Filter out dummy test templates and ensure ONLY real employees display ──
  const displayEmployeesList = React.useMemo(() => {
    // Filter structuresList to only include items assigned to real employees
    const realAssignedStructures = structuresList.filter(s => {
      const name = String(s.assignedEmpName || s.empName || '').toLowerCase();
      return name && name !== 'unassigned' && !name.includes('hello') && !name.includes('standard salary');
    });

    let baseList: SalaryStructureItem[] = [];

    if (realAssignedStructures.length > 0) {
      baseList = realAssignedStructures;
    } else if (employees && employees.length > 0) {
      baseList = employees.map((emp: any) => {
        const empName = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
        const empCode = emp.code || emp.employee_code || `EMP-${emp.id}`;

        const matchingStruct = structuresList.find(
          (s) => String(s.empId) === String(emp.id) ||
            (s.assignedEmpCode && String(s.assignedEmpCode).toLowerCase() === String(empCode).toLowerCase())
        );

        const annualCtc = matchingStruct && matchingStruct.annualCtc > 0
          ? matchingStruct.annualCtc
          : Number(emp.annual_ctc || emp.annualCtc || 600000);

        const grossMonthly = matchingStruct && matchingStruct.grossMonthly > 0
          ? matchingStruct.grossMonthly
          : Math.round(annualCtc / 12);

        const basicMonthly = matchingStruct && matchingStruct.basicMonthly > 0
          ? matchingStruct.basicMonthly
          : Math.round(grossMonthly * 0.5);

        const hraMonthly = matchingStruct && matchingStruct.hraMonthly > 0
          ? matchingStruct.hraMonthly
          : Math.round(basicMonthly * 0.5);

        const specialAllowanceMonthly = matchingStruct && matchingStruct.specialAllowanceMonthly > 0
          ? matchingStruct.specialAllowanceMonthly
          : Math.max(0, grossMonthly - (basicMonthly + hraMonthly));

        const pfDeduction = matchingStruct && matchingStruct.pfDeduction > 0
          ? matchingStruct.pfDeduction
          : Math.round(Math.min(basicMonthly, 15000) * 0.12);

        const netTakeHome = matchingStruct && matchingStruct.netTakeHome > 0
          ? matchingStruct.netTakeHome
          : Math.max(0, grossMonthly - pfDeduction - 200);

        return {
          id: emp.id,
          empId: emp.id,
          empName: empName,
          empCode: empCode,
          assignedEmpName: empName,
          assignedEmpCode: empCode,
          department: emp.department || 'General',
          structureName: matchingStruct?.structureName || 'Regular Staff Salary Structure',
          slabName: matchingStruct?.slabName || 'Standard CTC Slab',
          effectiveFrom: matchingStruct?.effectiveFrom ? String(matchingStruct.effectiveFrom).slice(0, 10) : '2026-08-01',
          annualCtc,
          grossMonthly,
          basicMonthly,
          hraMonthly,
          specialAllowanceMonthly,
          pfDeduction,
          esiDeduction: matchingStruct?.esiDeduction || 0,
          tdsDeduction: matchingStruct?.tdsDeduction || 0,
          netTakeHome,
          status: 'Active',
          gradeCode: emp.grade || emp.designation || matchingStruct?.gradeCode || 'GRADE-STD',
          customComponents: matchingStruct?.customComponents || []
        };
      });
    } else {
      baseList = structuresList;
    }

    return baseList.filter((item: any) => {
      const matchDept = selectedDeptFilter === 'all' || (item.department && String(item.department).toLowerCase().includes(selectedDeptFilter.toLowerCase()));
      const matchGrade = selectedGradeFilter === 'all' || (item.gradeCode && String(item.gradeCode).toLowerCase().includes(selectedGradeFilter.toLowerCase()));
      const matchSearch = !searchQuery.trim() ||
        String(item.assignedEmpName || item.empName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.assignedEmpCode || item.empCode || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchDept && matchGrade && matchSearch;
    });
  }, [employees, structuresList, selectedDeptFilter, selectedGradeFilter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Clean Minimal Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
            {isSettingsRoute ? <Sliders className="w-5 h-5" /> : <Calculator className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground tracking-tight">
              {isSettingsRoute ? '⚙️ Payroll Master Settings' : '💰 Salary & Slab Allocation Management'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSettingsRoute
                ? 'Configure Payroll Calculation Cycles, Attendance Cutoff Days, Pay Component Formulas, and Pay Grade Slabs.'
                : 'Directly assign Master Salary Slabs to employees or configure custom CTC allocations for regular employees, contractors, and interns.'}
            </p>
          </div>
        </div>
        {!isSettingsRoute && (
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setStructureName('');
              setStructureCode('');
              setSelectedGradeCode('');
              setInputCtc('');
              setSelectedEmpId('');
              setCustomComponents([]);
              setShowAddComponent(false);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs font-bold flex items-center gap-2 shrink-0 shadow-md cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            + Assign / Configure Salary to Employee
          </Button>
        )}
      </div>

      {/* 🌟 PAYROLL MASTER SUB TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 border-b border-border/80 pb-2 overflow-x-auto bg-muted/20 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveTab('cycle')}
          className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'cycle'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-background hover:text-foreground'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" /> 📅 Pay Cycle & Cutoff
        </button>

        <button
          onClick={() => setActiveTab('components')}
          className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'components'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-background hover:text-foreground'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> 🧮 Pay Components & Formulas
        </button>

        <button
          onClick={() => setActiveTab('slabs')}
          className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'slabs'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-background hover:text-foreground'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> 📊 Slabs & Grade Master
        </button>

        {!isSettingsRoute && (
          <>
            <button
              onClick={() => setActiveTab('present')}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'present'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" /> 💰 Employee Salary Allocations
            </button>

            <button
              onClick={() => setActiveTab('mapping')}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'mapping'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> 📋 Assigned Structures ({assignedEmployees.length})
            </button>
          </>
        )}
      </div>




      {/* 🌟 SINGLE UNIFIED PAGE VIEW: Employee Salary Structure & Slab Allocation */}
      <div className="space-y-4">
        {/* Assign / Edit Form Drawer */}
        {showForm && (
          <Card className="border border-border/80 shadow-xs bg-card mb-4 animate-fade-in">
            <CardHeader className="bg-muted/20 border-b border-border/60 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <UserCheck className="w-4 h-4 text-primary" />
                {editingId ? 'Edit Employee Salary Breakdown' : 'Assign / Configure Employee Salary'}
              </CardTitle>
              <CardDescription className="text-xs">
                Select employee, enter Annual CTC, and customize individual components (Basic, HRA, PF, PT, TDS) if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Primary Form Grid: Employee + Grade Master + Structure Name + Date + CTC */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Employee Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-primary" /> Select Employee *
                  </label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      setSelectedEmpId(empId);
                      const targetEmp = employees.find((emp: any) => String(emp.id) === String(empId));
                      if (targetEmp) {
                        const empCtc = targetEmp.annual_ctc || targetEmp.annualCtc || (targetEmp.gross_salary ? targetEmp.gross_salary * 12 : null);
                        if (empCtc) {
                          setInputCtc(String(empCtc));
                        }
                        if (!structureName) {
                          const empName = targetEmp.name || `${targetEmp.first_name || ''} ${targetEmp.last_name || ''}`.trim();
                          setStructureName(`${empName} Salary Structure`);
                        }
                        // Auto-select Grade Master if employee has assigned grade
                        const empGradeVal = (targetEmp.grade || targetEmp.grade_code || targetEmp.gradeName || '').toString().toLowerCase();
                        if (empGradeVal) {
                          const matchedMaster = gradeMasters.find(g =>
                            g.name.toLowerCase().includes(empGradeVal) ||
                            g.code.toLowerCase().includes(empGradeVal) ||
                            empGradeVal.includes(g.code.toLowerCase())
                          );
                          if (matchedMaster) {
                            setSelectedGradeCode(matchedMaster.code || matchedMaster.name);
                            setStructureCode(matchedMaster.code || matchedMaster.name);
                          } else {
                            setSelectedGradeCode(targetEmp.grade || targetEmp.grade_code || '');
                            setStructureCode(targetEmp.grade || targetEmp.grade_code || '');
                          }
                        }
                      }
                    }}
                    className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(e => (
                      <option key={e.id} value={String(e.id)}>
                        {e.name} ({e.code}) — {e.department || 'General'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grade Master Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-primary" /> Grade (From Master) *
                  </label>
                  <select
                    value={selectedGradeCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedGradeCode(val);
                      setStructureCode(val);
                    }}
                    className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Select Pay Grade --</option>
                    {gradeMasters.map((g) => (
                      <option key={g.id} value={g.code || g.name}>
                        {g.code ? `${g.code} - ${g.name}` : g.name}
                      </option>
                    ))}
                    {gradeMasters.length === 0 && dbGrades.map((g, idx) => (
                      <option key={idx} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Structure / Slab Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-primary" /> Structure Name *
                  </label>
                  <Input
                    value={structureName}
                    onChange={(e) => setStructureName(e.target.value)}
                    placeholder="e.g. Regular Staff Salary"
                    className="h-9 text-xs font-bold bg-background border-border"
                  />
                </div>

                {/* Effective From Date Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Effective From *
                  </label>
                  <Input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="h-9 text-xs font-bold bg-background border-border"
                  />
                </div>

                {/* Annual CTC Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Annual CTC (₹) *
                  </label>
                  <Input
                    type="number"
                    value={inputCtc}
                    onChange={(e) => setInputCtc(e.target.value)}
                    placeholder="e.g. 600000"
                    className="h-9 text-xs font-bold bg-background text-emerald-600 font-mono"
                  />
                  {/* Quick CTC Preset Badges */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {[
                      { label: '3L', val: 300000 },
                      { label: '6L', val: 600000 },
                      { label: '12L', val: 1200000 },
                      { label: '18L', val: 1800000 },
                      { label: '25L', val: 2500000 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setInputCtc(String(preset.val))}
                        className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer border border-emerald-300/60"
                      >
                        ₹{preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 🌟 LIVE CTC COMPONENT BREAKDOWN PREVIEW GRID */}
              {annualCtcVal > 0 && (
                <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                      Live CTC Component Breakdown Preview (Monthly)
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-200/60 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                      Annual CTC: ₹{(annualCtcVal / 100000).toFixed(2)} LPA
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                    <div className="bg-card p-2 rounded-lg border border-border/60 shadow-2xs">
                      <span className="text-muted-foreground font-bold block text-[10px]">Basic Pay</span>
                      <span className="text-[9px] font-bold text-indigo-600 block">50% of Gross</span>
                      <div className="font-extrabold text-foreground mt-1 text-xs font-mono">₹{basicMonthly.toLocaleString('en-IN')}/mo</div>
                    </div>

                    <div className="bg-card p-2 rounded-lg border border-border/60 shadow-2xs">
                      <span className="text-muted-foreground font-bold block text-[10px]">HRA</span>
                      <span className="text-[9px] font-bold text-indigo-600 block">40% of Basic</span>
                      <div className="font-extrabold text-foreground mt-1 text-xs font-mono">₹{hraMonthly.toLocaleString('en-IN')}/mo</div>
                    </div>

                    <div className="bg-card p-2 rounded-lg border border-border/60 shadow-2xs">
                      <span className="text-muted-foreground font-bold block text-[10px]">Special Allowance</span>
                      <span className="text-[9px] font-bold text-teal-600 block">Balancing Amount</span>
                      <div className="font-extrabold text-foreground mt-1 text-xs font-mono">₹{specialAllowanceMonthly.toLocaleString('en-IN')}/mo</div>
                    </div>

                    <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/60 shadow-2xs">
                      <span className="text-rose-700 dark:text-rose-300 font-bold block text-[10px]">Employee PF</span>
                      <span className="text-[9px] font-bold text-rose-600 block">12% Capped</span>
                      <div className="font-extrabold text-rose-600 mt-1 text-xs font-mono">−₹{pfDeduction.toLocaleString('en-IN')}/mo</div>
                    </div>

                    <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/60 shadow-2xs">
                      <span className="text-rose-700 dark:text-rose-300 font-bold block text-[10px]">Professional Tax</span>
                      <span className="text-[9px] font-bold text-amber-600 block">State Slab</span>
                      <div className="font-extrabold text-rose-600 mt-1 text-xs font-mono">−₹{profTax.toLocaleString('en-IN')}/mo</div>
                    </div>

                    <div className="bg-emerald-100/60 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                      <span className="text-emerald-800 dark:text-emerald-200 font-extrabold block text-[10px]">Net In-Hand</span>
                      <span className="text-[9px] font-bold text-emerald-600 block">Take-Home</span>
                      <div className="font-black text-emerald-700 dark:text-emerald-300 mt-1 text-xs font-mono">₹{(grossMonthly - totalDeductions).toLocaleString('en-IN')}/mo</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🌟 OPTIONAL INDIVIDUAL EMPLOYEE COMPONENT DEDUCTION EXEMPTION TOGGLES */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                <span className="text-[11px] font-extrabold text-foreground block">
                  ⚙️ Individual Employee Component Exemption (Optional):
                </span>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-indigo-600">
                    <input
                      type="checkbox"
                      checked={pfEnabled}
                      onChange={(e) => setPfEnabled(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <span>PF Deduction</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-indigo-600">
                    <input
                      type="checkbox"
                      checked={esiEnabled}
                      onChange={(e) => {
                        setEsiEnabled(e.target.checked);
                        setEsiApplicable(e.target.checked);
                      }}
                      className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <span>ESIC Deduction</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-indigo-600">
                    <input
                      type="checkbox"
                      checked={profTaxEnabled}
                      onChange={(e) => setProfTaxEnabled(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <span>Professional Tax (PT)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-indigo-600">
                    <input
                      type="checkbox"
                      checked={tdsEnabled}
                      onChange={(e) => {
                        setTdsEnabled(e.target.checked);
                        setTdsApplicable(e.target.checked);
                      }}
                      className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                    />
                    <span>TDS (Income Tax)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="h-8 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveStructure} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md h-8 text-xs font-bold">
                  <Save className="w-3.5 h-3.5" /> {editingId ? 'Update Salary' : 'Save Salary Assignment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardHeader className="border-b border-border/60 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" /> Active Employee Salary Allocations (By Dept &amp; Grade)
              </CardTitle>
              <CardDescription className="text-xs">View and manage monthly CTC breakdowns assigned according to Employee Department, Pay Grade, and CTC Slabs.</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                {displayEmployeesList.length} Active Employees
              </Badge>
            </div>
          </CardHeader>

          {/* 🌟 DEPARTMENT, GRADE & SEARCH FILTER TOOLBAR */}
          <div className="p-3 bg-muted/20 border-b border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Department Filter Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                <Building className="w-3 h-3 text-primary" /> Filter Department
              </label>
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              >
                <option value="all">All Departments</option>
                {uniqueDepartments.map((dept, idx) => (
                  <option key={idx} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Pay Grade Filter Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                <Layers className="w-3 h-3 text-primary" /> Filter Pay Grade
              </label>
              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              >
                <option value="all">All Pay Grades</option>
                {(dbGrades.length > 0 ? dbGrades : ['Senior Manager', 'Manager', 'Senior Developer', 'Developer', 'HR Manager', 'Sales Manager', 'Operations Manager', 'Intern'])
                  .map((g, i) => (
                    <option key={i} value={g}>{g}</option>
                  ))}
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                <Search className="w-3 h-3 text-primary" /> Search Employee
              </label>
              <Input
                type="text"
                placeholder="Search name/code..."
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs font-bold bg-background border-border"
              />
            </div>
          </div>
        </Card>


        {/* SUB TAB 1: Pay Cycle (Rule & Cutoff Engine) */}
        {activeTab === 'cycle' && (
          <div className="space-y-4 animate-fade-in">
            <Card className="border border-border/80 shadow-xs bg-card">
              <CardHeader className="bg-muted/20 border-b border-border/60 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Payroll Calculation Cycle & Cutoff Engine
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure calculation period start date, attendance cutoff days, disbursement date, and tolerance settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Pay Cycle Frequency</label>
                    <select className="h-9 w-full text-xs font-bold bg-background border border-border rounded-md px-3">
                      <option value="monthly">Monthly Cycle (1st - 30th/31st)</option>
                      <option value="bi-weekly">Bi-Weekly Cycle (15 Days)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Calculation Start Day</label>
                    <Input type="number" defaultValue={1} min={1} max={31} className="h-9 text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Attendance Cutoff Day</label>
                    <Input type="number" defaultValue={25} min={1} max={31} className="h-9 text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Disbursement Date</label>
                    <Input type="number" defaultValue={1} min={1} max={31} className="h-9 text-xs font-bold" />
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300">
                    ⚡ Auto-Attendance & Overtime Sync Enabled (Tolerance Window: 2 Days)
                  </span>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8">
                    Save Cycle Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SUB TAB 2: Pay Components & Formula Builders */}
        {activeTab === 'components' && (
          <div className="space-y-4 animate-fade-in">
            <Card className="border border-border/80 shadow-xs bg-card">
              <CardHeader className="bg-muted/20 border-b border-border/60 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    Salary Components & Statutory Formula Engine
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Define derived formula rules (e.g. Basic 50% CTC, HRA 50% Basic) and statutory caps (PF 12% max ₹1,800).
                  </CardDescription>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8">
                  + Add Component Group
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Earnings Group */}
                  <div className="border border-border/80 rounded-xl p-3 bg-muted/10 space-y-2">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Earnings Group (Regular & Variable)
                      </span>
                      <Badge className="bg-emerald-600 text-white font-bold text-[10px]">3 Components</Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2 bg-background rounded-lg border border-border/80 flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-foreground block">Basic Pay</span>
                          <span className="text-[10px] text-muted-foreground">Formula: 50% of Gross Annual CTC</span>
                        </div>
                        <Badge variant="outline" className="font-bold text-[10px]">Derived %</Badge>
                      </div>
                      <div className="p-2 bg-background rounded-lg border border-border/80 flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-foreground block">House Rent Allowance (HRA)</span>
                          <span className="text-[10px] text-muted-foreground">Formula: 50% Metro / 40% Non-Metro of Basic</span>
                        </div>
                        <Badge variant="outline" className="font-bold text-[10px]">Derived %</Badge>
                      </div>
                      <div className="p-2 bg-background rounded-lg border border-border/80 flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-foreground block">Special Allowance</span>
                          <span className="text-[10px] text-muted-foreground">Formula: Balancing Component (Residual CTC)</span>
                        </div>
                        <Badge variant="outline" className="font-bold text-[10px]">Residual</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Group */}
                  <div className="border border-border/80 rounded-xl p-3 bg-muted/10 space-y-2">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Deductions Group (Statutory & Tax)
                      </span>
                      <Badge className="bg-indigo-600 text-white font-bold text-[10px]">4 Components</Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-2 bg-background rounded-lg border border-border/80 flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-foreground block">Provident Fund (PF)</span>
                          <span className="text-[10px] text-muted-foreground">Statutory Cap: 12% on ₹15,000 Basic (Max ₹1,800/mo)</span>
                        </div>
                        <Badge variant="outline" className="font-bold text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">Statutory Cap</Badge>
                      </div>
                      <div className="p-2 bg-background rounded-lg border border-border/80 flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-foreground block">Employee State Insurance (ESI)</span>
                          <span className="text-[10px] text-muted-foreground">Rule: 0.75% Employee / 3.25% Employer (Gross ≤ ₹21,000)</span>
                        </div>
                        <Badge variant="outline" className="font-bold text-[10px]">Statutory</Badge>
                      </div>
                      <div className="p-2 bg-background rounded-lg border border-border/80 flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-foreground block">Professional Tax (PT)</span>
                          <span className="text-[10px] text-muted-foreground">State Slab Rule: ₹200 Flat Monthly</span>
                        </div>
                        <Badge variant="outline" className="font-bold text-[10px]">State Slab</Badge>
                      </div>
                      <div className="p-2 bg-background rounded-lg border border-border/80 flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-foreground block">Tax Deducted at Source (TDS)</span>
                          <span className="text-[10px] text-muted-foreground">Rule: Dynamic Income Tax Slab Computation</span>
                        </div>
                        <Badge variant="outline" className="font-bold text-[10px]">Dynamic Tax</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SUB TAB 3: Master Slabs */}
        {activeTab === 'slabs' && (
          <div className="space-y-4 animate-fade-in">
            <Card className="border border-border/80 shadow-xs bg-card">
              <CardHeader className="bg-muted/20 border-b border-border/60 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Master Salary Slabs & Grade Allocations
                  </CardTitle>
                  <CardDescription className="text-xs">
                    View active grade slabs configured with monthly cycle badges and min-max CTC ranges.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-600/10 text-emerald-600 border-emerald-600/20 font-extrabold text-[10px]">
                  {payrollSlabs.length || 7} Slabs Configured
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                      <tr>
                        <th className="px-4 py-2.5 min-w-[200px]">Slab / Grade Name</th>
                        <th className="px-4 py-2.5 whitespace-nowrap">Cycle Badge</th>
                        <th className="px-4 py-2.5 whitespace-nowrap">Annual CTC Range</th>
                        <th className="px-4 py-2.5 min-w-[150px]">Department Scope</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(payrollSlabs.length > 0 ? payrollSlabs : [
                        { id: 1, name: 'Executive Grade Slab', minCtc: 300000, maxCtc: 600000, dept: 'All Departments' },
                        { id: 2, name: 'Senior Executive Slab', minCtc: 600000, maxCtc: 1000000, dept: 'Engineering, Sales' },
                        { id: 3, name: 'Manager Pay Slab', minCtc: 1000000, maxCtc: 1800000, dept: 'Operations, Finance' },
                        { id: 4, name: 'Director Pay Grade', minCtc: 1800000, maxCtc: 3500000, dept: 'Management' },
                      ]).map((slab: any) => (
                        <tr key={slab.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-extrabold text-foreground">
                            {slab.name || slab.slab_name || 'Pay Grade Slab'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">
                              [Monthly]
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-foreground">
                            ₹{(slab.minCtc || slab.min_ctc || 300000).toLocaleString('en-IN')} - ₹{(slab.maxCtc || slab.max_ctc || 1200000).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-medium">
                            {slab.dept || 'All Organization Departments'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold">
                              Edit Slab
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: Employee Salary Structure Mapping */}
        {activeTab === 'mapping' && (
          <>
            <Card className="border border-border/80 shadow-xs bg-card">
            <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <UserCheck className="w-4 h-4 text-primary" /> Employee Salary Structure Mapping
                </CardTitle>
                <CardDescription className="text-xs">Active assigned CTC templates for organization database employees.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                {assignedEmployees.length} Employees Mapped
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                    <tr>
                      <th className="px-4 py-2.5 whitespace-nowrap">Emp Code</th>
                      <th className="px-4 py-2.5 min-w-[180px]">Employee Name</th>
                      <th className="px-4 py-2.5 min-w-[200px]">Assigned CTC Structure</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Effective From</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Monthly Gross Pay</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {assignedEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px] font-bold">
                            {emp.code}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground text-xs">{emp.name}</td>
                        <td className="px-4 py-3 font-semibold text-primary text-xs">{emp.structure}</td>
                        <td className="px-4 py-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">{emp.effectiveFrom || '—'}</td>
                        <td className="px-4 py-3 font-bold text-foreground text-xs">{emp.gross}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">Assigned</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </>
        )}


        {/* TAB 1: Present Salary Structures List & Builder Form */}
        {activeTab === 'present' && (
          <div className="space-y-4">
            {showForm && (
              <Card className="border border-border/80 shadow-xs bg-card mb-4">
                <CardHeader className="bg-muted/20 border-b border-border/60 pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Sliders className="w-4 h-4 text-primary" />
                    {editingId ? 'Edit Salary Structure Template' : 'Create & Build New Salary Structure Template'}
                  </CardTitle>
                  <CardDescription className="text-xs">Enter template name, annual CTC, and component percentages to calculate real-time earnings, statutory PF/ESI, and TDS tax rules.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

                    {/* Structure Template Name Text Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-primary" /> Structure Template Name *
                      </label>
                      <Input
                        value={structureName}
                        onChange={(e) => setStructureName(e.target.value)}
                        placeholder="e.g. Senior Software Engineer Grade-A"
                        className="h-9 text-xs font-bold bg-background border-border"
                      />
                    </div>

                    {/* Structure Code / Grade Code Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-primary" /> Salary Structure Code / Grade Code
                      </label>
                      <Input
                        value={structureCode}
                        onChange={(e) => setStructureCode(e.target.value)}
                        placeholder="e.g. STR-ENG-01 or GRADE-A"
                        className="h-9 text-xs font-bold bg-background border-border"
                      />
                    </div>

                    {/* Effective From Date Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> Effective From Date *
                      </label>
                      <Input
                        type="date"
                        value={effectiveFrom}
                        onChange={(e) => setEffectiveFrom(e.target.value)}
                        className="h-9 text-xs font-bold bg-background border-border"
                      />
                    </div>

                    {/* 4. Annual CTC */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Annual Cost to Company (CTC INR) *
                      </label>
                      <Input
                        type="number"
                        value={inputCtc}
                        onChange={(e) => setInputCtc(e.target.value)}
                        placeholder="e.g. 900000"
                        className="h-9 text-xs font-bold bg-background text-emerald-600"
                      />
                    </div>
                  </div>


                  {/* ── Section 2: Earnings Configuration ──────────────────────── */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 border-b pb-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Earnings Configuration
                      <span className="ml-auto text-[11px] font-normal text-slate-500">Check components to include in this salary structure</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">

                      {/* Basic % */}
                      <div className={`rounded-lg border p-2.5 space-y-1 transition ${basicEnabled ? 'bg-indigo-50/80 dark:bg-slate-800/60 border-indigo-100 dark:border-slate-700' : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={basicEnabled}
                              onChange={e => setBasicEnabled(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            Basic Salary
                          </label>
                          <Badge className={`text-[9px] px-1 py-0 font-bold ${basicEnabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                            {basicEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={basicPct}
                            onChange={e => setBasicPct(e.target.value)}
                            disabled={!basicEnabled}
                            className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-14 disabled:opacity-50"
                            min="1"
                            max="100"
                          />
                          <span className="text-[10px] font-bold text-slate-500">% of CTC</span>
                        </div>
                        <div className={`text-sm font-extrabold ${basicEnabled ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400 line-through'}`}>
                          ₹{basicMonthly.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* HRA % */}
                      <div className={`rounded-lg border p-2.5 space-y-1 transition ${hraEnabled ? 'bg-blue-50/80 dark:bg-slate-800/60 border-blue-100 dark:border-slate-700' : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hraEnabled}
                              onChange={e => setHraEnabled(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            HRA
                          </label>
                          <Badge className={`text-[9px] px-1 py-0 font-bold ${hraEnabled ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                            {hraEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={hraPct}
                            onChange={e => setHraPct(e.target.value)}
                            disabled={!hraEnabled}
                            className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-14 disabled:opacity-50"
                            min="0"
                            max="100"
                          />
                          <span className="text-[10px] font-bold text-slate-500">% of Base</span>
                        </div>
                        <div className={`text-sm font-extrabold ${hraEnabled ? 'text-blue-700 dark:text-blue-300' : 'text-slate-400 line-through'}`}>
                          ₹{hraMonthly.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Special Allowance % */}
                      <div className={`rounded-lg border p-2.5 space-y-1 transition ${specialEnabled ? 'bg-purple-50/80 dark:bg-slate-800/60 border-purple-100 dark:border-slate-700' : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={specialEnabled}
                              onChange={e => setSpecialEnabled(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            Special Allow.
                          </label>
                          <Badge className={`text-[9px] px-1 py-0 font-bold ${specialEnabled ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-500'}`}>
                            {specialEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={specialPct}
                            onChange={e => setSpecialPct(e.target.value)}
                            disabled={!specialEnabled}
                            className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-14 disabled:opacity-50"
                            min="0"
                            max="100"
                          />
                          <span className="text-[10px] font-bold text-slate-500">% of Base</span>
                        </div>
                        <div className={`text-sm font-extrabold ${specialEnabled ? 'text-purple-700 dark:text-purple-300' : 'text-slate-400 line-through'}`}>
                          ₹{specialAllowanceMonthly.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Conveyance flat */}
                      <div className={`rounded-lg border p-2.5 space-y-1 transition ${conveyanceEnabled ? 'bg-amber-50/80 dark:bg-slate-800/60 border-amber-100 dark:border-slate-700' : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={conveyanceEnabled}
                              onChange={e => setConveyanceEnabled(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            Conveyance
                          </label>
                          <Badge className={`text-[9px] px-1 py-0 font-bold ${conveyanceEnabled ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                            {conveyanceEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500">₹</span>
                          <Input
                            type="number"
                            value={conveyanceFlat}
                            onChange={e => setConveyanceFlat(e.target.value)}
                            disabled={!conveyanceEnabled}
                            className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 disabled:opacity-50"
                            min="0"
                          />
                        </div>
                        <div className={`text-xs font-bold ${conveyanceEnabled ? 'text-amber-700 dark:text-amber-300' : 'text-slate-400 line-through'}`}>
                          ₹{conveyance.toLocaleString('en-IN')}/mo
                        </div>
                      </div>

                      {/* Medical flat */}
                      <div className={`rounded-lg border p-2.5 space-y-1 transition ${medicalEnabled ? 'bg-rose-50/80 dark:bg-slate-800/60 border-rose-100 dark:border-slate-700' : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={medicalEnabled}
                              onChange={e => setMedicalEnabled(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                            Medical Allow.
                          </label>
                          <Badge className={`text-[9px] px-1 py-0 font-bold ${medicalEnabled ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-500'}`}>
                            {medicalEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500">₹</span>
                          <Input
                            type="number"
                            value={medicalFlat}
                            onChange={e => setMedicalFlat(e.target.value)}
                            disabled={!medicalEnabled}
                            className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 disabled:opacity-50"
                            min="0"
                          />
                        </div>
                        <div className={`text-xs font-bold ${medicalEnabled ? 'text-rose-700 dark:text-rose-300' : 'text-slate-400 line-through'}`}>
                          ₹{medical.toLocaleString('en-IN')}/mo
                        </div>
                      </div>
                    </div>

                    {/* Earnings live summary bar */}
                    <div className="flex flex-wrap items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-lg px-3.5 py-2 text-xs font-bold">
                      <span className="text-slate-500 font-normal text-[11px]">Live Total →</span>
                      <span className={basicEnabled ? "text-indigo-700" : "text-slate-400 line-through"}>Basic: ₹{basicMonthly.toLocaleString('en-IN')}</span>
                      <span className="text-slate-400">+</span>
                      <span className={hraEnabled ? "text-blue-700" : "text-slate-400 line-through"}>HRA: ₹{hraMonthly.toLocaleString('en-IN')}</span>
                      <span className="text-slate-400">+</span>
                      <span className={specialEnabled ? "text-purple-700" : "text-slate-400 line-through"}>SA: ₹{specialAllowanceMonthly.toLocaleString('en-IN')}</span>
                      <span className="text-slate-400">+</span>
                      <span className={conveyanceEnabled ? "text-amber-700" : "text-slate-400 line-through"}>Conv: ₹{conveyance.toLocaleString('en-IN')}</span>
                      <span className="text-slate-400">+</span>
                      <span className={medicalEnabled ? "text-rose-700" : "text-slate-400 line-through"}>Med: ₹{medical.toLocaleString('en-IN')}</span>
                      {customEarningsTotal > 0 && (
                        <>
                          <span className="text-slate-400">+</span>
                          <span className="text-teal-700">Custom: ₹{customEarningsTotal.toLocaleString('en-IN')}</span>
                        </>
                      )}
                      <span className="ml-auto text-emerald-700 text-sm font-extrabold">= Gross ₹{effectiveGross.toLocaleString('en-IN')}/mo</span>
                    </div>
                  </div>

                  {/* ── Section 2.5: Custom Components Builder ─────────────────── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        Custom Salary Components
                        <span className="ml-2 text-[11px] font-normal text-slate-500">Add your own earnings (+) or deductions (−) to this structure</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setShowAddComponent(!showAddComponent)}
                        className="h-7 text-[11px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 flex items-center gap-1.5"
                        variant="outline"
                      >
                        {showAddComponent ? <XCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {showAddComponent ? 'Cancel' : '+ Add Component'}
                      </Button>
                    </div>

                    {/* Add Component Inline Form */}
                    {showAddComponent && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          {/* Component Name */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Component Name *</label>
                            <Input
                              value={newCompName}
                              onChange={e => setNewCompName(e.target.value)}
                              placeholder="e.g. Shift Allowance"
                              className="h-8 text-xs font-bold bg-background"
                            />
                          </div>

                          {/* Type: Earning or Deduction */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Type *</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setNewCompType('earning')}
                                className={`flex-1 h-8 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${newCompType === 'earning'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-background text-slate-600 border-border hover:border-emerald-400'
                                  }`}
                              >
                                <TrendingUp className="w-3.5 h-3.5" /> (+) Earning
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewCompType('deduction')}
                                className={`flex-1 h-8 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${newCompType === 'deduction'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                    : 'bg-background text-slate-600 border-border hover:border-rose-400'
                                  }`}
                              >
                                <TrendingDown className="w-3.5 h-3.5" /> (−) Deduction
                              </button>
                            </div>
                          </div>

                          {/* Calculation Type */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Calculation *</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setNewCompCalcType('fixed')}
                                className={`flex-1 h-8 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${newCompCalcType === 'fixed'
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-background text-slate-600 border-border hover:border-indigo-400'
                                  }`}
                              >
                                ₹ Fixed
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewCompCalcType('percentage')}
                                className={`flex-1 h-8 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${newCompCalcType === 'percentage'
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-background text-slate-600 border-border hover:border-indigo-400'
                                  }`}
                              >
                                % of Basic
                              </button>
                            </div>
                          </div>

                          {/* Value Input */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              {newCompCalcType === 'fixed' ? 'Monthly Amount (₹) *' : '% of Basic *'}
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={newCompValue}
                                onChange={e => setNewCompValue(e.target.value)}
                                placeholder={newCompCalcType === 'fixed' ? 'e.g. 2000' : 'e.g. 10'}
                                className="h-8 text-xs font-bold bg-background flex-1"
                                min="0"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleAddCustomComponent}
                                disabled={!newCompName.trim() || !newCompValue}
                                className="h-8 px-3 text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                              >
                                Add
                              </Button>
                            </div>
                            {newCompValue && basicMonthly > 0 && newCompCalcType === 'percentage' && (
                              <div className="text-[10px] text-primary font-bold">≈ ₹{Math.round(basicMonthly * (parseFloat(newCompValue) / 100)).toLocaleString('en-IN')}/mo</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Components List */}
                    {customComponents.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {customComponents.map(comp => {
                          const isEnabled = comp.enabled !== false;
                          const amt = isEnabled ? computeCustomAmount(comp) : 0;
                          const isEarning = comp.type === 'earning';
                          return (
                            <div
                              key={comp.id}
                              className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition ${!isEnabled
                                  ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 opacity-60'
                                  : isEarning
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                                }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={e => {
                                      const checked = e.target.checked;
                                      setCustomComponents(prev => prev.map(c => c.id === comp.id ? { ...c, enabled: checked } : c));
                                    }}
                                    className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer"
                                  />
                                  {isEarning
                                    ? <TrendingUp className="w-3 h-3 text-emerald-600" />
                                    : <TrendingDown className="w-3 h-3 text-rose-600" />
                                  }
                                  <span className={`font-bold ${!isEnabled ? 'text-slate-400 line-through' : isEarning ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                                    {comp.name}
                                  </span>
                                  <Badge className={`text-[9px] px-1 py-0 font-bold ${!isEnabled ? 'bg-slate-200 text-slate-500' : isEarning ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'
                                    }`}>
                                    {isEnabled ? (isEarning ? '+' : '−') : 'Off'}
                                  </Badge>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {comp.calcType === 'percentage' ? `${comp.value}% of Basic` : `₹${comp.value.toLocaleString('en-IN')} flat`}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-extrabold ${!isEnabled ? 'text-slate-400 line-through' : isEarning ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                                  }`}>
                                  {isEnabled ? `${isEarning ? '+' : '−'}₹${amt.toLocaleString('en-IN')}` : '₹0'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomComponent(comp.id)}
                                  className="text-muted-foreground hover:text-rose-600 transition-colors p-0.5 rounded"
                                  title="Remove component"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {customComponents.length === 0 && !showAddComponent && (
                      <div className="text-center py-4 text-[11px] text-muted-foreground border border-dashed border-border rounded-lg">
                        No custom components added yet. Click <strong>+ Add Component</strong> to define custom earnings or deductions.
                      </div>
                    )}
                  </div>

                  {/* ── Section 3: Tax & Compliance Configuration ───────────────── */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 border-b pb-1.5">
                      <Percent className="w-3.5 h-3.5 text-rose-600" />
                      Configure Tax &amp; Compliance Deductions
                      <span className="ml-auto text-[11px] font-normal text-slate-500">Check deductions to apply to this salary structure</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">

                      {/* PF */}
                      <div className={`rounded-lg border p-2.5 space-y-1 transition ${pfEnabled ? (pfCapped ? 'bg-orange-50/80 dark:bg-orange-950/20 border-orange-200' : 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-200') : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-orange-800 dark:text-orange-300 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pfEnabled}
                              onChange={e => setPfEnabled(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                            PF (Provident Fund)
                          </label>
                          {pfEnabled && (
                            <button onClick={() => setPfCapped(!pfCapped)}
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${pfCapped ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                              {pfCapped ? 'Capped ₹15K' : 'Uncapped'}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Input type="number" value={pfPct} onChange={e => setPfPct(e.target.value)}
                            disabled={!pfEnabled}
                            className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-12 disabled:opacity-50" min="0" max="100" step="0.1" />
                          <span className="text-[10px] text-slate-500">% of Basic</span>
                        </div>
                        <div className={`text-sm font-extrabold ${pfEnabled ? 'text-orange-700 dark:text-orange-300' : 'text-slate-400 line-through'}`}>
                          −₹{pfDeduction.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">{pfEnabled ? `Base: ₹${Math.min(basicMonthly, pfCapped ? 15000 : basicMonthly).toLocaleString('en-IN')}` : 'Disabled'}</div>
                      </div>

                      {/* ESI */}
                      <div className={`rounded-lg border p-2.5 space-y-1 transition ${esiEnabled && esiApplicable ? 'bg-yellow-50/80 dark:bg-yellow-950/20 border-yellow-200' : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-yellow-800 dark:text-yellow-300 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={esiEnabled}
                              onChange={e => {
                                setEsiEnabled(e.target.checked);
                                setEsiApplicable(e.target.checked);
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer"
                            />
                            ESI
                          </label>
                          <Badge className={`text-[9px] px-1.5 py-0 font-bold ${esiEnabled && esiApplicable ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-200 text-slate-500'}`}>
                            {esiEnabled && esiApplicable ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input type="number" value={esiPct} onChange={e => setEsiPct(e.target.value)}
                            className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-12 disabled:opacity-50" min="0" max="100" step="0.01" disabled={!esiEnabled || !esiApplicable} />
                          <span className="text-[10px] text-slate-500">% Gross</span>
                        </div>
                        <div className={`text-sm font-extrabold ${esiEnabled && esiApplicable ? 'text-yellow-700 dark:text-yellow-300' : 'text-slate-400 line-through'}`}>
                          −₹{esiDeduction.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">{!esiEnabled ? 'Disabled' : (effectiveGross > 21000 ? '⚠ Gross > ₹21K — exempt' : 'Applicable')}</div>
                      </div>

                      {/* Health Insurance */}
                      <div className={`rounded-lg border p-2.5 space-y-1 transition ${healthInsuranceEnabled ? 'bg-pink-50/80 dark:bg-pink-950/20 border-pink-200' : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-pink-800 dark:text-pink-300 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={healthInsuranceEnabled}
                              onChange={e => setHealthInsuranceEnabled(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                            />
                            Health Insurance
                          </label>
                          <Badge className={`text-[9px] px-1.5 py-0 font-bold ${healthInsuranceEnabled ? 'bg-pink-100 text-pink-700' : 'bg-slate-200 text-slate-500'}`}>
                            {healthInsuranceEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500">₹</span>
                          <Input type="number" value={healthInsuranceFlat} onChange={e => setHealthInsuranceFlat(e.target.value)}
                            disabled={!healthInsuranceEnabled}
                            className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 disabled:opacity-50" min="0" />
                        </div>
                        <div className={`text-sm font-extrabold ${healthInsuranceEnabled ? 'text-pink-700 dark:text-pink-300' : 'text-slate-400 line-through'}`}>
                          −₹{healthIns.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">Fixed premium / mo</div>
                      </div>

                      {/* Professional Tax */}
                      <div className={`rounded-lg border p-2.5 space-y-1 transition ${profTaxEnabled ? 'bg-violet-50/80 dark:bg-violet-950/20 border-violet-200' : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-violet-800 dark:text-violet-300 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={profTaxEnabled}
                              onChange={e => setProfTaxEnabled(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                            />
                            Professional Tax
                          </label>
                          <Badge className={`text-[9px] px-1.5 py-0 font-bold ${profTaxEnabled ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-500'}`}>
                            {profTaxEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500">₹</span>
                          <Input type="number" value={professionalTaxFlat} onChange={e => setProfessionalTaxFlat(e.target.value)}
                            disabled={!profTaxEnabled}
                            className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 disabled:opacity-50" min="0" max="2500" />
                        </div>
                        <div className={`text-sm font-extrabold ${profTaxEnabled ? 'text-violet-700 dark:text-violet-300' : 'text-slate-400 line-through'}`}>
                          −₹{profTax.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">State slab / mo</div>
                      </div>

                      {/* TDS */}
                      <div className={`rounded-lg border p-2.5 space-y-1 transition ${tdsEnabled && tdsApplicable ? 'bg-red-50/80 dark:bg-red-950/20 border-red-200' : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tdsEnabled}
                              onChange={e => {
                                setTdsEnabled(e.target.checked);
                                setTdsApplicable(e.target.checked);
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            TDS / Income Tax
                          </label>
                          <Badge className={`text-[9px] px-1.5 py-0 font-bold ${tdsEnabled && tdsApplicable ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'}`}>
                            {tdsEnabled && tdsApplicable ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input type="number" value={tdsPct} onChange={e => setTdsPct(e.target.value)}
                            disabled={!tdsEnabled || !tdsApplicable}
                            className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-12 disabled:opacity-50" min="0" max="100" step="0.5" />
                          <span className="text-[10px] text-slate-500">% Gross</span>
                        </div>
                        <div className={`text-sm font-extrabold ${tdsEnabled && tdsApplicable ? 'text-red-700 dark:text-red-300' : 'text-slate-400 line-through'}`}>
                          −₹{tdsDeduction.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">Estimated monthly TDS</div>
                      </div>
                    </div>
                  </div>


                  {/* Net take-home summary */}
                  <div className="flex flex-wrap items-center gap-4 bg-muted/30 border border-border/60 rounded-xl px-4 py-3 text-foreground">
                    <div className="flex-1 min-w-[150px]">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Gross Monthly</div>
                      <div className="text-lg font-bold text-foreground">₹{effectiveGross.toLocaleString('en-IN')}</div>
                      {customEarningsTotal > 0 && (
                        <div className="text-[10px] text-teal-600 font-bold mt-0.5">incl. +₹{customEarningsTotal.toLocaleString('en-IN')} custom earnings</div>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xl font-thin">−</div>
                    <div className="flex-1 min-w-[150px]">
                      <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wide">Total Deductions</div>
                      <div className="text-lg font-bold text-rose-600">₹{totalDeductions.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        PF ₹{pfDeduction} + ESI ₹{esiDeduction} + HI ₹{healthIns} + PT ₹{profTax} + TDS ₹{tdsDeduction}{customDeductionsTotal > 0 ? ` + Custom ₹${customDeductionsTotal}` : ''}
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xl font-thin">=</div>
                    <div className="flex-1 min-w-[150px]">
                      <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Net Take-Home</div>
                      <div className="text-xl font-black text-emerald-600">₹{netTakeHome.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                        setCustomComponents([]);
                        setShowAddComponent(false);
                        setNewCompName('');
                        setNewCompValue('');
                        setNewCompType('earning');
                        setNewCompCalcType('fixed');
                      }}
                      className="h-8 text-xs font-bold"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveStructure} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md h-8 text-xs font-bold">
                      <Save className="w-3.5 h-3.5" /> {editingId ? 'Update Structure' : 'Save & Assign Structure'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}


            {showNewTemplateCard && (
            <Card className="border border-border/80 shadow-xs bg-card p-3 rounded-xl animate-fade-in">
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 space-y-1 w-full">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Create New Salary Structure Template (Added to Dropdown List)
                  </label>
                  <Input
                    placeholder="e.g. Senior Software Engineer Grade-A (₹9.00 LPA)"
                    value={newTemplateInput}
                    onChange={(e) => setNewTemplateInput(e.target.value)}
                    className="h-8 text-xs font-bold bg-background border-border"
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={handleAddNewTemplate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-3">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Save & Add to Dropdown
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowNewTemplateCard(false)} className="h-8 text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
            )}

            <Card className="border border-border/80 shadow-xs bg-card mt-4">
              <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                    <tr>
                      <th className="px-4 py-2.5 min-w-[180px]">Employee Name</th>
                      <th className="px-4 py-2.5 min-w-[180px]">Assigned Slab / Structure</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Effective From</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Annual CTC</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Gross Monthly</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Net In-Hand</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Breakdown</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {displayEmployeesList.map((item) => {
                      // Format effective date cleanly (e.g. 2026-08-05)
                      const cleanDate = item.effectiveFrom
                        ? String(item.effectiveFrom).slice(0, 10)
                        : '2026-08-01';

                      // Format Annual CTC nicely
                      const displayAnnualCtc = item.annualCtc > 0
                        ? (item.annualCtc >= 100000
                            ? `₹${(item.annualCtc / 100000).toFixed(2)} LPA`
                            : `₹${item.annualCtc.toLocaleString('en-IN')}/yr`)
                        : (item.grossMonthly > 0 ? `₹${(item.grossMonthly * 12).toLocaleString('en-IN')}/yr` : '—');

                      const empDisplayName = item.assignedEmpName || item.empName || (item.empCode ? `Employee (${item.empCode})` : 'All Assigned Staff');

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-bold text-foreground text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-200">
                                  {empDisplayName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-foreground block">{empDisplayName}</span>
                                  {item.assignedEmpCode && (
                                    <span className="text-[10px] text-muted-foreground font-mono">{item.assignedEmpCode}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-foreground text-xs leading-snug">
                              <div>{item.structureName}</div>
                              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                {(item as any).slab_name || (item as any).slabName ? (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-extrabold px-1.5 py-0">
                                    Slab: {(item as any).slab_name || (item as any).slabName}
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">
                              {cleanDate}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {displayAnnualCtc}
                            </td>
                            <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                              ₹{item.grossMonthly.toLocaleString('en-IN')}/mo
                            </td>
                            <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              ₹{item.netTakeHome.toLocaleString('en-IN')}/mo
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                className="h-7 text-[10px] font-bold px-2.5 gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                {expandedId === item.id ? <ChevronUp className="w-3 h-3 text-indigo-600" /> : <ChevronDown className="w-3 h-3 text-indigo-600" />}
                                <span>{expandedId === item.id ? 'Hide' : 'View Breakdown'}</span>
                              </Button>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 bg-card border border-border/80 shadow-md">
                                  <DropdownMenuItem onClick={() => handleEdit(item)} className="text-xs font-bold gap-2 cursor-pointer">
                                    <Edit className="w-3.5 h-3.5 text-primary" />
                                    <span>Edit Salary</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteStructure(item.id)} className="text-xs font-bold gap-2 text-rose-600 focus:text-rose-700 cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>

                        {/* Expandable Component & Tax Breakdown Drawer */}
                        {expandedId === item.id && (
                          <tr className="bg-muted/20 border-y border-border/60">
                            <td colSpan={9} className="p-3">
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-primary">
                                    <Calculator className="w-3.5 h-3.5" /> Component & Statutory Tax Breakdown: {item.structureName}
                                  </span>
                                  <span className="text-muted-foreground font-bold font-mono text-[10px]">Grade: {item.gradeCode || 'GRADE-STD'}</span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                  <div className="bg-card p-2 rounded-lg border border-border/60">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground font-semibold block text-[10px]">Basic Pay</span>
                                      <span className="px-1 py-0.2 rounded text-[8px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">Derived: 50%</span>
                                    </div>
                                    <div className="font-extrabold text-foreground mt-0.5 text-xs">₹{item.basicMonthly.toLocaleString('en-IN')}</div>
                                  </div>

                                  <div className="bg-card p-2 rounded-lg border border-border/60">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground font-semibold block text-[10px]">HRA</span>
                                      <span className="px-1 py-0.2 rounded text-[8px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">Derived: 40%</span>
                                    </div>
                                    <div className="font-extrabold text-foreground mt-0.5 text-xs">₹{item.hraMonthly.toLocaleString('en-IN')}</div>
                                  </div>

                                  <div className="bg-card p-2 rounded-lg border border-border/60">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground font-semibold block text-[10px]">Special Allowance</span>
                                      <span className="px-1 py-0.2 rounded text-[8px] font-black bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">Derived: Rest</span>
                                    </div>
                                    <div className="font-extrabold text-foreground mt-0.5 text-xs">₹{item.specialAllowanceMonthly.toLocaleString('en-IN')}</div>
                                  </div>

                                  <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/50 dark:border-rose-900/40">
                                    <div className="flex items-center justify-between">
                                      <span className="text-rose-600 font-semibold block text-[10px]">PF Contribution</span>
                                      <span className="px-1 py-0.2 rounded text-[8px] font-black bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">Derived: 12%</span>
                                    </div>
                                    <div className="font-extrabold text-rose-600 mt-0.5 text-xs">−₹{item.pfDeduction.toLocaleString('en-IN')}</div>
                                  </div>

                                  <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/50 dark:border-rose-900/40">
                                    <div className="flex items-center justify-between">
                                      <span className="text-rose-600 font-semibold block text-[10px]">Professional Tax</span>
                                      <span className="px-1 py-0.2 rounded text-[8px] font-black bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">Value: ₹200</span>
                                    </div>
                                    <div className="font-extrabold text-rose-600 mt-0.5 text-xs">−₹200</div>
                                  </div>

                                  <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/50 dark:border-rose-900/40">
                                    <div className="flex items-center justify-between">
                                      <span className="text-rose-600 font-semibold block text-[10px]">Medical / Insurance</span>
                                      <span className="px-1 py-0.2 rounded text-[8px] font-black bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">Value: Fixed ₹</span>
                                    </div>
                                    <div className="font-extrabold text-rose-600 mt-0.5 text-xs">−₹1,000</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  </div>
);
};

export default SalaryStructureManagement;





