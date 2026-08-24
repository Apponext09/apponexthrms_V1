import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, RotateCcw, Search, Check, Layers,
  Database, History, ChevronDown, ChevronRight, X, User
} from 'lucide-react';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ComponentGroup {
  id: string | number;
  name: string;
  category: 'Earning' | 'Deduction' | string;
  roundFormat?: string;
  round_format?: string;
  groupFunction?: string;
  group_function?: string;
  configureOnProfile?: boolean;
  configure_on_profile?: boolean;
  displayOnProfile?: boolean;
  display_on_profile?: boolean;
  isEditable?: boolean;
  is_editable?: boolean;
  contributedBy?: string;
  contributed_by?: string;
  recalculateOnChange?: boolean;
  recalculate_on_change?: boolean;
  groupForPayslip?: string;
  group_for_payslip?: string;
  displayOrder?: number;
  display_order?: number;
  disableArrear?: boolean;
  disable_arrear?: boolean;
  displayTotalOnProcess?: boolean;
  display_total_on_process?: boolean;
  tdsSameMonth?: boolean;
  tds_same_month?: boolean;
  isTaxable?: boolean;
  is_taxable?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  components?: ComponentItem[];
}

interface ComponentItem {
  id: string | number;
  groupId?: string | number;
  group_id?: string | number;
  name: string;
  type: 'Value' | 'Derived' | 'Module' | string;
  component_type?: string;
  amount?: number;
  formula?: string;
  moduleSource?: string;
  module_source?: string;
  basedOnAttendance?: boolean;
  based_on_attendance?: boolean;
  isNonCashable?: boolean;
  is_non_cashable?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  boundaryType?: string;
  boundary_type?: string;
  minAmount?: number;
  min_amount?: number;
  maxAmount?: number;
  max_amount?: number;
  effectiveFromDate?: string;
  effective_from_date?: string;
  effectiveToDate?: string;
  effective_to_date?: string;
  conditionOn?: string;
  condition_on?: string;
  conditionOperator?: string;
  condition_operator?: string;
  conditionValue1?: string | number;
  condition_value1?: string | number;
  conditionValue2?: string | number;
  condition_value2?: string | number;
  genderFilter?: string;
  gender_filter?: string;
  months?: string[];
  grades?: string[];
  departments?: string[];
  locations?: string[];
  employees?: string[];
}

export const MasterPayrollComponents: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'Earning' | 'Deduction'>('Earning');
  const [groups, setGroups] = useState<ComponentGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | number | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | number | null>(null);

  // Left Side Filter States
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Master Options for Employment Filters — populated from API only, never hardcoded
  const [gradeOptions, setGradeOptions] = useState<string[]>([]);
  const [deptOptions, setDeptOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);
  const monthOptions = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Left Side Group Form State (In-place & Expandable)
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | number | null>(null);
  const [savingGroup, setSavingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState<{
    name: string;
    roundFormat: string;
    groupFunction: string;
    configureOnProfile: boolean;
    displayOnProfile: boolean;
    isEditable: boolean;
    contributedBy: string;
    isActive: boolean;
    recalculateOnChange: boolean;
    groupForPayslip: string;
    displayOrder: number;
    disableArrear: boolean;
    displayTotalOnProcess: boolean;
    tdsSameMonth: boolean;
    isTaxable: boolean;
  }>({
    name: '',
    roundFormat: 'Round',
    groupFunction: 'Max',
    configureOnProfile: false,
    displayOnProfile: false,
    isEditable: true,
    contributedBy: 'Employee',
    isActive: true,
    recalculateOnChange: false,
    groupForPayslip: 'Choose',
    displayOrder: 10,
    disableArrear: true,
    displayTotalOnProcess: false,
    tdsSameMonth: false,
    isTaxable: true,
  });

  // Right Side Component Form State
  const [compForm, setCompForm] = useState<{
    name: string;
    isNonCashable: boolean;
    basedOnAttendance: boolean;
    isActive: boolean;
    type: 'Value' | 'Derived' | 'Module';
    amount: number;
    formula: string;
    moduleSource: string;
    boundaryType: string;
    minAmount: number;
    maxAmount: number;
    effectiveFromDate: string;
    effectiveToDate: string;
    // Condition Setting
    conditionOn: string;
    conditionOperator: string;
    conditionValue1: string;
    conditionValue2: string;
    // Employment Setting
    genderFilter: string;
    months: string[];
    grades: string[];
    departments: string[];
    locations: string[];
    employees: string[];
  }>({
    name: '',
    isNonCashable: false,
    basedOnAttendance: false,
    isActive: true,
    type: 'Value',
    amount: 0,
    formula: '',
    moduleSource: 'Choose',
    boundaryType: 'Choose',
    minAmount: 0,
    maxAmount: 0,
    effectiveFromDate: '',
    effectiveToDate: '',
    conditionOn: 'Choose',
    conditionOperator: 'Choose',
    conditionValue1: '',
    conditionValue2: '',
    genderFilter: 'All',
    months: [],
    grades: [],
    departments: [],
    locations: [],
    employees: [],
  });

  // Formula validation helper with bracket pairing and operator checks
  const validateFormulaSyntax = (formulaStr: string): { isValid: boolean; error?: string } => {
    if (!formulaStr || !formulaStr.trim()) return { isValid: false, error: 'Formula cannot be empty' };
    const str = formulaStr.trim();

    // 1. Bracket pairing [ ... ]
    const openBrackets = (str.match(/\[/g) || []).length;
    const closeBrackets = (str.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      return { isValid: false, error: `Unmatched square brackets [ ]: ${openBrackets} open vs ${closeBrackets} closed` };
    }

    // 2. Empty bracket check []
    if (/\[\s*\]/.test(str)) {
      return { isValid: false, error: 'Empty brackets [] found. Please specify a component name inside [ ].' };
    }

    // 3. Parentheses pairing ( ... )
    const openParens = (str.match(/\(/g) || []).length;
    const closeParens = (str.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return { isValid: false, error: `Unmatched parentheses ( ): ${openParens} open vs ${closeParens} closed` };
    }

    // 4. Consecutive operators like ++, --, **, //, +*, *+, etc.
    if (/[\+\-\*\/]{2,}/.test(str.replace(/\*\*/g, ''))) {
      return { isValid: false, error: 'Invalid consecutive math operators detected (e.g. ++, //, *+).' };
    }

    // 5. Trailing operator at the end e.g. [CTC] +
    if (/[\+\-\*\/\,\(]$/.test(str)) {
      return { isValid: false, error: 'Formula cannot end with an open operator or parenthesis.' };
    }

    return { isValid: true };
  };

  // Helper to insert tokens with exact single-space formatting
  const insertFormulaToken = (token: string) => {
    setCompForm(prev => {
      const current = (prev.formula || '').trim();
      if (!current) return { ...prev, formula: token };

      // If math operator (+, -, *, /), ensure exactly one space before and after
      if (['+', '-', '*', '/'].includes(token)) {
        return { ...prev, formula: `${current} ${token} ` };
      }

      // If open parenthesis / function
      if (token === '(' || token === 'min(' || token === 'max(') {
        const lastChar = current.slice(-1);
        const needSpace = !['+', '-', '*', '/', '(', ','].includes(lastChar);
        return { ...prev, formula: needSpace ? `${current} ${token}` : `${current}${token}` };
      }

      // If close parenthesis
      if (token === ')') {
        return { ...prev, formula: `${current})` };
      }

      // If component / CTC bracket token, ensure one space separator
      const lastChar = current.slice(-1);
      const needSpace = !['+', '-', '*', '/', '(', ','].includes(lastChar);
      return { ...prev, formula: needSpace ? `${current} ${token}` : `${current}${token}` };
    });
  };

  // Right Side Accordions (Collapsible)
  const [isFormulaOpen, setIsFormulaOpen] = useState(true);
  const [isConditionOpen, setIsConditionOpen] = useState(false);
  const [isEmploymentOpen, setIsEmploymentOpen] = useState(false);

  // Employment Setting Sub-filters (Grade, Dept, Location, Employee, Month)
  const [isGradeFilterOpen, setIsGradeFilterOpen] = useState(true);
  const [isDeptFilterOpen, setIsDeptFilterOpen] = useState(false);
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
  const [isEmployeeFilterOpen, setIsEmployeeFilterOpen] = useState(false);
  const [isMonthFilterOpen, setIsMonthFilterOpen] = useState(false);

  const [savingComp, setSavingComp] = useState(false);

  // Fetch groups, components and master lists
  const fetchData = async () => {
    setLoading(true);
    try {
      const [grpRes, compRes, gradesRes, deptsRes, locsRes, empsRes] = await Promise.all([
        apiClient.get('/payroll/component-groups').catch(() => ({ data: { data: [] } })),
        apiClient.get('/payroll/component-definitions').catch(() => ({ data: { data: [] } })),
        apiClient.get('/settings/grades').catch(() => apiClient.get('/settings/pay-grades')).catch(() => ({ data: [] })),
        apiClient.get('/settings/departments').catch(() => ({ data: [] })),
        apiClient.get('/settings/locations').catch(() => apiClient.get('/settings/branches')).catch(() => ({ data: [] })),
        apiClient.get('/employees', { params: { pageSize: 100 } }).catch(() => ({ data: [] })),
      ]);

      const rawGroups: any[] = grpRes.data?.data || grpRes.data || [];
      const rawComps: any[] = compRes.data?.data || compRes.data || [];

      // Parse Master Options
      const gList: any[] = gradesRes.data?.data || gradesRes.data || [];
      if (Array.isArray(gList) && gList.length > 0) {
        setGradeOptions(Array.from(new Set(gList.map(g => g.name || g.grade_name || g.gradeName || String(g)).filter(Boolean))));
      }

      const dList: any[] = deptsRes.data?.data || deptsRes.data || [];
      if (Array.isArray(dList) && dList.length > 0) {
        setDeptOptions(Array.from(new Set(dList.map(d => d.name || d.department_name || d.departmentName || String(d)).filter(Boolean))));
      }

      const lList: any[] = locsRes.data?.data || locsRes.data || [];
      if (Array.isArray(lList) && lList.length > 0) {
        setLocationOptions(Array.from(new Set(lList.map(l => l.name || l.location_name || l.branch_name || String(l)).filter(Boolean))));
      }

      const rawEmps = empsRes.data?.data?.items || empsRes.data?.data || empsRes.data || [];
      const eList: any[] = Array.isArray(rawEmps) ? rawEmps : [];
      if (eList.length > 0) {
        setEmployeeOptions(
          Array.from(
            new Set(
              eList.map(e => {
                const first = (e.first_name || e.firstName || e.name || '').trim();
                const last = (e.last_name || e.lastName || '').trim();
                const code = e.employee_code || e.employeeCode || `EMP-${e.id}`;
                const fullName = `${first} ${last}`.trim();
                return fullName ? `${fullName} (${code})` : `Employee (${code})`;
              }).filter(Boolean)
            )
          )
        );
      }

      // Merge child components into their corresponding groups
      const mergedGroups: ComponentGroup[] = rawGroups.map(g => {
        const gid = String(g.id);
        const childComps: ComponentItem[] = rawComps.filter(c => String(c.groupId || c.group_id) === gid).map(c => ({
          id: c.id,
          groupId: c.groupId || c.group_id,
          name: c.name,
          type: c.type || c.component_type || 'Value',
          amount: Number(c.amount || 0),
          formula: c.formula || '',
          moduleSource: c.moduleSource || c.module_source || 'Choose',
          basedOnAttendance: Boolean(c.basedOnAttendance ?? c.based_on_attendance),
          isNonCashable: Boolean(c.isNonCashable ?? c.is_non_cashable),
          isActive: (c.isActive ?? c.is_active) !== 0 && (c.isActive ?? c.is_active) !== false,
          boundaryType: c.boundaryType || c.boundary_type || 'Choose',
          minAmount: Number(c.minAmount || c.min_amount || 0),
          maxAmount: Number(c.maxAmount || c.max_amount || 0),
          effectiveFromDate: c.effectiveFromDate || c.effective_from_date || '',
          effectiveToDate: c.effectiveToDate || c.effective_to_date || '',
          conditionOn: c.conditionOn || c.condition_on || 'Choose',
          conditionOperator: c.conditionOperator || c.condition_operator || 'Choose',
          conditionValue1: c.conditionValue1 || c.condition_value1 || '',
          conditionValue2: c.conditionValue2 || c.condition_value2 || '',
          genderFilter: c.genderFilter || c.gender_filter || 'All',
          months: typeof c.months === 'string' ? JSON.parse(c.months || '[]') : (c.months || []),
          grades: typeof c.grades === 'string' ? JSON.parse(c.grades || '[]') : (c.grades || []),
          departments: typeof c.departments === 'string' ? JSON.parse(c.departments || '[]') : (c.departments || []),
          locations: typeof c.locations === 'string' ? JSON.parse(c.locations || '[]') : (c.locations || []),
          employees: typeof c.employees === 'string' ? JSON.parse(c.employees || '[]') : (c.employees || []),
        }));

        return {
          id: g.id,
          name: g.name,
          category: g.category || 'Earning',
          roundFormat: g.roundFormat || g.round_format || 'Round',
          groupFunction: g.groupFunction || g.group_function || 'Max',
          configureOnProfile: Boolean(g.configureOnProfile ?? g.configure_on_profile),
          displayOnProfile: Boolean(g.displayOnProfile ?? g.display_on_profile),
          isEditable: (g.isEditable ?? g.is_editable) !== false && (g.isEditable ?? g.is_editable) !== 0,
          contributedBy: g.contributedBy || g.contributed_by || 'Employee',
          recalculateOnChange: Boolean(g.recalculateOnChange ?? g.recalculate_on_change),
          groupForPayslip: g.groupForPayslip || g.group_for_payslip || (g.category === 'Deduction' ? 'Deductions' : 'Car Allowance'),
          displayOrder: Number(g.displayOrder || g.display_order || 10),
          disableArrear: Boolean(g.disableArrear ?? g.disable_arrear ?? true),
          displayTotalOnProcess: Boolean(g.displayTotalOnProcess ?? g.display_total_on_process),
          tdsSameMonth: Boolean(g.tdsSameMonth ?? g.tds_same_month),
          isTaxable: (g.isTaxable ?? g.is_taxable) !== false && (g.isTaxable ?? g.is_taxable) !== 0,
          isActive: (g.isActive ?? g.is_active) !== 0 && (g.isActive ?? g.is_active) !== false,
          components: childComps,
        };
      });

      setGroups(mergedGroups);

      // Default selection to first group of current category
      const currentCategoryGroups = mergedGroups.filter(
        g => (g.category?.toLowerCase() || '').includes(activeCategory.toLowerCase())
      );

      if (currentCategoryGroups.length > 0) {
        const firstGroup = currentCategoryGroups[0];
        setSelectedGroupId(firstGroup.id);
        populateGroupForm(firstGroup);
        if (firstGroup.components && firstGroup.components.length > 0) {
          populateComponentForm(firstGroup.components[0], firstGroup.id);
        } else {
          resetComponentForm(firstGroup.id, firstGroup.name);
        }
      }
    } catch (err: any) {
      console.error('Failed to load payroll groups:', err);
      showToast.error('Load Error', err.message || 'Could not load component groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When activeCategory changes (Earning <-> Deduction)
  useEffect(() => {
    const currentCategoryGroups = groups.filter(
      g => (g.category?.toLowerCase() || '').includes(activeCategory.toLowerCase())
    );
    if (currentCategoryGroups.length > 0) {
      const firstGroup = currentCategoryGroups[0];
      setSelectedGroupId(firstGroup.id);
      populateGroupForm(firstGroup);
      if (firstGroup.components && firstGroup.components.length > 0) {
        populateComponentForm(firstGroup.components[0], firstGroup.id);
      } else {
        resetComponentForm(firstGroup.id, firstGroup.name);
      }
    } else {
      setSelectedGroupId(null);
      handleNewGroupClick();
      resetComponentForm(null, '');
    }
    setIsGroupFormOpen(false);
  }, [activeCategory]);

  const populateGroupForm = (g: ComponentGroup) => {
    setEditingGroupId(g.id);
    setGroupForm({
      name: g.name,
      roundFormat: g.roundFormat || 'Round',
      groupFunction: g.groupFunction || 'Max',
      configureOnProfile: Boolean(g.configureOnProfile),
      displayOnProfile: Boolean(g.displayOnProfile),
      isEditable: g.isEditable !== false,
      contributedBy: g.contributedBy || 'Employee',
      isActive: g.isActive !== false,
      recalculateOnChange: Boolean(g.recalculateOnChange),
      groupForPayslip: g.groupForPayslip || (activeCategory === 'Deduction' ? 'Deductions' : 'Car Allowance'),
      displayOrder: g.displayOrder ?? 10,
      disableArrear: g.disableArrear !== false,
      displayTotalOnProcess: Boolean(g.displayTotalOnProcess),
      tdsSameMonth: Boolean(g.tdsSameMonth),
      isTaxable: g.isTaxable !== false,
    });
  };

  const handleNewGroupClick = () => {
    setEditingGroupId(null);
    setGroupForm({
      name: '',
      roundFormat: 'Round',
      groupFunction: 'Max',
      configureOnProfile: false,
      displayOnProfile: false,
      isEditable: true,
      contributedBy: 'Employee',
      isActive: true,
      recalculateOnChange: false,
      groupForPayslip: activeCategory === 'Deduction' ? 'Deductions' : 'Car Allowance',
      displayOrder: 10,
      disableArrear: true,
      displayTotalOnProcess: false,
      tdsSameMonth: false,
      isTaxable: true,
    });
    setIsGroupFormOpen(true);
  };

  const handleEditGroupClick = (g: ComponentGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedGroupId(g.id);
    populateGroupForm(g);
    setIsGroupFormOpen(true);
  };

  const handleCancelGroupForm = () => {
    setIsGroupFormOpen(false);
    setEditingGroupId(null);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      showToast.error('Validation Error', 'Group Name is required.');
      return;
    }
    setSavingGroup(true);
    try {
      const payload = {
        name: groupForm.name.trim(),
        category: activeCategory,
        roundFormat: groupForm.roundFormat,
        groupFunction: groupForm.groupFunction,
        configureOnProfile: groupForm.configureOnProfile,
        displayOnProfile: groupForm.displayOnProfile,
        isEditable: groupForm.isEditable,
        contributedBy: groupForm.contributedBy,
        isActive: groupForm.isActive,
        recalculateOnChange: groupForm.recalculateOnChange,
        groupForPayslip: groupForm.groupForPayslip,
        displayOrder: Number(groupForm.displayOrder || 10),
        disableArrear: groupForm.disableArrear,
        displayTotalOnProcess: groupForm.displayTotalOnProcess,
        tdsSameMonth: groupForm.tdsSameMonth,
        isTaxable: groupForm.isTaxable,
      };

      if (editingGroupId) {
        await apiClient.put(`/payroll/component-groups/${editingGroupId}`, payload);
        showToast.success('Group Updated', `"${groupForm.name}" updated successfully.`);
      } else {
        const res = await apiClient.post('/payroll/component-groups', payload);
        const newId = res.data?.data?.id || res.data?.id;
        setSelectedGroupId(newId);
        showToast.success('Group Created', `"${groupForm.name}" created successfully.`);
      }
      setIsGroupFormOpen(false);
      await fetchData();
    } catch (err: any) {
      showToast.error('Save Failed', err.response?.data?.message || err.message);
    } finally {
      setSavingGroup(false);
    }
  };

  const populateComponentForm = (comp: ComponentItem, groupId?: string | number | null) => {
    setSelectedComponentId(comp.id);
    setSelectedGroupId(groupId || comp.groupId || comp.group_id || selectedGroupId);
    setCompForm({
      name: comp.name || '',
      isNonCashable: Boolean(comp.isNonCashable),
      basedOnAttendance: Boolean(comp.basedOnAttendance),
      isActive: comp.isActive !== false,
      type: (comp.type as any) || 'Value',
      amount: comp.amount || 0,
      formula: comp.formula || '',
      moduleSource: comp.moduleSource || 'Choose',
      boundaryType: comp.boundaryType || 'Choose',
      minAmount: comp.minAmount || 0,
      maxAmount: comp.maxAmount || 0,
      effectiveFromDate: comp.effectiveFromDate ? String(comp.effectiveFromDate).slice(0, 10) : '',
      effectiveToDate: comp.effectiveToDate ? String(comp.effectiveToDate).slice(0, 10) : '',
      conditionOn: comp.conditionOn || 'Choose',
      conditionOperator: comp.conditionOperator || 'Choose',
      conditionValue1: String(comp.conditionValue1 || ''),
      conditionValue2: String(comp.conditionValue2 || ''),
      genderFilter: comp.genderFilter || 'All',
      months: comp.months || [],
      grades: comp.grades || [],
      departments: comp.departments || [],
      locations: comp.locations || [],
      employees: comp.employees || [],
    });
  };

  const resetComponentForm = (groupId?: string | number | null, defaultName?: string) => {
    setSelectedComponentId(null);
    if (groupId !== undefined) setSelectedGroupId(groupId);
    setCompForm({
      name: defaultName || '',
      isNonCashable: false,
      basedOnAttendance: false,
      isActive: true,
      type: 'Value',
      amount: 0,
      formula: '',
      moduleSource: 'Choose',
      boundaryType: 'Choose',
      minAmount: 0,
      maxAmount: 0,
      effectiveFromDate: '',
      effectiveToDate: '',
      conditionOn: 'Choose',
      conditionOperator: 'Choose',
      conditionValue1: '',
      conditionValue2: '',
      genderFilter: 'All',
      months: [],
      grades: [],
      departments: [],
      locations: [],
      employees: [],
    });
  };

  const handleCancelComponentForm = () => {
    resetComponentForm(selectedGroupId, groupForm.name);
    setIsFormulaOpen(false);
    setIsConditionOpen(false);
    setIsEmploymentOpen(false);
  };

  // Component Save Handler
  const handleSaveComponent = async () => {
    if (!compForm.name.trim()) {
      showToast.error('Validation Error', 'Component name is required.');
      return;
    }
    if (!selectedGroupId) {
      showToast.error('Group Error', 'Please select or create a Group on the left first.');
      return;
    }

    if (compForm.type === 'Derived') {
      const check = validateFormulaSyntax(compForm.formula);
      if (!check.isValid) {
        showToast.error('Formula Syntax Error', check.error || 'Please enter a valid formula expression.');
        return;
      }
    }

    setSavingComp(true);
    try {
      const payload = {
        groupId: selectedGroupId,
        group_id: selectedGroupId,
        name: compForm.name.trim(),
        type: compForm.type,
        component_type: compForm.type,
        amount: compForm.type === 'Value' ? Number(compForm.amount || 0) : 0,
        formula: compForm.type === 'Derived' ? compForm.formula.trim() : null,
        moduleSource: compForm.type === 'Module' ? compForm.moduleSource : null,
        module_source: compForm.type === 'Module' ? compForm.moduleSource : null,
        basedOnAttendance: compForm.basedOnAttendance,
        based_on_attendance: compForm.basedOnAttendance,
        isNonCashable: compForm.isNonCashable,
        is_non_cashable: compForm.isNonCashable,
        isActive: compForm.isActive,
        is_active: compForm.isActive,
        boundaryType: compForm.boundaryType,
        boundary_type: compForm.boundaryType,
        minAmount: Number(compForm.minAmount || 0),
        min_amount: Number(compForm.minAmount || 0),
        maxAmount: Number(compForm.maxAmount || 0),
        max_amount: Number(compForm.maxAmount || 0),
        effectiveFromDate: compForm.effectiveFromDate || null,
        effective_from_date: compForm.effectiveFromDate || null,
        effectiveToDate: compForm.effectiveToDate || null,
        effective_to_date: compForm.effectiveToDate || null,
        conditionOn: compForm.conditionOn,
        condition_on: compForm.conditionOn,
        conditionOperator: compForm.conditionOperator,
        condition_operator: compForm.conditionOperator,
        conditionValue1: compForm.conditionValue1,
        condition_value1: compForm.conditionValue1,
        conditionValue2: compForm.conditionValue2,
        condition_value2: compForm.conditionValue2,
        genderFilter: compForm.genderFilter,
        gender_filter: compForm.genderFilter,
        months: compForm.months,
        grades: compForm.grades,
        departments: compForm.departments,
        locations: compForm.locations,
        employees: compForm.employees,
      };

      if (selectedComponentId) {
        await apiClient.put(`/payroll/component-definitions/${selectedComponentId}`, payload);
        showToast.success('Component Updated', `"${compForm.name}" updated.`);
      } else {
        const res = await apiClient.post('/payroll/component-definitions', payload);
        const newId = res.data?.data?.id || res.data?.id;
        setSelectedComponentId(newId);
        showToast.success('Component Created', `"${compForm.name}" added.`);
      }
      await fetchData();
    } catch (err: any) {
      showToast.error('Save Failed', err.response?.data?.message || err.message);
    } finally {
      setSavingComp(false);
    }
  };

  const handleDeleteComponent = async (id: string | number, name: string) => {
    if (!window.confirm(`Delete component "${name}"?`)) return;
    try {
      await apiClient.delete(`/payroll/components/${id}`);
      showToast.success('Component Deleted', `"${name}" removed.`);
      resetComponentForm(selectedGroupId, groupForm.name);
      await fetchData();
    } catch (err: any) {
      showToast.error('Delete Failed', err.response?.data?.message || err.message);
    }
  };

  // Filter groups
  const categoryGroups = groups.filter(
    g => (g.category?.toLowerCase() || '').includes(activeCategory.toLowerCase())
  );

  const filteredGroups = categoryGroups.filter(g => {
    if (groupFilter !== 'all' && String(g.id) !== groupFilter) return false;
    if (statusFilter === 'active' && !g.isActive) return false;
    if (statusFilter === 'inactive' && g.isActive) return false;
    if (searchTerm.trim()) {
      const matchGroupName = g.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchComp = (g.components || []).some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchGroupName || matchComp;
    }
    return true;
  });

  const totalComponentsCount = categoryGroups.reduce((acc, g) => acc + (g.components?.length || 0), 0);

  const allComponentNames = Array.from(
    new Set(groups.flatMap(g => (g.components || []).map(c => c.name)))
  ).filter(Boolean);

  // Group Form In-Place Renderer
  const renderGroupFormContent = (isNew: boolean) => (
    <div className="bg-card border-2 border-primary/50 rounded-xl shadow-md p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Form Title & Close X */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border/80">
        <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" />
          {isNew ? `Create ${activeCategory} Group` : `Edit Group: ${groupForm.name}`}
        </span>
        <button
          type="button"
          onClick={handleCancelGroupForm}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Close Form"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Group Name * */}
      <div>
        <label className="text-[11px] font-bold text-foreground block mb-1">
          Group Name <span className="text-rose-500">*</span>
        </label>
        <Input
          value={groupForm.name}
          onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
          placeholder="e.g. Adjustment"
          className="h-8 text-xs font-semibold bg-background"
        />
      </div>

      {/* Round Format * | Group Function * */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-foreground block mb-1">
            Round Format <span className="text-rose-500">*</span>
          </label>
          <select
            value={groupForm.roundFormat}
            onChange={e => setGroupForm({ ...groupForm, roundFormat: e.target.value })}
            className="w-full h-8 border border-input bg-background text-foreground rounded-lg px-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="Round">Round</option>
            <option value="Round two decimal">Round two decimal</option>
            <option value="Round Up">Round Up</option>
            <option value="Round Down">Round Down</option>
            <option value="None">None</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-foreground block mb-1">
            Group Function <span className="text-rose-500">*</span>
          </label>
          <select
            value={groupForm.groupFunction}
            onChange={e => setGroupForm({ ...groupForm, groupFunction: e.target.value })}
            className="w-full h-8 border border-input bg-background text-foreground rounded-lg px-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="Max">Max</option>
            <option value="Sum">Sum</option>
            <option value="Min">Min</option>
            <option value="Average">Average</option>
          </select>
        </div>
      </div>

      {/* Configure On Profile | Display On Profile | Is Editable */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold text-foreground block mb-1">Configure On Profile</label>
          <div className="flex border border-border rounded-lg overflow-hidden h-7">
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, configureOnProfile: false })}
              className={`flex-1 text-[10px] font-bold ${!groupForm.configureOnProfile ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, configureOnProfile: true })}
              className={`flex-1 text-[10px] font-bold ${groupForm.configureOnProfile ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Yes
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-foreground block mb-1">Display On Profile</label>
          <div className="flex border border-border rounded-lg overflow-hidden h-7">
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, displayOnProfile: false })}
              className={`flex-1 text-[10px] font-bold ${!groupForm.displayOnProfile ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, displayOnProfile: true })}
              className={`flex-1 text-[10px] font-bold ${groupForm.displayOnProfile ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Yes
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-foreground block mb-1">Is Editable</label>
          <div className="flex border border-border rounded-lg overflow-hidden h-7">
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, isEditable: false })}
              className={`flex-1 text-[10px] font-bold ${!groupForm.isEditable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, isEditable: true })}
              className={`flex-1 text-[10px] font-bold ${groupForm.isEditable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Yes
            </button>
          </div>
        </div>
      </div>

      {/* Contributed By * | Active */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-foreground block mb-1">Contributed By <span className="text-rose-500">*</span></label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, contributedBy: 'Employee' })}
              className={`flex-1 h-7 rounded-lg text-xs font-bold border transition-colors ${groupForm.contributedBy === 'Employee' ? 'bg-primary text-primary-foreground border-primary shadow-2xs' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'}`}
            >
              {groupForm.contributedBy === 'Employee' && <Check className="w-3 h-3 inline mr-1" />}
              Employee
            </button>
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, contributedBy: 'Employer' })}
              className={`flex-1 h-7 rounded-lg text-xs font-bold border transition-colors ${groupForm.contributedBy === 'Employer' ? 'bg-primary text-primary-foreground border-primary shadow-2xs' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'}`}
            >
              {groupForm.contributedBy === 'Employer' && <Check className="w-3 h-3 inline mr-1" />}
              Employer
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-foreground block mb-1">Active</label>
          <div className="flex border border-border rounded-lg overflow-hidden h-7 w-28">
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, isActive: false })}
              className={`flex-1 text-xs font-bold ${!groupForm.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, isActive: true })}
              className={`flex-1 text-xs font-bold ${groupForm.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Yes
            </button>
          </div>
        </div>
      </div>

      {/* Recalculate Payroll On Change | Group For Payslip | Display Order */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold text-foreground block mb-1 leading-tight">Recalculate On Change</label>
          <div className="flex border border-border rounded-lg overflow-hidden h-7">
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, recalculateOnChange: false })}
              className={`flex-1 text-[10px] font-bold ${!groupForm.recalculateOnChange ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, recalculateOnChange: true })}
              className={`flex-1 text-[10px] font-bold ${groupForm.recalculateOnChange ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Yes
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-foreground block mb-1">Group For Payslip</label>
          <select
            value={groupForm.groupForPayslip || 'Choose'}
            onChange={e => setGroupForm({ ...groupForm, groupForPayslip: e.target.value })}
            className="w-full h-7 border border-input bg-background text-foreground rounded-lg px-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="Choose">Choose</option>
            <option value="Car Allowance">Car Allowance</option>
            <option value="Basic">Basic</option>
            <option value="HRA">HRA</option>
            <option value="Special Allowance">Special Allowance</option>
            <option value="Earnings">Earnings</option>
            <option value="Deductions">Deductions</option>
            <option value="Statutory">Statutory</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-foreground block mb-1">Display Order</label>
          <Input
            type="number"
            value={groupForm.displayOrder}
            onChange={e => setGroupForm({ ...groupForm, displayOrder: Number(e.target.value) })}
            className="h-7 text-xs font-semibold bg-background"
          />
        </div>
      </div>

      {/* Disable Arrear | Display Total On Process Payroll | TDS deducted on same month */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold text-foreground block mb-1">Disable Arrear</label>
          <div className="flex border border-border rounded-lg overflow-hidden h-7">
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, disableArrear: false })}
              className={`flex-1 text-[10px] font-bold ${!groupForm.disableArrear ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, disableArrear: true })}
              className={`flex-1 text-[10px] font-bold ${groupForm.disableArrear ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Yes
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-foreground block mb-1 leading-tight">Display Total On Process</label>
          <div className="flex border border-border rounded-lg overflow-hidden h-7">
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, displayTotalOnProcess: false })}
              className={`flex-1 text-[10px] font-bold ${!groupForm.displayTotalOnProcess ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, displayTotalOnProcess: true })}
              className={`flex-1 text-[10px] font-bold ${groupForm.displayTotalOnProcess ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Yes
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-foreground block mb-1 leading-tight">TDS in same month</label>
          <div className="flex border border-border rounded-lg overflow-hidden h-7">
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, tdsSameMonth: false })}
              className={`flex-1 text-[10px] font-bold ${!groupForm.tdsSameMonth ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setGroupForm({ ...groupForm, tdsSameMonth: true })}
              className={`flex-1 text-[10px] font-bold ${groupForm.tdsSameMonth ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Yes
            </button>
          </div>
        </div>
      </div>

      {/* Taxable Toggle */}
      <div>
        <label className="text-[10px] font-bold text-foreground block mb-1">Taxable</label>
        <div className="flex border border-border rounded-lg overflow-hidden h-7 w-28">
          <button
            type="button"
            onClick={() => setGroupForm({ ...groupForm, isTaxable: false })}
            className={`flex-1 text-xs font-bold ${!groupForm.isTaxable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => setGroupForm({ ...groupForm, isTaxable: true })}
            className={`flex-1 text-xs font-bold ${groupForm.isTaxable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            Yes
          </button>
        </div>
      </div>

      {/* Group Save Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button
          type="button"
          onClick={handleSaveGroup}
          disabled={savingGroup}
          className="h-8 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {isNew ? 'Save' : 'Update'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleCancelGroupForm}
          className="h-8 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans text-xs">
      {/* ═══════════════════════════════════════════════════════════════════════
          LEFT COLUMN (45%): Earning / Deduction Tabs, Filters, Group Form & Stack
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-5 space-y-3.5">
        {/* 1. Filter Bar (Inside Left Column Only) */}
        <div className="flex items-center gap-2 bg-card border border-border p-2 rounded-xl shadow-2xs">
          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            className="h-8 text-xs font-semibold border border-input rounded-lg px-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[120px]"
          >
            <option value="all">{activeCategory} Group ▾</option>
            {categoryGroups.map(g => (
              <option key={g.id} value={String(g.id)}>{g.name}</option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search term..."
              className="h-8 pl-7 text-xs bg-background"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="h-8 text-xs font-semibold border border-input rounded-lg px-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-24"
          >
            <option value="active">Active ▾</option>
            <option value="inactive">Inactive</option>
            <option value="all">All Status</option>
          </select>
        </div>

        {/* 2. Category Switch Tabs (Inside Left Column Only - Earning / Deduction) */}
        <div className="flex border border-border/80 rounded-xl overflow-hidden shadow-2xs bg-card">
          <button
            type="button"
            onClick={() => setActiveCategory('Earning')}
            className={`flex-1 py-2.5 text-xs font-bold tracking-tight text-center transition-all cursor-pointer ${
              activeCategory === 'Earning'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            Earning
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('Deduction')}
            className={`flex-1 py-2.5 text-xs font-bold tracking-tight text-center transition-all cursor-pointer ${
              activeCategory === 'Deduction'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            Deduction
          </button>
        </div>

        {/* 3. Header Row: Title, + Group Button, Count Badge */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-xs font-bold text-foreground tracking-tight">
            {activeCategory} Group
          </h2>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleNewGroupClick}
              className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Group
            </Button>

            <div className="flex items-center gap-1 px-2 py-0.5 bg-muted border border-border text-xs font-mono font-bold text-muted-foreground rounded-md">
              <Database className="w-3.5 h-3.5" />
              <span>{totalComponentsCount}</span>
            </div>
          </div>
        </div>

        {/* 4. Top New Group Form (Only when clicking + Group) */}
        {isGroupFormOpen && editingGroupId === null && (
          <div className="mb-3">
            {renderGroupFormContent(true)}
          </div>
        )}

        {/* 5. Scrollable Group Cards Stack */}
        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-card">
              No {activeCategory.toLowerCase()} groups found.
              <button
                onClick={handleNewGroupClick}
                className="block mx-auto mt-2 font-semibold text-primary hover:underline"
              >
                + Create First Group
              </button>
            </div>
          ) : (
            filteredGroups.map(group => {
              const isEditingThisGroup = isGroupFormOpen && String(editingGroupId) === String(group.id);
              const isGroupSelected = String(group.id) === String(selectedGroupId);
              const comps = group.components || [];

              // If this specific group is being edited, open its form directly in its own place!
              if (isEditingThisGroup) {
                return (
                  <div key={group.id} className="scroll-mt-4">
                    {renderGroupFormContent(false)}
                  </div>
                );
              }

              return (
                <div
                  key={group.id}
                  className={`rounded-xl border transition-all overflow-hidden bg-card ${
                    isGroupSelected ? 'border-primary shadow-xs ring-1 ring-primary/20' : 'border-border'
                  }`}
                >
                  {/* Cyan / Teal Gradient Group Header Banner */}
                  <div
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      populateGroupForm(group);
                      if (comps.length > 0) {
                        populateComponentForm(comps[0], group.id);
                      } else {
                        resetComponentForm(group.id, group.name);
                      }
                    }}
                    className="p-3 bg-gradient-to-r from-teal-500/15 via-cyan-500/10 to-transparent dark:from-teal-500/25 border-b border-border/80 cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span className="font-bold text-xs text-foreground truncate">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 bg-background/80 text-muted-foreground border-border">
                          {activeCategory[0]} {group.name.replace(/\s+/g, '_').toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleEditGroupClick(group, e)}
                        className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Edit Group Settings"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          showToast.info('Audit Log', `Viewing audit log for ${group.name}`);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground text-[10px] font-semibold rounded border border-border transition-colors cursor-pointer"
                      >
                        <History className="w-3 h-3" /> Audit Log
                      </button>
                    </div>
                  </div>

                  {/* Child Components List inside this Group */}
                  <div className="p-2 space-y-1.5 bg-card/60">
                    {comps.length === 0 ? (
                      <div className="py-2 text-center text-[11px] text-muted-foreground italic">
                        No components in this group yet. Click &quot;+ Add Component&quot; on right.
                      </div>
                    ) : (
                      comps.map(comp => {
                        const isCompSelected = String(comp.id) === String(selectedComponentId);
                        return (
                          <div
                            key={comp.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              populateComponentForm(comp, group.id);
                              populateGroupForm(group);
                            }}
                            className={`p-2 px-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isCompSelected
                                ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20 shadow-2xs font-semibold'
                                : 'bg-background hover:bg-muted/40 border-border text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs truncate">{comp.name}</span>
                              {comp.type && (
                                <span className="text-[10px] font-mono opacity-70 px-1.5 py-0.2 bg-muted rounded border border-border/50">
                                  {comp.type}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                populateComponentForm(comp, group.id);
                                populateGroupForm(group);
                                setIsFormulaOpen(true);
                              }}
                              className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              title="Edit Component Formula"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          RIGHT COLUMN (55%): Component Settings & Formula Configuration Panel
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-card border border-border rounded-xl shadow-xs p-5 space-y-4">
          {/* Header Row: Selected Group Name (Left), + Add Component & Refresh (Right) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/80">
            <h2 className="text-sm font-bold text-foreground">
              {groupForm.name || compForm.name || 'Adjustment'}
            </h2>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  resetComponentForm(selectedGroupId, groupForm.name);
                  setIsFormulaOpen(true);
                }}
                className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Component
              </Button>

              <button
                type="button"
                onClick={fetchData}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
                title="Refresh components"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-header Row: Checkbox (Left), Audit Log (Right) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <input
                type="checkbox"
                checked={true}
                readOnly
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary"
              />
              <span>{selectedComponentId ? 'Update Component Information' : 'Add Component Information'}</span>
            </div>

            <button
              type="button"
              onClick={() => showToast.info('Audit Log', 'Viewing component audit logs')}
              className="flex items-center gap-1 px-2.5 py-1 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold rounded-md border border-border transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5" /> Audit Log
            </button>
          </div>

          {/* 1. Formula Setting Accordion (Collapsible bar) */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
            <button
              type="button"
              onClick={() => setIsFormulaOpen(!isFormulaOpen)}
              className="w-full p-3 text-left font-bold text-xs text-foreground bg-muted/30 hover:bg-muted/50 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5 text-primary">
                <span className="font-mono font-bold text-sm">£</span>
                <span className="font-semibold text-xs">Formula Setting</span>
              </div>
              {isFormulaOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isFormulaOpen && (
              <div className="p-4 space-y-4 border-t border-border/60 bg-muted/5 text-xs animate-in fade-in duration-150">
                {/* Component Name * */}
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Component Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={compForm.name}
                    onChange={e => setCompForm({ ...compForm, name: e.target.value })}
                    placeholder="e.g. Adjustment, Conveyance, Basic"
                    className="h-8 text-xs font-semibold bg-background"
                  />
                </div>

                {/* 3 Toggle Boxes: Non-Cashable Item | Based On Attendance | Active */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Non-Cashable Item */}
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Non-Cashable Item
                    </label>
                    <div className="flex border border-border rounded-lg overflow-hidden h-7">
                      <button
                        type="button"
                        onClick={() => setCompForm({ ...compForm, isNonCashable: false })}
                        className={`flex-1 text-[11px] font-bold ${!compForm.isNonCashable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompForm({ ...compForm, isNonCashable: true })}
                        className={`flex-1 text-[11px] font-bold ${compForm.isNonCashable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>

                  {/* Based On Attendance */}
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Based On Attendance
                    </label>
                    <div className="flex border border-border rounded-lg overflow-hidden h-7">
                      <button
                        type="button"
                        onClick={() => setCompForm({ ...compForm, basedOnAttendance: false })}
                        className={`flex-1 text-[11px] font-bold ${!compForm.basedOnAttendance ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompForm({ ...compForm, basedOnAttendance: true })}
                        className={`flex-1 text-[11px] font-bold ${compForm.basedOnAttendance ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Active
                    </label>
                    <div className="flex border border-border rounded-lg overflow-hidden h-7">
                      <button
                        type="button"
                        onClick={() => setCompForm({ ...compForm, isActive: false })}
                        className={`flex-1 text-[11px] font-bold ${!compForm.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompForm({ ...compForm, isActive: true })}
                        className={`flex-1 text-[11px] font-bold ${compForm.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                </div>

                {/* Component Type * (3 Buttons: Value | Derived | Module) */}
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Component Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Value', 'Derived', 'Module'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCompForm({ ...compForm, type: t })}
                        className={`h-8 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          compForm.type === t
                            ? 'bg-[#2b7bb9] text-white border-[#2b7bb9] shadow-2xs'
                            : 'bg-background text-foreground border-border hover:bg-muted/40'
                        }`}
                      >
                        {compForm.type === t && <Check className="w-3.5 h-3.5" />}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* If Value: Amount */}
                {compForm.type === 'Value' && (
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Amount
                    </label>
                    <Input
                      type="number"
                      value={compForm.amount}
                      onChange={e => setCompForm({ ...compForm, amount: Number(e.target.value) })}
                      placeholder="100.00"
                      className="h-8 text-xs font-semibold bg-background"
                    />
                  </div>
                )}

                {/* If Derived: Formula Expression */}
                {compForm.type === 'Derived' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-foreground">
                        Formula Expression <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Use [Component Name] &amp; [CTC] with math operators
                      </span>
                    </div>

                    <textarea
                      rows={2}
                      value={compForm.formula}
                      onChange={e => setCompForm({ ...compForm, formula: e.target.value })}
                      placeholder="e.g. [CTC] * 0.50, [Basic Salary] * 0.40, [CTC] - ([Basic Salary] + [House Rent Allowance (HRA)])"
                      spellCheck={false}
                      autoCorrect="off"
                      autoCapitalize="off"
                      className="w-full border border-input rounded-lg p-2.5 text-xs font-mono bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                    />

                    {/* Live Validation Indicator */}
                    {compForm.formula.trim() && (() => {
                      const validation = validateFormulaSyntax(compForm.formula);
                      return (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                          validation.isValid 
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60' 
                            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                        }`}>
                          <span>{validation.isValid ? '✓' : '⚠️'}</span>
                          <span>{validation.isValid ? 'Valid Formula Syntax' : validation.error}</span>
                        </div>
                      );
                    })()}

                    {/* Interactive Component & CTC Tokens */}
                    <div className="space-y-1 bg-muted/30 p-2 rounded-lg border border-border/50">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Insert Tokens &amp; Operators (with auto single-space):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['[CTC]', '[Gross]', '[Basic Salary]', '[House Rent Allowance (HRA)]', '[Conveyance Allowance]', '[Medical Allowance]'].map(token => (
                          <button
                            key={token}
                            type="button"
                            onClick={() => insertFormulaToken(token)}
                            className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                          >
                            +{token}
                          </button>
                        ))}
                        {['+', '-', '*', '/', '(', ')', 'min(', 'max('].map(op => (
                          <button
                            key={op}
                            type="button"
                            onClick={() => insertFormulaToken(op)}
                            className="px-2 py-0.5 text-[10px] font-mono font-bold bg-muted hover:bg-muted/80 text-foreground rounded border border-border transition-colors cursor-pointer"
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Standard Bracket Templates */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold">Templates:</span>
                      {[
                        '[CTC] * 0.50',
                        '[Basic Salary] * 0.40',
                        'min(1800, [Basic Salary] * 0.12)',
                        '[CTC] - ([Basic Salary] + [House Rent Allowance (HRA)])',
                        '[Gross] * (0.75 / 100)',
                      ].map(template => (
                        <button
                          key={template}
                          type="button"
                          onClick={() => setCompForm(prev => ({ ...prev, formula: template }))}
                          className="px-2 py-0.5 text-[10px] font-mono bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded border border-border/80 transition-colors cursor-pointer"
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* If Module: Payroll Module Selector */}
                {compForm.type === 'Module' && (
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Payroll Module
                    </label>
                    <select
                      value={compForm.moduleSource}
                      onChange={e => setCompForm({ ...compForm, moduleSource: e.target.value })}
                      className="w-full h-8 border border-input bg-background text-foreground rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Choose">Choose</option>
                      <option value="Weekoff-Holiday Double Pay">Weekoff-Holiday Double Pay</option>
                      <option value="Loan EMI">Loan EMI Deduction</option>
                      <option value="Overtime">Overtime Calculation</option>
                      <option value="Reimbursement">Reimbursement Ledger</option>
                      <option value="Annual Bonus">Annual Bonus Scheme</option>
                    </select>
                  </div>
                )}

                {/* Boundary Type (Min/Max) */}
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Boundary Type (Min/ Max)
                  </label>
                  <select
                    value={compForm.boundaryType}
                    onChange={e => setCompForm({ ...compForm, boundaryType: e.target.value })}
                    className="w-full h-8 border border-input bg-background text-foreground rounded-lg px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Choose">Choose</option>
                    <option value="Min">Min</option>
                    <option value="Max">Max</option>
                    <option value="Both">Both (Min & Max)</option>
                  </select>
                </div>

                {(compForm.boundaryType === 'Min' || compForm.boundaryType === 'Both') && (
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Minimum Amount (₹)
                    </label>
                    <Input
                      type="number"
                      value={compForm.minAmount}
                      onChange={e => setCompForm({ ...compForm, minAmount: Number(e.target.value) })}
                      className="h-8 text-xs font-semibold bg-background"
                    />
                  </div>
                )}

                {(compForm.boundaryType === 'Max' || compForm.boundaryType === 'Both') && (
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Maximum Amount (₹)
                    </label>
                    <Input
                      type="number"
                      value={compForm.maxAmount}
                      onChange={e => setCompForm({ ...compForm, maxAmount: Number(e.target.value) })}
                      className="h-8 text-xs font-semibold bg-background"
                    />
                  </div>
                )}

                {/* Date Pickers Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Effective From Date
                    </label>
                    <Input
                      type="date"
                      value={compForm.effectiveFromDate}
                      onChange={e => setCompForm({ ...compForm, effectiveFromDate: e.target.value })}
                      className="h-8 text-xs font-semibold bg-background"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Effective To Date
                    </label>
                    <Input
                      type="date"
                      value={compForm.effectiveToDate}
                      onChange={e => setCompForm({ ...compForm, effectiveToDate: e.target.value })}
                      className="h-8 text-xs font-semibold bg-background"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Condition Setting Accordion (Collapsible bar) */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
            <button
              type="button"
              onClick={() => setIsConditionOpen(!isConditionOpen)}
              className="w-full p-3 text-left font-bold text-xs text-foreground bg-muted/30 hover:bg-muted/50 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5 text-primary">
                <span className="font-mono font-bold text-sm">&gt;</span>
                <span className="font-semibold text-xs">Condition Setting</span>
              </div>
              {isConditionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isConditionOpen && (
              <div className="p-4 space-y-3 border-t border-border/60 bg-muted/5 text-xs animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Condition On
                    </label>
                    <select
                      value={compForm.conditionOn}
                      onChange={e => setCompForm({ ...compForm, conditionOn: e.target.value })}
                      className="w-full h-8 border border-input bg-background text-foreground rounded-lg px-2 text-xs font-semibold"
                    >
                      <option value="Choose">Choose</option>
                      <option value="Gross">Gross Salary</option>
                      <option value="Basic">Basic Salary</option>
                      <option value="CTC">Annual CTC</option>
                      <option value="Attend.">Attendance Days</option>
                      {allComponentNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Operator
                    </label>
                    <select
                      value={compForm.conditionOperator}
                      onChange={e => setCompForm({ ...compForm, conditionOperator: e.target.value })}
                      className="w-full h-8 border border-input bg-background text-foreground rounded-lg px-2 text-xs font-semibold"
                    >
                      <option value="Choose">Choose</option>
                      <option value="Equals">Equals (=)</option>
                      <option value="Greater">Greater Than (&gt;)</option>
                      <option value="GreaterThanEqual">Greater Than Equal (&gt;=)</option>
                      <option value="Less">Less Than (&lt;)</option>
                      <option value="LessThanEqual">Less Than Equal (&lt;=)</option>
                      <option value="Between">Between</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Value 1
                    </label>
                    <Input
                      value={compForm.conditionValue1}
                      onChange={e => setCompForm({ ...compForm, conditionValue1: e.target.value })}
                      placeholder="e.g. 21000"
                      className="h-8 text-xs font-semibold bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Value 2 {compForm.conditionOperator !== 'Between' && '(Optional)'}
                    </label>
                    <Input
                      value={compForm.conditionValue2}
                      onChange={e => setCompForm({ ...compForm, conditionValue2: e.target.value })}
                      placeholder="e.g. 50000"
                      className="h-8 text-xs font-semibold bg-background"
                    />
                  </div>
                </div>

                {/* [+] Months Filter Box (inside Condition Setting matching Hoshi 1:1) */}
                <div className="border border-border/80 rounded-lg overflow-hidden bg-background">
                  <div
                    onClick={() => setIsMonthFilterOpen(!isMonthFilterOpen)}
                    className="p-2.5 bg-muted/30 hover:bg-muted/50 text-foreground font-semibold flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>{isMonthFilterOpen ? '[-] Months' : '[+] Months'}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {compForm.months.length === 0 ? 'All Months' : `${compForm.months.length} selected`}
                    </span>
                  </div>

                  {isMonthFilterOpen && (
                    <div className="p-3 border-t border-border/60 space-y-2 max-h-48 overflow-y-auto">
                      <label className="flex items-center gap-2 font-bold cursor-pointer pb-1.5 border-b border-border/40">
                        <input
                          type="checkbox"
                          checked={compForm.months.length === monthOptions.length && monthOptions.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCompForm({ ...compForm, months: [...monthOptions] });
                            } else {
                              setCompForm({ ...compForm, months: [] });
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-input text-primary accent-primary"
                        />
                        <span>Select All</span>
                      </label>

                      {monthOptions.map(month => {
                        const isChecked = compForm.months.includes(month);
                        return (
                          <label key={month} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setCompForm({ ...compForm, months: compForm.months.filter(x => x !== month) });
                                } else {
                                  setCompForm({ ...compForm, months: [...compForm.months, month] });
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-input text-primary accent-primary"
                            />
                            <span>{month}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Gender Selector (matching Hoshi 1:1) */}
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1.5">
                    Gender
                  </label>
                  <div className="flex items-center gap-2">
                    {(['All', 'Male', 'Female'] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setCompForm({ ...compForm, genderFilter: g })}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          compForm.genderFilter.toLowerCase() === g.toLowerCase()
                            ? 'bg-primary text-primary-foreground shadow-2xs'
                            : 'bg-muted/50 hover:bg-muted text-muted-foreground border border-border/60'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Employment Setting Accordion (Collapsible bar matching Hoshi HRMS 1:1) */}
          <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
            <button
              type="button"
              onClick={() => setIsEmploymentOpen(!isEmploymentOpen)}
              className="w-full p-3 text-left font-bold text-xs text-foreground bg-muted/30 hover:bg-muted/50 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5 text-primary">
                <User className="w-3.5 h-3.5" />
                <span className="font-semibold text-xs">Employment Setting</span>
              </div>
              {isEmploymentOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>

            {isEmploymentOpen && (
              <div className="p-4 space-y-3.5 border-t border-border/60 bg-muted/5 text-xs animate-in fade-in duration-150">
                {/* 1. [+] Grade Filter Box */}
                <div className="border border-border/80 rounded-lg overflow-hidden bg-background">
                  <div
                    onClick={() => setIsGradeFilterOpen(!isGradeFilterOpen)}
                    className="p-2.5 bg-muted/30 hover:bg-muted/50 text-foreground font-semibold flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>{isGradeFilterOpen ? '[-] Grade' : '[+] Grade'}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {compForm.grades.length === 0 ? 'All Grades' : `${compForm.grades.length} selected`}
                    </span>
                  </div>

                  {isGradeFilterOpen && (
                    <div className="p-3 border-t border-border/60 space-y-2 max-h-48 overflow-y-auto">
                      <label className="flex items-center gap-2 font-bold cursor-pointer pb-1.5 border-b border-border/40">
                        <input
                          type="checkbox"
                          checked={compForm.grades.length === gradeOptions.length && gradeOptions.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCompForm({ ...compForm, grades: [...gradeOptions] });
                            } else {
                              setCompForm({ ...compForm, grades: [] });
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-input text-primary accent-primary"
                        />
                        <span>Select All</span>
                      </label>

                      {gradeOptions.map(grade => {
                        const isChecked = compForm.grades.includes(grade);
                        return (
                          <label key={grade} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setCompForm({ ...compForm, grades: compForm.grades.filter(x => x !== grade) });
                                } else {
                                  setCompForm({ ...compForm, grades: [...compForm.grades, grade] });
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-input text-primary accent-primary"
                            />
                            <span>{grade}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. [+] Department Filter Box */}
                <div className="border border-border/80 rounded-lg overflow-hidden bg-background">
                  <div
                    onClick={() => setIsDeptFilterOpen(!isDeptFilterOpen)}
                    className="p-2.5 bg-muted/30 hover:bg-muted/50 text-foreground font-semibold flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>{isDeptFilterOpen ? '[-] Department' : '[+] Department'}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {compForm.departments.length === 0 ? 'All Departments' : `${compForm.departments.length} selected`}
                    </span>
                  </div>

                  {isDeptFilterOpen && (
                    <div className="p-3 border-t border-border/60 space-y-2 max-h-48 overflow-y-auto">
                      <label className="flex items-center gap-2 font-bold cursor-pointer pb-1.5 border-b border-border/40">
                        <input
                          type="checkbox"
                          checked={compForm.departments.length === deptOptions.length && deptOptions.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCompForm({ ...compForm, departments: [...deptOptions] });
                            } else {
                              setCompForm({ ...compForm, departments: [] });
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-input text-primary accent-primary"
                        />
                        <span>Select All</span>
                      </label>

                      {deptOptions.map(dept => {
                        const isChecked = compForm.departments.includes(dept);
                        return (
                          <label key={dept} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setCompForm({ ...compForm, departments: compForm.departments.filter(x => x !== dept) });
                                } else {
                                  setCompForm({ ...compForm, departments: [...compForm.departments, dept] });
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-input text-primary accent-primary"
                            />
                            <span>{dept}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. [+] Location Filter Box */}
                <div className="border border-border/80 rounded-lg overflow-hidden bg-background">
                  <div
                    onClick={() => setIsLocationFilterOpen(!isLocationFilterOpen)}
                    className="p-2.5 bg-muted/30 hover:bg-muted/50 text-foreground font-semibold flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>{isLocationFilterOpen ? '[-] Location' : '[+] Location'}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {compForm.locations.length === 0 ? 'All Locations' : `${compForm.locations.length} selected`}
                    </span>
                  </div>

                  {isLocationFilterOpen && (
                    <div className="p-3 border-t border-border/60 space-y-2 max-h-48 overflow-y-auto">
                      <label className="flex items-center gap-2 font-bold cursor-pointer pb-1.5 border-b border-border/40">
                        <input
                          type="checkbox"
                          checked={compForm.locations.length === locationOptions.length && locationOptions.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCompForm({ ...compForm, locations: [...locationOptions] });
                            } else {
                              setCompForm({ ...compForm, locations: [] });
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-input text-primary accent-primary"
                        />
                        <span>Select All</span>
                      </label>

                      {locationOptions.map(loc => {
                        const isChecked = compForm.locations.includes(loc);
                        return (
                          <label key={loc} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setCompForm({ ...compForm, locations: compForm.locations.filter(x => x !== loc) });
                                } else {
                                  setCompForm({ ...compForm, locations: [...compForm.locations, loc] });
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-input text-primary accent-primary"
                            />
                            <span>{loc}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. [+] Employee Filter Box */}
                <div className="border border-border/80 rounded-lg overflow-hidden bg-background">
                  <div
                    onClick={() => setIsEmployeeFilterOpen(!isEmployeeFilterOpen)}
                    className="p-2.5 bg-muted/30 hover:bg-muted/50 text-foreground font-semibold flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>{isEmployeeFilterOpen ? '[-] Employee' : '[+] Employee'}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {compForm.employees.length === 0 ? 'All Employees' : `${compForm.employees.length} selected`}
                    </span>
                  </div>

                  {isEmployeeFilterOpen && (
                    <div className="p-3 border-t border-border/60 space-y-2 max-h-48 overflow-y-auto">
                      <label className="flex items-center gap-2 font-bold cursor-pointer pb-1.5 border-b border-border/40">
                        <input
                          type="checkbox"
                          checked={compForm.employees.length === employeeOptions.length && employeeOptions.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCompForm({ ...compForm, employees: [...employeeOptions] });
                            } else {
                              setCompForm({ ...compForm, employees: [] });
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-input text-primary accent-primary"
                        />
                        <span>Select All</span>
                      </label>

                      {employeeOptions.map(emp => {
                        const isChecked = compForm.employees.includes(emp);
                        return (
                          <label key={emp} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setCompForm({ ...compForm, employees: compForm.employees.filter(x => x !== emp) });
                                } else {
                                  setCompForm({ ...compForm, employees: [...compForm.employees, emp] });
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-input text-primary accent-primary"
                            />
                            <span>{emp}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Buttons: Update (Left) & Cancel (Right) */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              onClick={handleSaveComponent}
              disabled={savingComp}
              className="h-9 px-6 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {selectedComponentId ? 'Update' : 'Save'}
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelComponentForm}
              className="h-9 px-6 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
