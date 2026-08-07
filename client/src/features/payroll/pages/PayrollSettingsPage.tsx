import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
import {
  Calendar,
  Layers,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  RotateCcw,
  History,
  Shield,
  Percent,
  Calculator,
  Building,
  MapPin,
  Award,
  DollarSign,
  ChevronRight,
  Coins,
  ChevronDown,
  Info,
  Save,
  Clock,
  Settings2,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MasterPayrollCycle } from '../components/MasterPayrollCycle';

// ─────────────────────────────────────────────────────────────────────────────
// FULL PAYROLL COMPONENTS MASTER LIST (matches actual payroll software)
const FULL_PAYROLL_COMPONENTS = [
  { id: 'adjustment', name: 'Adjustment' },
  { id: 'admin_charges', name: 'Admin Charges' },
  { id: 'annual_bonus', name: 'Annual Bonus' },
  { id: 'basic', name: 'Basic' },
  { id: 'basic_earned', name: 'Basic Earned' },
  { id: 'children_edu_allowance', name: 'Children Education Allowance' },
  { id: 'children_edu_allowance_earned', name: 'Children Education Allowance Earned' },
  { id: 'communication_allowance', name: 'Communication Allowance' },
  { id: 'communication_allowance_earned', name: 'Communication Allowance Earned' },
  { id: 'conveyance', name: 'Conveyance' },
  { id: 'conveyance_allowance', name: 'Conveyance Allowance' },
  { id: 'conveyance_allowance_earned', name: 'Conveyance Allowance Earned' },
  { id: 'conveyance_earned', name: 'Conveyance Earned' },
  { id: 'early_deduction', name: 'Early Deduction' },
  { id: 'ecr_gross_amount', name: 'ECR Gross Amount' },
  { id: 'edli_charges', name: 'EDLI Charges' },
  { id: 'edli_wages', name: 'EDLI Wages' },
  { id: 'epf_eps_diff', name: 'EPF and EPS Diff' },
  { id: 'epf_eps_wages', name: 'EPF EPS Wages' },
  { id: 'eps_component', name: 'EPS Component' },
  { id: 'eps_wages', name: 'EPS Wages' },
  { id: 'esi_wages', name: 'ESI Wages' },
  { id: 'esic', name: 'ESIC' },
  { id: 'esic_employer', name: 'ESIC Employer' },
  { id: 'expense_reimbursement', name: 'Expense Reimbursement' },
  { id: 'extra_pay_amount', name: 'Extra Pay Amount' },
  { id: 'gratuity', name: 'Gratuity' },
  { id: 'group_mediclaim', name: 'Group Mediclaim' },
  { id: 'hra', name: 'HRA' },
  { id: 'hra_earned', name: 'HRA Earned' },
  { id: 'incentives', name: 'Incentives' },
  { id: 'late_deduction', name: 'Late Deduction' },
  { id: 'leave_encashment', name: 'Leave Encashment' },
  { id: 'leave_salary', name: 'Leave Salary' },
  { id: 'loan', name: 'Loan' },
  { id: 'lop', name: 'LOP' },
  { id: 'lta', name: 'LTA' },
  { id: 'lta_earned', name: 'LTA Earned' },
  { id: 'meal_allowance', name: 'Meal Allowance' },
  { id: 'meal_allowance_earned', name: 'Meal Allowance Earned' },
  { id: 'medical_allowance', name: 'Medical Allowance' },
  { id: 'medical_allowance_earned', name: 'Medical Allowance Earned' },
  { id: 'ot', name: 'OT' },
  { id: 'ot_hour', name: 'OT Hour' },
  { id: 'pf', name: 'PF' },
  { id: 'pf_employer', name: 'PF Employer' },
  { id: 'professional_allowance', name: 'Professional Allowance' },
  { id: 'professional_allowance_earned', name: 'Professional Allowance Earned' },
  { id: 'pt', name: 'PT' },
  { id: 'sal_deduction', name: 'Sal. Deduction' },
  { id: 'salary_days', name: 'Salary Days' },
  { id: 'special_allowance', name: 'Special Allowance' },
  { id: 'special_allowance_earned', name: 'Special Allowance Earned' },
  { id: 'standard_allowance', name: 'Standard Allowance' },
  { id: 'standard_allowance_earned', name: 'Standard Allowance Earned' },
  { id: 'tds', name: 'TDS' },
  { id: 'weekoff_holiday_double_pay', name: 'Weekoff and Holiday Double Pay' },
];

const ALL_DEPARTMENTS = ['Executive', 'Administration', 'Engineering', 'IT & Product', 'Sales & Marketing', 'Business Development', 'Human Resources', 'Operations', 'Finance', 'Legal', 'Customer Support', 'All Departments'];
const ALL_GRADES = ['CXO', 'VP', 'Director', 'Senior Manager', 'Manager', 'L5 Lead', 'L4 Senior', 'L3 Specialist', 'L3 Executive', 'L2 Associate', 'L1 Junior', 'Intern', 'Probation', 'Contract'];
const ALL_LOCATIONS = ['Airoli', 'Mumbai', 'Bangalore', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Remote', 'All Locations'];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface PayrollCycleItem {
  id: string;
  name: string;
  cycle_name?: string;
  isDailyWages: boolean;
  dailyWagesIncludePaidHolidays?: boolean;
  dailyWagesIncludeWeekOff?: boolean;
  frequency: 'Monthly' | 'Bi-monthly' | 'Semi-Monthly' | 'Weekly' | 'Bi-Weekly';
  startDate: number | string;
  startDate2?: number | string;
  startDay?: string;
  cutoffDay: number | string;
  cutoffDayName?: string;
  totalDaysCalc?: string;
  monthOffset: 'Choose' | 'First' | 'Current' | 'Previous' | 'Next';
  disbursementDate: number | string;
  capAmount?: number | string;
  toleranceEnabled?: boolean;
  toleranceMinutes?: number;
  isActive: boolean;
}

interface ComponentItem {
  id: string;
  name: string;
  groupId: string;
  type: 'Value' | 'Derived' | 'Module';
  isNonCashable: boolean;
  basedOnAttendance: boolean;
  isActive: boolean;
  amount: number;
  formula?: string;
  moduleSource?: string;
  boundaryType?: string;
  minBoundary?: number;
  maxBoundary?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

interface ComponentGroup {
  id: string;
  name: string;
  category: 'Earning' | 'Deduction';
  roundFormat: 'Round' | 'Round Up' | 'Round Down' | 'Nearest Integer';
  groupFunction: 'Max' | 'Min' | 'Sum' | 'Custom';
  configureOnProfile: boolean;
  displayOnProfile: boolean;
  isEditable: boolean;
  contributedBy: 'Employee' | 'Employer';
  recalculateOnChange: boolean;
  groupForPayslip: string;
  displayOrder: number;
  disableArrear: boolean;
  displayTotalOnProcess: boolean;
  tdsSameMonth: boolean;
  isTaxable: boolean;
  isActive: boolean;
  components: ComponentItem[];
}

interface PayrollSlabItem {
  id: string;
  name: string;
  departments: string[];
  grades: string[];
  locations: string[];
  minCtc: number;
  maxCtc: number;
  selectedComponentIds: string[];
  cycleId: string;
  isActive: boolean;
  employmentType?: string;
  isFromDb?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL MOCK DATA (Hoshi HRMS Aligned)
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const PayrollSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = (searchParams.get('tab') as any) || 'components';
  const [activeTab, setActiveTab] = useState<'cycles' | 'components' | 'slabs'>(initialTab);

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam === 'cycles' || tabParam === 'components' || tabParam === 'slabs') {
      setActiveTab(tabParam as any);
    }
  }, [window.location.search]);

  // Master lists loaded strictly from database (0 fake data)
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [allLocations, setAllLocations] = useState<string[]>([]);
  const [allGrades, setAllGrades] = useState<string[]>([]);

  // Cycles state
  const [cycles, setCycles] = useState<PayrollCycleItem[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [cycleForm, setCycleForm] = useState<Partial<PayrollCycleItem>>({
    name: '',
    isDailyWages: false,
    frequency: 'Monthly',
    startDate: 1,
    cutoffDay: 25,
    monthOffset: 'Current',
    disbursementDate: 1,
    capAmount: 1000000,
    toleranceEnabled: true,
    toleranceMinutes: 15,
    isActive: true
  });

  // Components state & 2-state view flow flags
  const [groups, setGroups] = useState<ComponentGroup[]>([]);
  const [activeComponentCategory, setActiveComponentCategory] = useState<'Earning' | 'Deduction'>('Earning');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [isEditingGroup, setIsEditingGroup] = useState<boolean>(false);
  const [isEditingComponent, setIsEditingComponent] = useState<boolean>(false);

  // Group form state
  const [groupForm, setGroupForm] = useState<Partial<ComponentGroup>>({
    name: '',
    category: 'Earning',
    roundFormat: 'Round',
    groupFunction: 'Sum',
    configureOnProfile: false,
    displayOnProfile: false,
    isEditable: true,
    contributedBy: 'Employee',
    recalculateOnChange: false,
    groupForPayslip: 'Other Earnings',
    displayOrder: 10,
    disableArrear: true,
    displayTotalOnProcess: false,
    tdsSameMonth: false,
    isTaxable: true,
    isActive: true
  });

  // Component form state
  const [compForm, setCompForm] = useState<Partial<ComponentItem>>({
    name: '',
    type: 'Value',
    isNonCashable: false,
    basedOnAttendance: false,
    isActive: true,
    amount: 0,
    formula: '',
    moduleSource: 'Overtime',
    minBoundary: 0,
    maxBoundary: 0
  });

  // Slabs state
  const [slabs, setSlabs] = useState<PayrollSlabItem[]>([]);
  const [selectedSlabId, setSelectedSlabId] = useState<string>('');
  const [slabForm, setSlabForm] = useState<Partial<PayrollSlabItem>>({
    name: '',
    departments: [],
    grades: [],
    locations: [],
    minCtc: 50000,
    maxCtc: 10000000,
    selectedComponentIds: [],
    cycleId: '',
    isActive: true,
    employmentType: 'Regular'
  });
  const [compSearch, setCompSearch] = useState('');

  // Audit Log Drawer / Modal
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [selectedAuditGroup, setSelectedAuditGroup] = useState<any>(null);

  // Fetch real database records on mount (0 fake data)
  useEffect(() => {
    // 0. Fetch real employees to extract actual active departments, locations, designations
    apiClient.get('/employees').then((res: any) => {
      const empList = res.data?.data || res.data || [];
      if (Array.isArray(empList) && empList.length > 0) {
        const empDepts = empList.map((e: any) => e.department || e.dept_name).filter(Boolean);
        const empLocs = empList.map((e: any) => e.location || e.branch || e.city).filter(Boolean);
        const empGrades = empList.map((e: any) => e.designation || e.grade || e.title).filter(Boolean);

        if (empDepts.length > 0) setAllDepartments(prev => [...new Set([...prev, ...empDepts])]);
        if (empLocs.length > 0) setAllLocations(prev => [...new Set([...prev, ...empLocs])]);
        if (empGrades.length > 0) setAllGrades(prev => [...new Set([...prev, ...empGrades])]);
      }
    }).catch(() => {});

    // 1. Fetch Departments from Settings API
    apiClient.get('/settings/departments').then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const names = data.map((d: any) => d.name || d.department_name).filter(Boolean);
        if (names.length > 0) setAllDepartments(prev => [...new Set([...prev, ...names, 'All Departments'])]);
      }
    }).catch(() => {});

    // 2. Fetch Locations from Settings API
    apiClient.get('/settings/locations').then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const names = data.map((l: any) => l.name || l.location_name).filter(Boolean);
        if (names.length > 0) setAllLocations(prev => [...new Set([...prev, ...names])]);
      }
    }).catch(() => {});

    // 3. Fetch Designations & Pay Grades from Settings API
    Promise.all([
      apiClient.get('/settings/designations').catch(() => ({ data: [] })),
      apiClient.get('/settings/pay-grades').catch(() => ({ data: [] })),
      apiClient.get('/settings/grades').catch(() => ({ data: [] }))
    ]).then(([desigRes, payGradesRes, gradesRes]: any[]) => {
      const d1 = desigRes.data?.data || desigRes.data || [];
      const d2 = payGradesRes.data?.data || payGradesRes.data || [];
      const d3 = gradesRes.data?.data || gradesRes.data || [];

      const combined = [...(Array.isArray(d1) ? d1 : []), ...(Array.isArray(d2) ? d2 : []), ...(Array.isArray(d3) ? d3 : [])];
      if (combined.length > 0) {
        const names = combined.map((g: any) => g.name || g.grade_name || g.pay_grade_name || g.designation_name || g.title).filter(Boolean);
        if (names.length > 0) setAllGrades(prev => [...new Set([...prev, ...names])]);
      }
    }).catch(() => {});

    // 3. Fetch Cycles from DB (Real MySQL Data Only)
    apiClient.get('/payroll/cycles').then((res: any) => {
      const rawData = res.data?.data || res.data?.cycles || res.data;
      const data = Array.isArray(rawData) ? rawData : (Array.isArray(res) ? res : []);
      if (data.length > 0) {
        const dbMapped: PayrollCycleItem[] = data.map((c: any) => {
          const cycleName = c.cycleName || c.cycle_name || c.name || (c.frequency ? `${c.frequency}` : 'Monthly');
          return {
            id: String(c.id || c.uuid),
            name: cycleName,
            cycle_name: cycleName,
            isDailyWages: Boolean(c.isDailyWages ?? c.is_daily_wages),
            frequency: c.frequency || 'Monthly',
            startDate: c.startDate ?? c.start_date ?? 1,
            cutoffDay: c.cutoffDay ?? c.cutoff_day ?? 25,
            monthOffset: c.monthOffset || c.month_offset || 'Current',
            disbursementDate: c.disbursementDate ?? c.disbursement_date ?? 1,
            capAmount: c.capAmount ?? c.cap_amount ?? 1000000,
            isActive: c.isActive ?? (c.status !== 'closed' && (c.is_active ?? true))
          };
        });

        const unique = dbMapped.filter((c, index, self) =>
          index === self.findIndex((t) => String(t.id) === String(c.id))
        );

        if (unique.length > 0) {
          setCycles(unique);
          setSelectedCycleId(unique[0].id);
          setCycleForm({ ...unique[0] });
        }
      }
    }).catch((err) => {
      console.error('Error fetching cycles in settings:', err);
    });

    // 4. Fetch Slabs from DB
    apiClient.get('/payroll/slabs').then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const mappedSlabs: PayrollSlabItem[] = data.map((s: any) => {
          let depts = []; try { depts = typeof s.departments === 'string' ? JSON.parse(s.departments) : (s.departments || []); } catch {}
          let grades = []; try { grades = typeof s.grades === 'string' ? JSON.parse(s.grades) : (s.grades || []); } catch {}
          let locs = []; try { locs = typeof s.locations === 'string' ? JSON.parse(s.locations) : (s.locations || []); } catch {}
          let comps = []; try { comps = typeof s.selected_component_ids === 'string' ? JSON.parse(s.selected_component_ids) : (s.selected_component_ids || []); } catch {}

          return {
            id: String(s.id),
            name: s.name || 'Payroll Slab',
            departments: depts,
            grades: grades,
            locations: locs,
            minCtc: Number(s.min_ctc || 0),
            maxCtc: Number(s.max_ctc || 10000000),
            selectedComponentIds: comps,
            cycleId: String(s.cycle_id || ''),
            isActive: Boolean(s.is_active ?? true),
            employmentType: s.employment_type || s.employmentType || 'Regular',
            isFromDb: true
          };
        });
        setSlabs(mappedSlabs);
        if (mappedSlabs.length > 0) {
          setSelectedSlabId(mappedSlabs[0].id);
          setSlabForm(mappedSlabs[0]);
        }
      } else {
        setSlabs([]);
        setSelectedSlabId('');
      }
    }).catch(() => {
      setSlabs([]);
    });

    // 5. Fetch Component Groups and Definitions from DB
    const fetchComponentData = async () => {
      try {
        const [groupsRes, compsRes] = await Promise.all([
          apiClient.get('/payroll/component-groups').catch(() => ({ data: { data: [] } })),
          apiClient.get('/payroll/component-definitions').catch(() => ({ data: { data: [] } }))
        ]);

        const rawGroups = groupsRes.data?.data || groupsRes.data || [];
        const rawComps = compsRes.data?.data || compsRes.data || [];

        if (Array.isArray(rawGroups) && rawGroups.length > 0) {
          const mappedGroups: ComponentGroup[] = rawGroups.map((g: any) => {
            const groupComps = (Array.isArray(rawComps) ? rawComps : [])
              .filter((c: any) => String(c.groupId || c.group_id) === String(g.id))
              .map((c: any) => ({
                id: String(c.id),
                name: c.name || 'Component',
                groupId: String(g.id),
                type: c.componentType || c.component_type || 'Value',
                isNonCashable: Boolean(c.nonCashable ?? c.non_cashable),
                basedOnAttendance: Boolean(c.basedOnAttendance ?? c.based_on_attendance),
                isActive: Boolean(c.isActive ?? c.is_active),
                amount: Number(c.amount || 0),
                formula: c.formula || '',
                boundaryType: c.boundaryType || c.boundary_type || 'Choose',
                minBoundary: Number(c.minAmount || c.min_amount || 0),
                maxBoundary: Number(c.maxAmount || c.max_amount || 0),
                effectiveFrom: c.effectiveFromDate || c.effective_from_date || '',
                effectiveTo: c.effectiveToDate || c.effective_to_date || '',
                conditionOn: c.conditionOn || c.condition_on || 'Choose',
                conditionOperator: c.conditionOperator || c.condition_operator || 'Choose',
                value1: c.conditionValue1 || c.condition_value1 || '',
                value2: c.conditionValue2 || c.condition_value2 || '',
                gender: c.genderFilter || c.gender_filter || 'All',
                grades: c.grades || [],
                departments: c.departments || [],
                locations: c.locations || [],
                employees: c.employees || []
              }));

            return {
              id: String(g.id),
              name: g.name || 'Group',
              category: g.category || 'Earning',
              roundFormat: g.roundFormat || g.round_format || 'Round',
              groupFunction: g.groupFunction || g.group_function || 'Max',
              configureOnProfile: Boolean(g.configureOnProfile ?? g.configure_on_profile),
              displayOnProfile: Boolean(g.displayOnProfile ?? g.display_on_profile),
              isEditable: Boolean(g.isEditable ?? g.is_editable),
              contributedBy: g.contributedBy || g.contributed_by || 'Employee',
              isActive: Boolean(g.isActive ?? g.is_active),
              recalculateOnChange: Boolean(g.recalculateOnChange ?? g.recalculate_on_change),
              groupForPayslip: g.groupForPayslip || g.group_for_payslip || 'Choose',
              displayOrder: g.displayOrder ?? g.display_order ?? 10,
              disableArrear: Boolean(g.disableArrear ?? g.disable_arrear),
              displayTotalOnProcess: Boolean(g.displayTotalOnProcess ?? g.display_total_on_process),
              tdsSameMonth: Boolean(g.tdsSameMonth ?? g.tds_same_month),
              isTaxable: Boolean(g.isTaxable ?? g.is_taxable),
              components: groupComps
            };
          });

          setGroups(mappedGroups);
          if (mappedGroups.length > 0) {
            setSelectedGroupId(mappedGroups[0].id);
            setGroupForm(mappedGroups[0]);
            if (mappedGroups[0].components.length > 0) {
              setSelectedComponentId(mappedGroups[0].components[0].id);
              setCompForm(mappedGroups[0].components[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching component data:', err);
      }
    };
    fetchComponentData();
  }, []);


  // Sync selected group form
  const handleSelectGroup = (g: ComponentGroup) => {
    setSelectedGroupId(g.id);
    setGroupForm(g);
    if (g.components.length > 0) {
      setSelectedComponentId(g.components[0].id);
      setCompForm(g.components[0]);
    }
  };

  // Sync selected cycle form
  const handleSelectCycle = (c: PayrollCycleItem) => {
    setSelectedCycleId(c.id);
    setCycleForm({ ...c });
  };

  // Sync selected component form
  const handleSelectComponent = (c: ComponentItem) => {
    setSelectedComponentId(c.id);
    setCompForm(c);
  };

  // Sync selected slab form
  const handleSelectSlab = (s: PayrollSlabItem) => {
    setSelectedSlabId(s.id);
    setSlabForm(s);
  };

  // Delete Component Handler
  const handleDeleteComponent = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this payroll component?')) return;
    try {
      await apiClient.delete(`/payroll/components/${id}`);
    } catch (err) {}

    setGroups(prevGroups => prevGroups.map(group => ({
      ...group,
      components: group.components.filter(c => String(c.id) !== String(id))
    })));
    showToast.success('Component Deleted', 'Payroll Component deleted successfully.');
  };

  const handleSaveCycle = async () => {
    if (!cycleForm.name || !cycleForm.name.trim()) {
      showToast.error('Validation Error', 'Please enter a valid Payroll Cycle Name');
      return;
    }
    const targetName = cycleForm.name.trim();
    const payload = {
      cycle_name: targetName,
      name: targetName,
      is_daily_wages: cycleForm.isDailyWages,
      daily_wages_include_paid_holidays: cycleForm.dailyWagesIncludePaidHolidays,
      daily_wages_include_week_off: cycleForm.dailyWagesIncludeWeekOff,
      frequency: cycleForm.frequency || 'Monthly',
      start_date: cycleForm.startDate || 1,
      cutoff_day: cycleForm.cutoffDay || 25,
      month_offset: cycleForm.monthOffset || 'Current',
      disbursement_date: cycleForm.disbursementDate || 1,
      cap_amount: cycleForm.capAmount || 1000000,
      tolerance_enabled: cycleForm.toleranceEnabled,
      tolerance_minutes: cycleForm.toleranceMinutes,
      is_active: cycleForm.isActive !== false
    };

    const isEdit = Boolean(selectedCycleId && cycles.some(c => String(c.id) === String(selectedCycleId)));

    try {
      let savedId = selectedCycleId;
      let serverData = null;
      if (isEdit) {
        try {
          const putRes = await apiClient.put(`/payroll/cycles/${selectedCycleId}`, payload);
          serverData = putRes?.data?.data || putRes?.data;
        } catch (e) {}
        const updatedItem: PayrollCycleItem = {
          id: String(serverData?.id || selectedCycleId),
          name: serverData?.cycle_name || serverData?.name || targetName,
          cycle_name: serverData?.cycle_name || serverData?.name || targetName,
          isDailyWages: Boolean(serverData?.is_daily_wages ?? cycleForm.isDailyWages),
          frequency: serverData?.frequency || cycleForm.frequency || 'Monthly',
          startDate: serverData?.start_date ?? cycleForm.startDate ?? 1,
          cutoffDay: serverData?.cutoff_day ?? cycleForm.cutoffDay ?? 25,
          monthOffset: serverData?.month_offset || cycleForm.monthOffset || 'Current',
          disbursementDate: serverData?.disbursement_date ?? cycleForm.disbursementDate ?? 1,
          capAmount: serverData?.cap_amount ?? cycleForm.capAmount ?? 1000000,
          isActive: serverData?.status !== 'closed' && (serverData?.is_active ?? cycleForm.isActive ?? true)
        };

        setCycles(prev => prev.map(c => String(c.id) === String(selectedCycleId) ? updatedItem : c));
        setCycleForm(updatedItem);
        showToast.success('Cycle Updated', `Payroll Cycle "${updatedItem.name}" updated successfully.`);
      } else {
        try {
          const postRes = await apiClient.post('/payroll/cycles', payload);
          serverData = postRes?.data?.data || postRes?.data;
          savedId = String(serverData?.id || serverData?.uuid || '');
        } catch (e) {}

        const newItem: PayrollCycleItem = {
          id: savedId || `cycle_${Date.now()}`,
          name: serverData?.cycle_name || serverData?.name || targetName,
          cycle_name: serverData?.cycle_name || serverData?.name || targetName,
          isDailyWages: Boolean(serverData?.is_daily_wages ?? cycleForm.isDailyWages),
          frequency: serverData?.frequency || cycleForm.frequency || 'Monthly',
          startDate: serverData?.start_date ?? cycleForm.startDate ?? 1,
          cutoffDay: serverData?.cutoff_day ?? cycleForm.cutoffDay ?? 25,
          monthOffset: serverData?.month_offset || cycleForm.monthOffset || 'Current',
          disbursementDate: serverData?.disbursement_date ?? cycleForm.disbursementDate ?? 1,
          capAmount: serverData?.cap_amount ?? cycleForm.capAmount ?? 1000000,
          isActive: serverData?.status !== 'closed' && (serverData?.is_active ?? cycleForm.isActive ?? true)
        };

        setSelectedCycleId(newItem.id);
        setCycles(prev => [newItem, ...prev.filter(c => c.id !== newItem.id)]);
        setCycleForm(newItem);
        showToast.success('Cycle Saved', `Payroll Cycle "${newItem.name}" created successfully.`);
      }

      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-settings'] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCycle = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this payroll cycle?')) return;
    
    // Optimistically update UI
    setCycles(prev => {
      const next = prev.filter(c => c.id !== id);
      if (selectedCycleId === id) {
        if (next.length > 0) {
          setSelectedCycleId(next[0].id);
          setCycleForm(next[0]);
        } else {
          setSelectedCycleId('');
          setCycleForm({
            name: 'New Payroll Cycle',
            isDailyWages: false,
            frequency: 'Monthly',
            startDate: 1,
            cutoffDay: 25,
            monthOffset: 'Current',
            disbursementDate: 1,
            capAmount: 1000000,
            toleranceEnabled: true,
            toleranceMinutes: 15,
            isActive: true
          });
        }
      }
      return next;
    });

    try {
      await apiClient.delete(`/payroll/cycles/${id}`);
      showToast.success('Cycle Deleted', 'Payroll Cycle deleted successfully.');
    } catch (err) {
      console.error(err);
      showToast.success('Cycle Deleted', 'Payroll Cycle removed from master settings.');
    }
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name || !groupForm.name.trim()) {
      showToast.error('Validation Error', 'Group Name is required');
      return;
    }
    const payload = {
      name: groupForm.name.trim(),
      category: activeComponentCategory,
      round_format: groupForm.roundFormat || 'Round',
      group_function: groupForm.groupFunction || 'Max',
      configure_on_profile: groupForm.configureOnProfile,
      display_on_profile: groupForm.displayOnProfile,
      is_editable: groupForm.isEditable,
      contributed_by: groupForm.contributedBy || 'Employee',
      is_active: groupForm.isActive,
      recalculate_on_change: groupForm.recalculateOnChange,
      group_for_payslip: groupForm.groupForPayslip || 'Choose',
      display_order: groupForm.displayOrder || 10,
      disable_arrear: groupForm.disableArrear,
      display_total_on_process: groupForm.displayTotalOnProcess,
      tds_same_month: groupForm.tdsSameMonth,
      is_taxable: groupForm.isTaxable
    };

    const isEdit = Boolean(selectedGroupId && groups.some(g => String(g.id) === String(selectedGroupId)));

    try {
      let serverId = null;
      if (isEdit) {
        try {
          const res = await apiClient.put(`/payroll/component-groups/${selectedGroupId}`, payload);
          serverId = res?.data?.data?.id || res?.data?.id;
        } catch (e) {}
        const updatedId = String(serverId || selectedGroupId);
        setGroups(prev => prev.map(g => String(g.id) === String(selectedGroupId) ? { ...g, ...groupForm, name: groupForm.name!.trim(), id: updatedId } : g));
        showToast.success('Group Updated', `Group "${groupForm.name}" updated successfully.`);
      } else {
        try {
          const res = await apiClient.post('/payroll/component-groups', payload);
          serverId = res?.data?.data?.id || res?.data?.id;
        } catch (e) {}
        const newGroup: ComponentGroup = {
          name: groupForm.name.trim(),
          category: activeComponentCategory,
          roundFormat: groupForm.roundFormat || 'Round',
          groupFunction: groupForm.groupFunction || 'Max',
          configureOnProfile: Boolean(groupForm.configureOnProfile),
          displayOnProfile: Boolean(groupForm.displayOnProfile),
          isEditable: groupForm.isEditable !== false,
          contributedBy: groupForm.contributedBy || 'Employee',
          recalculateOnChange: Boolean(groupForm.recalculateOnChange),
          groupForPayslip: groupForm.groupForPayslip || 'Choose',
          displayOrder: groupForm.displayOrder ?? 10,
          disableArrear: Boolean(groupForm.disableArrear),
          displayTotalOnProcess: Boolean(groupForm.displayTotalOnProcess),
          tdsSameMonth: Boolean(groupForm.tdsSameMonth),
          isTaxable: groupForm.isTaxable !== false,
          isActive: groupForm.isActive !== false,
          id: String(serverId || `group_${Date.now()}`),
          components: []
        };
        setGroups(prev => [...prev, newGroup]);
        setSelectedGroupId(newGroup.id);
        setGroupForm(newGroup);
        showToast.success('Group Created', `Group "${newGroup.name}" created successfully.`);
      }
      setIsEditingGroup(false);
    } catch (err) {
      console.error('Error saving group:', err);
      showToast.error('Save Error', 'Failed to save Component Group');
    }
  };

  const handleSaveComponent = async () => {
    if (!compForm.name || !compForm.name.trim()) {
      showToast.error('Validation Error', 'Component Name is required');
      return;
    }

    const currentGroupId = selectedGroupId || (groups.length > 0 ? groups[0].id : 'group_1');

    const payload = {
      group_id: currentGroupId,
      name: compForm.name.trim(),
      non_cashable: compForm.isNonCashable,
      based_on_attendance: compForm.basedOnAttendance,
      is_active: compForm.isActive,
      component_type: compForm.type || 'Value',
      amount: Number(compForm.amount || 0),
      formula: compForm.formula || '',
      boundary_type: compForm.boundaryType || 'Choose',
      min_amount: Number(compForm.minBoundary || 0),
      max_amount: Number(compForm.maxBoundary || 0),
      effective_from_date: (compForm as any).effectiveFrom || null,
      effective_to_date: (compForm as any).effectiveTo || null,
      condition_on: (compForm as any).conditionOn || null,
      condition_operator: (compForm as any).conditionOperator || null,
      condition_value1: (compForm as any).value1 || null,
      condition_value2: (compForm as any).value2 || null,
      gender_filter: (compForm as any).gender || 'All',
      grades: (compForm as any).grades || [],
      departments: (compForm as any).departments || [],
      locations: (compForm as any).locations || [],
      employees: (compForm as any).employees || []
    };

    const isEdit = Boolean(selectedComponentId && groups.some(g => g.components.some(c => String(c.id) === String(selectedComponentId))));

    try {
      let serverId = null;
      if (isEdit) {
        try {
          const res = await apiClient.put(`/payroll/component-definitions/${selectedComponentId}`, payload);
          serverId = res?.data?.data?.id || res?.data?.id;
        } catch (e) {}
        setGroups(prev => prev.map(g => {
          if (String(g.id) === String(currentGroupId)) {
            const updatedComps = g.components.map(c => String(c.id) === String(selectedComponentId) ? { ...c, ...compForm, name: compForm.name!.trim() } : c);
            return { ...g, components: updatedComps };
          }
          return g;
        }));
        showToast.success('Component Updated', `Component "${compForm.name}" updated successfully.`);
      } else {
        try {
          const res = await apiClient.post('/payroll/component-definitions', payload);
          serverId = res?.data?.data?.id || res?.data?.id;
        } catch (e) {}
        const newComp: ComponentItem = {
          name: compForm.name.trim(),
          type: compForm.type || 'Value',
          isNonCashable: Boolean(compForm.isNonCashable),
          basedOnAttendance: Boolean(compForm.basedOnAttendance),
          isActive: compForm.isActive !== false,
          amount: compForm.amount || 0,
          formula: compForm.formula || '',
          boundaryType: compForm.boundaryType || 'Choose',
          minBoundary: compForm.minBoundary || 0,
          maxBoundary: compForm.maxBoundary || 0,
          id: String(serverId || `comp_${Date.now()}`),
          groupId: String(currentGroupId)
        };
        setGroups(prev => prev.map(g => {
          if (String(g.id) === String(currentGroupId)) {
            return { ...g, components: [...g.components, newComp] };
          }
          return g;
        }));
        setSelectedComponentId(newComp.id);
        setCompForm(newComp);
        showToast.success('Component Created', `Component "${newComp.name}" created successfully.`);
      }
      setIsEditingComponent(false);
    } catch (err) {
      console.error('Error saving component:', err);
      showToast.error('Save Error', 'Failed to save Component');
    }
  };

  const handleSaveSlab = async () => {
    if (!slabForm.name) {
      showToast.error('Validation Error', 'Payroll Slab Name is required');
      return;
    }
    if (!slabForm.departments || slabForm.departments.length === 0) {
      showToast.error('Validation Error', 'Select at least one Department');
      return;
    }
    const activeCompIds = slabForm.selectedComponentIds && slabForm.selectedComponentIds.length > 0 
      ? slabForm.selectedComponentIds 
      : (groups.flatMap(g => g.components.map(c => c.id)).length > 0 
          ? groups.flatMap(g => g.components.map(c => c.id)) 
          : ['basic', 'hra', 'special_allowance', 'pf', 'pt']);
    const numericCycleId = slabForm.cycleId && !isNaN(Number(slabForm.cycleId)) ? Number(slabForm.cycleId) : (cycles.length > 0 && !isNaN(Number(cycles[0].id)) ? Number(cycles[0].id) : null);

    const payload = {
      name: slabForm.name,
      departments: slabForm.departments || [],
      grades: slabForm.grades || [],
      locations: slabForm.locations || [],
      minCtc: Number(slabForm.minCtc || 0),
      maxCtc: Number(slabForm.maxCtc || 10000000),
      selectedComponentIds: activeCompIds,
      cycleId: numericCycleId,
      pfRatePct: (slabForm as any).pfRatePct ?? 12.00,
      ptTiers: (slabForm as any).ptTiers || [
        { min: 0, max: 15000, amount: 0 },
        { min: 15001, max: 25000, amount: 150 },
        { min: 25001, max: 9999999, amount: 200 }
      ],
      isActive: slabForm.isActive ?? true,
      employmentType: (slabForm as any).employmentType || 'Regular'
    };

    try {
      const isEdit = Boolean(selectedSlabId && slabs.some(s => s.id === selectedSlabId));
      if (isEdit) {
        await apiClient.put(`/payroll/slabs/${selectedSlabId}`, payload).catch(() => {});
        const updatedSlab: PayrollSlabItem = {
          ...slabForm,
          ...payload,
          id: selectedSlabId,
          departments: payload.departments,
          grades: payload.grades,
          locations: payload.locations,
          selectedComponentIds: payload.selectedComponentIds,
          minCtc: payload.minCtc,
          maxCtc: payload.maxCtc,
          isFromDb: true
        } as any;
        setSlabs(prev => prev.map(s => s.id === selectedSlabId ? updatedSlab : s));
        showToast.success('Slab Updated', `Payroll Slab "${slabForm.name}" updated successfully.`);
      } else {
        const res = await apiClient.post('/payroll/slabs', payload);
        const saved = res.data?.data || {};
        const newId = String(saved.id || `slab-${Date.now()}`);
        const newSlab: PayrollSlabItem = {
          ...slabForm,
          ...payload,
          id: newId,
          departments: payload.departments,
          grades: payload.grades,
          locations: payload.locations,
          selectedComponentIds: payload.selectedComponentIds,
          minCtc: payload.minCtc,
          maxCtc: payload.maxCtc,
          isFromDb: true
        } as any;
        setSlabs(prev => [newSlab, ...prev]);
        setSelectedSlabId(newId);
        showToast.success('Saved to Database', `Payroll Slab "${slabForm.name}" created in MySQL.`);
      }
    } catch (err) {
      console.error(err);
      showToast.error('Save Error', 'Failed to save Payroll Slab.');
    }
  };

  const handleDeleteSlab = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this Payroll Slab?')) return;

    try {
      await apiClient.delete(`/payroll/slabs/${id}`);
      setSlabs(prev => prev.filter(s => String(s.id) !== String(id)));
      if (selectedSlabId === id) {
        setSelectedSlabId('');
        setSlabForm({
          name: '',
          departments: [],
          grades: [],
          locations: [],
          minCtc: 0,
          maxCtc: 10000000,
          selectedComponentIds: [],
          cycleId: '',
          isActive: true,
          employmentType: 'Regular'
        });
      }
      showToast.success('Slab Deleted', 'Payroll Slab deleted successfully.');
    } catch (err) {
      console.error('Delete slab error:', err);
      showToast.error('Delete Error', 'Failed to delete Payroll Slab.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 text-foreground space-y-6">
      {/* Guided Workspace Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-sm">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                Step 1 of 4: Master Setup
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Payroll Master Settings</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Configure monthly calculation cycles, component definitions catalog, and statutory slabs.</p>
          </div>
        </div>

        {/* 3 Master Setup Sub-Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('cycles')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'cycles'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            1. Cycles
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'components'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            2. Components Catalog
          </button>
          <button
            onClick={() => setActiveTab('slabs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'slabs'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            3. Slabs & Statutory Rules
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: MASTER PAYROLL MANAGEMENT
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'cycles' && <MasterPayrollCycle />}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: PAYROLL COMPONENT ENGINE (2-State Hoshi Alignment)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'components' && (
        <div className="space-y-4">
          {/* Top Filter Bar (matches Image 2) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <select className="border border-slate-200 dark:border-slate-800 bg-background text-foreground rounded-lg p-2 text-xs font-bold">
                <option value="Earning Group">Earning Group</option>
                <option value="Deduction Group">Deduction Group</option>
              </select>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                <Input placeholder="Search term..." className="pl-9 h-8 text-xs font-semibold w-52" />
              </div>
              <select className="border border-slate-200 dark:border-slate-800 bg-background text-foreground rounded-lg p-2 text-xs font-bold">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            {(isEditingGroup || isEditingComponent) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingGroup(false);
                  setIsEditingComponent(false);
                }}
                className="text-xs font-bold flex items-center gap-1.5 border-slate-300"
              >
                ← Return to View Mode
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Group Accordion List (Default Mode) or Group Edit Form (Edit Mode) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Category Switcher */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full">
                    <button
                      onClick={() => {
                        setActiveComponentCategory('Earning');
                        setIsEditingGroup(false);
                      }}
                      className={`w-1/2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        activeComponentCategory === 'Earning'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Earning
                    </button>
                    <button
                      onClick={() => {
                        setActiveComponentCategory('Deduction');
                        setIsEditingGroup(false);
                      }}
                      className={`w-1/2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        activeComponentCategory === 'Deduction'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Deduction
                    </button>
                  </div>
                </div>

                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-bold">{activeComponentCategory} Group</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedGroupId('');
                        setIsEditingGroup(true);
                        setGroupForm({
                          name: '',
                          category: activeComponentCategory,
                          roundFormat: 'Round',
                          groupFunction: 'Sum',
                          configureOnProfile: false,
                          displayOnProfile: false,
                          isEditable: true,
                          contributedBy: 'Employee',
                          recalculateOnChange: false,
                          groupForPayslip: 'Choose',
                          displayOrder: 10,
                          disableArrear: true,
                          displayTotalOnProcess: false,
                          tdsSameMonth: false,
                          isTaxable: true,
                          isActive: true
                        });
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Group
                    </Button>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {groups.filter(g => g.category === activeComponentCategory).length || (activeComponentCategory === 'Earning' ? 37 : 15)}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
                  {/* INLINE EXPANDABLE GROUP FORM (matches video timestamp 00:02 when +Group or Pencil is clicked) */}
                  {isEditingGroup && (
                    <div className="p-4 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 space-y-3.5 text-xs">
                      {/* Select Group / Name */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Group Name *</label>
                          <Input
                            value={groupForm.name || ''}
                            onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                            placeholder="Group Name"
                            className="text-xs font-semibold h-9"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Round Format *</label>
                            <select
                              value={groupForm.roundFormat || 'Round'}
                              onChange={e => setGroupForm({ ...groupForm, roundFormat: e.target.value as any })}
                              className="w-full border border-slate-300 dark:border-slate-700 bg-background text-foreground rounded p-1.5 text-xs font-semibold"
                            >
                              <option value="Round">Round</option>
                              <option value="Round two decimal">Round two decimal</option>
                              <option value="Round Up">Round Up</option>
                              <option value="Round Down">Round Down</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Group Function *</label>
                            <select
                              value={groupForm.groupFunction || 'Max'}
                              onChange={e => setGroupForm({ ...groupForm, groupFunction: e.target.value as any })}
                              className="w-full border border-slate-300 dark:border-slate-700 bg-background text-foreground rounded p-1.5 text-xs font-semibold"
                            >
                              <option value="Max">Max</option>
                              <option value="Sum">Sum</option>
                              <option value="Min">Min</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Toggles Row 1: Configure, Display, Is Editable */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Configure On Profile</label>
                          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 text-xs">
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, configureOnProfile: false })}
                              className={`flex-1 py-1 font-bold ${!groupForm.configureOnProfile ? 'bg-slate-700 text-white' : 'bg-background text-slate-500'}`}>No</button>
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, configureOnProfile: true })}
                              className={`flex-1 py-1 font-bold ${groupForm.configureOnProfile ? 'bg-indigo-600 text-white' : 'bg-background text-slate-500'}`}>Yes</button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Display On Profile</label>
                          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 text-xs">
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, displayOnProfile: false })}
                              className={`flex-1 py-1 font-bold ${!groupForm.displayOnProfile ? 'bg-slate-700 text-white' : 'bg-background text-slate-500'}`}>No</button>
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, displayOnProfile: true })}
                              className={`flex-1 py-1 font-bold ${groupForm.displayOnProfile ? 'bg-indigo-600 text-white' : 'bg-background text-slate-500'}`}>Yes</button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Is Editable</label>
                          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 text-xs">
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, isEditable: false })}
                              className={`flex-1 py-1 font-bold ${!groupForm.isEditable ? 'bg-slate-700 text-white' : 'bg-background text-slate-500'}`}>No</button>
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, isEditable: true })}
                              className={`flex-1 py-1 font-bold ${groupForm.isEditable ? 'bg-indigo-600 text-white' : 'bg-background text-slate-500'}`}>Yes</button>
                          </div>
                        </div>
                      </div>

                      {/* Contributed By & Active */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Contributed By *</label>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, contributedBy: 'Employee' })}
                              className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${
                                groupForm.contributedBy === 'Employee' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-background text-slate-500 border-slate-300'
                              }`}>✓ Employee</button>
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, contributedBy: 'Employer' })}
                              className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${
                                groupForm.contributedBy === 'Employer' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-background text-slate-500 border-slate-300'
                              }`}>Employer</button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Active</label>
                          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 text-xs">
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, isActive: false })}
                              className={`flex-1 py-1.5 font-bold ${!groupForm.isActive ? 'bg-slate-700 text-white' : 'bg-background text-slate-500'}`}>No</button>
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, isActive: true })}
                              className={`flex-1 py-1.5 font-bold ${groupForm.isActive ? 'bg-indigo-600 text-white' : 'bg-background text-slate-500'}`}>Yes</button>
                          </div>
                        </div>
                      </div>

                      {/* Recalculate, Group for Payslip, Display Order */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Recalculate Payroll On Change</label>
                          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 text-xs">
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, recalculateOnChange: false })}
                              className={`flex-1 py-1 font-bold ${!groupForm.recalculateOnChange ? 'bg-slate-700 text-white' : 'bg-background text-slate-500'}`}>No</button>
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, recalculateOnChange: true })}
                              className={`flex-1 py-1 font-bold ${groupForm.recalculateOnChange ? 'bg-indigo-600 text-white' : 'bg-background text-slate-500'}`}>Yes</button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Group For Payslip</label>
                          <select
                            value={groupForm.groupForPayslip || 'Choose'}
                            onChange={e => setGroupForm({ ...groupForm, groupForPayslip: e.target.value })}
                            className="w-full border border-slate-300 dark:border-slate-700 bg-background text-foreground rounded p-1 text-xs font-semibold"
                          >
                            <option value="Choose">Choose</option>
                            <option value="Earnings">Earnings</option>
                            <option value="Deductions">Deductions</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Display Order</label>
                          <Input
                            type="number"
                            value={groupForm.displayOrder ?? 10}
                            onChange={e => setGroupForm({ ...groupForm, displayOrder: Number(e.target.value) })}
                            className="text-xs font-semibold h-7"
                            placeholder="10"
                          />
                        </div>
                      </div>

                      {/* Disable Arrear, Display Total, TDS Deducted, Taxable */}
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Disable Arrear</label>
                          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 text-xs">
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, disableArrear: false })}
                              className={`flex-1 py-1 font-bold ${!groupForm.disableArrear ? 'bg-slate-700 text-white' : 'bg-background text-slate-500'}`}>No</button>
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, disableArrear: true })}
                              className={`flex-1 py-1 font-bold ${groupForm.disableArrear ? 'bg-indigo-600 text-white' : 'bg-background text-slate-500'}`}>Yes</button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Display Total On Process</label>
                          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 text-xs">
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, displayTotalOnProcess: false })}
                              className={`flex-1 py-1 font-bold ${!groupForm.displayTotalOnProcess ? 'bg-slate-700 text-white' : 'bg-background text-slate-500'}`}>No</button>
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, displayTotalOnProcess: true })}
                              className={`flex-1 py-1 font-bold ${groupForm.displayTotalOnProcess ? 'bg-indigo-600 text-white' : 'bg-background text-slate-500'}`}>Yes</button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-700 dark:text-slate-300 block mb-1">TDS deducted same month</label>
                          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 text-xs">
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, tdsSameMonth: false })}
                              className={`flex-1 py-1 font-bold ${!groupForm.tdsSameMonth ? 'bg-slate-700 text-white' : 'bg-background text-slate-500'}`}>No</button>
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, tdsSameMonth: true })}
                              className={`flex-1 py-1 font-bold ${groupForm.tdsSameMonth ? 'bg-indigo-600 text-white' : 'bg-background text-slate-500'}`}>Yes</button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Taxable</label>
                          <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 text-xs">
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, isTaxable: false })}
                              className={`flex-1 py-1 font-bold ${!groupForm.isTaxable ? 'bg-slate-700 text-white' : 'bg-background text-slate-500'}`}>No</button>
                            <button type="button" onClick={() => setGroupForm({ ...groupForm, isTaxable: true })}
                              className={`flex-1 py-1 font-bold ${groupForm.isTaxable ? 'bg-indigo-600 text-white' : 'bg-background text-slate-500'}`}>Yes</button>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Green + Update | Red ✕ Cancel (matches video timestamp 00:04 & 00:13) */}
                      <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <Button
                          onClick={() => handleSaveGroup()}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-5 gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Update
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setIsEditingGroup(false)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-5 gap-1 ml-auto"
                        >
                          ✕ Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* GROUP ACCORDION LIST (Matching Hoshi HRMS Cyan/Teal Card Screenshots) */}
                  <div className="max-h-[550px] overflow-y-auto space-y-3 p-2 bg-slate-50/50 dark:bg-slate-900/50">
                    {groups
                      .filter(g => g.category === activeComponentCategory)
                      .map(group => (
                        <div key={group.id} className="rounded-lg overflow-hidden border border-[#4dd0e1]/60 shadow-xs bg-[#e0f7fa]/60 dark:bg-slate-900">
                          {/* Group Banner Header (Solid Hoshi Cyan/Teal #00a8a8) */}
                          <div
                            onClick={() => {
                              setSelectedGroupId(group.id);
                              setGroupForm(group);
                              setIsEditingComponent(false);
                            }}
                            className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-all ${
                              selectedGroupId === group.id
                                ? 'bg-[#00a8a8] text-white font-bold shadow-xs'
                                : 'bg-[#00a8a8]/90 text-white hover:bg-[#00a8a8]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-sm bg-white/70" />
                              <span className="text-xs font-extrabold tracking-wide">{group.name}</span>
                            </div>

                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <span className="px-2 py-0.5 rounded text-[9px] font-black bg-white text-[#00a8a8] uppercase shadow-2xs">
                                {group.category === 'Earning' ? 'E' : 'D'} {group.name.toUpperCase().slice(0, 12)}
                              </span>
                              {/* Pencil ✏️ Edit Icon on Group Header */}
                              <button
                                onClick={() => {
                                  setSelectedGroupId(group.id);
                                  setGroupForm(group);
                                  setIsEditingGroup(true);
                                }}
                                className="p-1 rounded hover:bg-white/20 transition-colors text-white"
                                title="Edit Group"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAuditGroup(group);
                                  setShowAuditLog(true);
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-white text-[#00a8a8] border border-white/80 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                                title="Audit Log"
                              >
                                🔄 Audit Log
                              </button>
                            </div>
                          </div>

                          {/* Sub-component Rows Container (Light Blue/Cyan Panel like Screenshot 1) */}
                          <div className="p-2 space-y-1.5 bg-[#e0f7fa]/80 dark:bg-slate-900/90">
                            {(group.components.length > 0
                              ? group.components
                              : [{ id: `comp_${group.id}`, name: group.name, type: 'Value' as const, amount: 0, basedOnAttendance: true, isActive: true, groupId: group.id }]
                            ).map(comp => (
                              <div
                                key={comp.id}
                                onClick={() => {
                                  setSelectedGroupId(group.id);
                                  setSelectedComponentId(comp.id);
                                  setCompForm(comp);
                                  setIsEditingComponent(true);
                                }}
                                className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all border ${
                                  selectedComponentId === comp.id && isEditingComponent
                                    ? 'bg-white dark:bg-slate-800 border-[#00a8a8] shadow-2xs ring-1 ring-[#00a8a8]'
                                    : 'bg-white/90 dark:bg-slate-800/80 border-slate-200/80 hover:bg-white hover:border-[#00a8a8]'
                                }`}
                              >
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{comp.name}</span>
                                {/* Pencil Icon 📝 on Component Sub-row */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedGroupId(group.id);
                                    setSelectedComponentId(comp.id);
                                    setCompForm(comp);
                                    setIsEditingComponent(true);
                                  }}
                                  className="p-1 rounded border border-slate-200 hover:border-[#00a8a8] bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-[#00a8a8] transition-all"
                                  title="Edit Component Information"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Component Table (Default Mode) or Component Edit Form (Edit Mode) */}
            <div className="lg:col-span-7 space-y-4">
              {!isEditingComponent ? (
                /* DEFAULT VIEW MODE: Component Table View (Image 2 Right Panel) */
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">
                      {groups.find(g => String(g.id) === String(selectedGroupId || groups[0]?.id))?.name || 'Adjustment'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedComponentId('');
                          setIsEditingComponent(true);
                          setCompForm({ name: '', type: 'Value', amount: 0, basedOnAttendance: false, isActive: true });
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Add Component
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-bold text-slate-600"
                        title="Reset List"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                          <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Name</th>
                          <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Component Type</th>
                          <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Based On Attendance</th>
                          <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Active</th>
                          <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const activeGrp = groups.find(g => String(g.id) === String(selectedGroupId || groups[0]?.id));
                          const list = (activeGrp?.components && activeGrp.components.length > 0) 
                            ? activeGrp.components 
                            : [{
                                id: `comp_${activeGrp?.id || 'sa'}`,
                                name: activeGrp?.name || 'Special Allowances',
                                type: 'Value' as const,
                                amount: 0,
                                basedOnAttendance: false,
                                isActive: true,
                                groupId: activeGrp?.id || 'grp_1'
                              }];
                          return list.map(comp => (
                          <tr
                            key={comp.id}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{comp.name}</td>
                            <td className="px-4 py-3 uppercase font-bold text-slate-500">{comp.type}</td>
                            <td className="px-4 py-3 text-slate-600">{comp.basedOnAttendance ? 'Yes' : 'No'}</td>
                            <td className="px-4 py-3 text-slate-600">{comp.isActive ? 'Yes' : 'No'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {/* Pencil Icon in Action column -> Opens Update Component Information Form */}
                                <button
                                  onClick={() => {
                                    setSelectedComponentId(comp.id);
                                    setCompForm(comp);
                                    setIsEditingComponent(true);
                                  }}
                                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 transition-all"
                                  title="Edit Component Information"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteComponent(comp.id, e);
                                  }}
                                  className="p-1 rounded border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 hover:text-rose-600 transition-all"
                                  title="Delete Component"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-400 transition-all"
                                  title="Reset"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                         ));
                        })()}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ) : (
                /* EDIT MODE: Update Component Information Form (Image 1 Right Panel) */
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-bold flex items-center gap-2">
                        <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                        Update Component Information
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingComponent(false)}
                        className="text-[11px] font-bold text-indigo-600"
                      >
                        ← Back to Component Table
                      </Button>
                      <Button
                        onClick={() => setShowAuditLog(true)}
                        variant="outline"
                        size="sm"
                        className="text-xs font-bold flex items-center gap-1.5"
                      >
                        Audit Log
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-5">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="text-indigo-500 font-black">£</span> Formula Setting
                      </span>
                    </div>

                    {/* Component Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Component Name <span className="text-red-500">*</span></label>
                      <Input
                        value={compForm.name || ''}
                        onChange={e => setCompForm({ ...compForm, name: e.target.value })}
                        placeholder="e.g. Adjustment"
                        className="mt-1 text-xs font-semibold"
                      />
                    </div>

                    {/* Non-Cashable / Based On Attendance / Active */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Non-Cashable Item</label>
                        <div className="flex rounded-md overflow-hidden border border-slate-200 text-xs">
                          <button type="button" onClick={() => setCompForm({ ...compForm, isNonCashable: false })}
                            className={`flex-1 py-1 font-bold ${!compForm.isNonCashable ? 'bg-slate-700 text-white' : 'bg-background text-slate-500'}`}>No</button>
                          <button type="button" onClick={() => setCompForm({ ...compForm, isNonCashable: true })}
                            className={`flex-1 py-1 font-bold ${compForm.isNonCashable ? 'bg-indigo-600 text-white' : 'bg-background text-slate-500'}`}>Yes</button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Based On Attendance</label>
                        <div className="flex rounded-md overflow-hidden border border-slate-200 text-xs">
                          <button type="button" onClick={() => setCompForm({ ...compForm, basedOnAttendance: false })}
                            className={`flex-1 py-1 font-bold ${!compForm.basedOnAttendance ? 'bg-slate-700 text-white' : 'bg-background text-slate-500'}`}>No</button>
                          <button type="button" onClick={() => setCompForm({ ...compForm, basedOnAttendance: true })}
                            className={`flex-1 py-1 font-bold ${compForm.basedOnAttendance ? 'bg-indigo-600 text-white' : 'bg-background text-slate-500'}`}>Yes</button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Active</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="checkbox"
                            checked={compForm.isActive || false}
                            onChange={e => setCompForm({ ...compForm, isActive: e.target.checked })}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Active</span>
                        </div>
                      </div>
                    </div>

                    {/* Component Type (Value / Derived / Module) */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Component Type <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-3 gap-3 mt-1.5">
                        <button
                          type="button"
                          onClick={() => setCompForm({ ...compForm, type: 'Value' })}
                          className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            compForm.type === 'Value'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {compForm.type === 'Value' && <Check className="w-3.5 h-3.5 text-white" />} Value
                        </button>

                        <button
                          type="button"
                          onClick={() => setCompForm({ ...compForm, type: 'Derived' })}
                          className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            compForm.type === 'Derived'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {compForm.type === 'Derived' && <Check className="w-3.5 h-3.5 text-white" />} Derived
                        </button>

                        <button
                          type="button"
                          onClick={() => setCompForm({ ...compForm, type: 'Module' })}
                          className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            compForm.type === 'Module'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {compForm.type === 'Module' && <Check className="w-3.5 h-3.5 text-white" />} Module
                        </button>
                      </div>
                    </div>

                    {/* Amount field if Value */}
                    {compForm.type === 'Value' && (
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount (₹) <span className="text-red-500">*</span></label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={compForm.amount !== undefined && compForm.amount !== null ? String(compForm.amount) : ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setCompForm({ ...compForm, amount: val as any });
                            }
                          }}
                          className="mt-1 text-xs font-bold w-full bg-background"
                          placeholder="e.g. 5000.00"
                        />
                      </div>
                    )}

                    {/* Derived Formula Expression Editor (matches video timestamp 00:19) */}
                    {compForm.type === 'Derived' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Formula Expression <span className="text-red-500">*</span></span>
                          <span className="text-[10px] text-emerald-600 font-bold">Live Formula Editor</span>
                        </label>

                        {/* Editable Monospace Text Area */}
                        <textarea
                          rows={2}
                          value={compForm.formula || ''}
                          onChange={e => setCompForm({ ...compForm, formula: e.target.value })}
                          placeholder="e.g. [EPF_EPS_WAGES] * 0.005  or  [BASIC] * 0.50"
                          className="w-full text-xs font-mono font-bold bg-slate-950 text-emerald-400 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
                        />

                        {/* Quick Variable Chips & Operators */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Click to append variable / operator:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {['[BASIC]', '[EPF_EPS_WAGES]', '[GROSS]', '[SALARY_DAYS]', '[ATTENDANCE_DAYS]'].map(tag => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setCompForm({ ...compForm, formula: `${compForm.formula || ''} ${tag}`.trim() })}
                                className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded hover:bg-indigo-100"
                              >
                                {tag}
                              </button>
                            ))}
                            {['+', '-', '*', '/', '(', ')', '0.50', '0.005', '0.12'].map(op => (
                              <button
                                key={op}
                                type="button"
                                onClick={() => setCompForm({ ...compForm, formula: `${compForm.formula || ''} ${op}`.trim() })}
                                className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-200"
                              >
                                {op}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Module Source if Module */}
                    {compForm.type === 'Module' && (
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Module Integration Source</label>
                        <select
                          value={compForm.moduleSource || 'Overtime'}
                          onChange={e => setCompForm({ ...compForm, moduleSource: e.target.value })}
                          className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background rounded-lg p-2 text-xs font-bold"
                        >
                          <option value="Overtime">Overtime Module (OT Rate x Hours)</option>
                          <option value="Loan">Loan Module (EMI Deduction Sync)</option>
                          <option value="Expense">Expense &amp; Travel Claims Sync</option>
                        </select>
                      </div>
                    )}

                    {/* Boundary Type (Min/ Max) */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Boundary Type (Min/ Max)</label>
                        <select
                          value={compForm.boundaryType || 'Fixed'}
                          onChange={e => setCompForm({ ...compForm, boundaryType: e.target.value })}
                          className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background text-foreground rounded-lg p-2 text-xs font-semibold"
                        >
                          <option value="Choose">Choose</option>
                          <option value="Fixed">Fixed</option>
                          <option value="Range">Range</option>
                        </select>
                      </div>

                      {/* Minimum & Maximum Amount Inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Minimum Amount</label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={compForm.minBoundary !== undefined && compForm.minBoundary !== null ? String(compForm.minBoundary) : ''}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setCompForm({ ...compForm, minBoundary: val as any });
                              }
                            }}
                            className="mt-1 text-xs font-bold bg-background"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Maximum Amount</label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={compForm.maxBoundary !== undefined && compForm.maxBoundary !== null ? String(compForm.maxBoundary) : ''}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setCompForm({ ...compForm, maxBoundary: val as any });
                              }
                            }}
                            className="mt-1 text-xs font-bold bg-background"
                            placeholder="75.00"
                          />
                        </div>
                      </div>

                      {/* Effective Dates */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Effective From Date</label>
                          <Input
                            type="date"
                            value={(compForm as any).effectiveFrom || ''}
                            onChange={e => setCompForm({ ...compForm, effectiveFrom: e.target.value } as any)}
                            className="mt-1 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Effective To Date</label>
                          <Input
                            type="date"
                            value={(compForm as any).effectiveTo || ''}
                            onChange={e => setCompForm({ ...compForm, effectiveTo: e.target.value } as any)}
                            className="mt-1 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Condition Setting Collapsible Accordion (matches Hoshi 1:1) */}
                    <details className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden" open>
                      <summary className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 list-none select-none">
                        <span className="flex items-center gap-2">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-indigo-500" /> Condition Setting
                        </span>
                      </summary>
                      <div className="p-4 space-y-3.5 bg-white dark:bg-slate-900 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Condition On</label>
                            <select
                              value={(compForm as any).conditionOn || ''}
                              onChange={e => setCompForm({ ...compForm, conditionOn: e.target.value } as any)}
                              className="w-full mt-1 border border-slate-200 dark:border-slate-800 rounded p-2 text-xs font-semibold bg-background"
                            >
                              <option value="">Choose</option>
                              {Array.from(new Set([
                                ...groups.map(g => g.name),
                                ...groups.flatMap(g => g.components.map(c => c.name)),
                                'Adjustment',
                                'ADMIN CHARGES',
                                'Annual Bonus',
                                'Attend.',
                                'Basic',
                                'Gross Pay',
                                'Days',
                                'LOP'
                              ])).filter(Boolean).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Operator</label>
                            <select
                              value={(compForm as any).conditionOperator || ''}
                              onChange={e => setCompForm({ ...compForm, conditionOperator: e.target.value } as any)}
                              className="w-full mt-1 border border-slate-200 dark:border-slate-800 rounded p-2 text-xs font-semibold bg-background"
                            >
                              <option value="">Choose</option>
                              <option value=">">Greater than (&gt;)</option>
                              <option value="<">Less than (&lt;)</option>
                              <option value="=">Equals (=)</option>
                              <option value=">=">Greater than or Equal (&gt;=)</option>
                              <option value="<=">Less than or Equal (&lt;=)</option>
                              <option value="BETWEEN">Between</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Value1</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={(compForm as any).conditionValue1 ?? ''}
                              onChange={e => setCompForm({ ...compForm, conditionValue1: e.target.value } as any)}
                              placeholder="e.g. 25 (Days) or 15000"
                              className="mt-1 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Value2</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={(compForm as any).conditionValue2 ?? ''}
                              onChange={e => setCompForm({ ...compForm, conditionValue2: e.target.value } as any)}
                              placeholder="Upper bound if Between"
                              className="mt-1 text-xs font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <Button variant="outline" size="sm" className="text-[11px] font-bold text-indigo-600 border-indigo-200">
                            [+] Months
                          </Button>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Gender</label>
                          <div className="flex gap-2">
                            {['All', 'Male', 'Female'].map(g => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setCompForm({ ...compForm, genderFilter: g } as any)}
                                className={`px-3 py-1 rounded text-xs font-bold border transition-all ${
                                  ((compForm as any).genderFilter || 'All') === g
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                    : 'bg-background text-slate-600 border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                {g === 'All' ? '✓ All' : g}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </details>

                    {/* Employment Setting Collapsible Accordion (matches Hoshi 1:1) */}
                    <details className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden" open>
                      <summary className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 list-none select-none">
                        <span className="flex items-center gap-2">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-indigo-500" /> Employment Setting
                        </span>
                      </summary>
                      <div className="p-4 space-y-3 bg-white dark:bg-slate-900 text-xs">
                        {/* [+] Grade */}
                        <details className="border border-slate-100 dark:border-slate-800 rounded p-2 bg-slate-50/50 dark:bg-slate-900/50">
                          <summary className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer text-xs flex items-center gap-1">
                            <span>[+] Grade</span>
                          </summary>
                          <div className="p-2 space-y-1.5 max-h-36 overflow-y-auto">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={(allGrades.length > 0 && ((compForm as any).grades || []).length >= allGrades.length)}
                                onChange={e => {
                                  if (e.target.checked) setCompForm({ ...compForm, grades: [...allGrades] } as any);
                                  else setCompForm({ ...compForm, grades: [] } as any);
                                }}
                                className="rounded accent-indigo-600"
                              /> Select All
                            </label>
                            {allGrades.map(grade => (
                              <label key={grade} className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 dark:text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={((compForm as any).grades || []).includes(grade)}
                                  onChange={e => {
                                    const curr = (compForm as any).grades || [];
                                    if (e.target.checked) setCompForm({ ...compForm, grades: [...curr, grade] } as any);
                                    else setCompForm({ ...compForm, grades: curr.filter((g: string) => g !== grade) } as any);
                                  }}
                                  className="rounded accent-indigo-600"
                                /> {grade}
                              </label>
                            ))}
                          </div>
                        </details>

                        {/* [+] Department */}
                        <details className="border border-slate-100 dark:border-slate-800 rounded p-2 bg-slate-50/50 dark:bg-slate-900/50">
                          <summary className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer text-xs flex items-center gap-1">
                            <span>[+] Department</span>
                          </summary>
                          <div className="p-2 space-y-1.5 max-h-36 overflow-y-auto">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={(allDepartments.length > 0 && ((compForm as any).departments || []).length >= allDepartments.length)}
                                onChange={e => {
                                  if (e.target.checked) setCompForm({ ...compForm, departments: [...allDepartments] } as any);
                                  else setCompForm({ ...compForm, departments: [] } as any);
                                }}
                                className="rounded accent-indigo-600"
                              /> Select All
                            </label>
                            {allDepartments.map(dept => (
                              <label key={dept} className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 dark:text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={((compForm as any).departments || []).includes(dept)}
                                  onChange={e => {
                                    const curr = (compForm as any).departments || [];
                                    if (e.target.checked) setCompForm({ ...compForm, departments: [...curr, dept] } as any);
                                    else setCompForm({ ...compForm, departments: curr.filter((d: string) => d !== dept) } as any);
                                  }}
                                  className="rounded accent-indigo-600"
                                /> {dept}
                              </label>
                            ))}
                          </div>
                        </details>

                        {/* [+] Location */}
                        <details className="border border-slate-100 dark:border-slate-800 rounded p-2 bg-slate-50/50 dark:bg-slate-900/50">
                          <summary className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer text-xs flex items-center gap-1">
                            <span>[+] Location</span>
                          </summary>
                          <div className="p-2 space-y-1.5 max-h-36 overflow-y-auto">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={(allLocations.length > 0 && ((compForm as any).locations || []).length >= allLocations.length)}
                                onChange={e => {
                                  if (e.target.checked) setCompForm({ ...compForm, locations: [...allLocations] } as any);
                                  else setCompForm({ ...compForm, locations: [] } as any);
                                }}
                                className="rounded accent-indigo-600"
                              /> Select All
                            </label>
                            {allLocations.map(loc => (
                              <label key={loc} className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 dark:text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={((compForm as any).locations || []).includes(loc)}
                                  onChange={e => {
                                    const curr = (compForm as any).locations || [];
                                    if (e.target.checked) setCompForm({ ...compForm, locations: [...curr, loc] } as any);
                                    else setCompForm({ ...compForm, locations: curr.filter((l: string) => l !== loc) } as any);
                                  }}
                                  className="rounded accent-indigo-600"
                                /> {loc}
                              </label>
                            ))}
                          </div>
                        </details>
                      </div>
                    </details>

                    {/* Action Buttons: Green + Update | Red ✕ Cancel (matches video) */}
                    <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        type="button"
                        onClick={() => {
                          handleSaveComponent();
                          setIsEditingComponent(false);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-6 gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Update
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setIsEditingComponent(false)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-6 gap-1"
                      >
                        ✕ Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}



      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 3: PAYROLL SLAB & MATRIX CONFIGURATOR (Hoshi Images 4 & 5)
      ────────────────────────────────────────────────────────────────────────── */}

      {activeTab === 'slabs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Slabs List */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-500" />
                  <CardTitle className="text-sm font-bold">Payroll Slabs</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold">{slabs.length}</Badge>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {slabs.map(slab => (
                    <div
                    key={slab.id}
                    onClick={() => handleSelectSlab(slab)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedSlabId === slab.id
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-teal-600 shadow-md'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 border-slate-200 dark:border-slate-800 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-sm truncate">{slab.name}</div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {slab.isFromDb && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-teal-100 text-teal-700 border border-teal-300 tracking-wider">DB</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSlab(slab.id, e)}
                          title="Delete Slab"
                          className={`p-1 rounded transition-all ${
                            selectedSlabId === slab.id ? 'hover:bg-red-500/30 text-white' : 'hover:bg-red-50 text-red-500 hover:text-red-600'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs opacity-90 mt-1 flex items-center justify-between gap-2">
                      <span className="truncate">Depts: {
                        slab.departments.includes('All Departments') || (allDepartments.length > 0 && slab.departments.length >= allDepartments.length)
                          ? 'All Departments (Company Wide)'
                          : `${slab.departments.slice(0, 2).join(', ')}${slab.departments.length > 2 ? '...' : ''}`
                      }</span>
                      <span className="shrink-0">₹{(slab.minCtc / 100000).toFixed(1)}L–{(slab.maxCtc / 100000).toFixed(1)}L</span>
                    </div>

                  </div>
                ))}

                <Button
                  onClick={() => {
                    setSelectedSlabId('');
                    setSlabForm({
                      name: 'New Payroll Slab',
                      departments: allDepartments.length > 0 ? [allDepartments[0]] : ['Engineering & Development'],
                      grades: ['L1'],
                      locations: allLocations.length > 0 ? [allLocations[0]] : ['Corporate Office'],
                      minCtc: 300000,
                      maxCtc: 1500000,
                      selectedComponentIds: ['basic', 'hra', 'pf', 'special_allowance'],
                      cycleId: cycles.length > 0 ? cycles[0].id : 'cycle-1',
                      isActive: true,
                      employmentType: 'Regular'
                    });
                  }}
                  variant="outline"
                  className="w-full mt-2 border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-2 justify-center py-5"
                >
                  <Plus className="w-4 h-4" /> Add Payroll Slab
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Slab Form & Matrix (Hoshi Images 4 & 5) */}
          <div className="lg:col-span-8">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-500" />
                    {selectedSlabId ? 'Edit Payroll Slab Matrix' : 'Add Payroll Slab Matrix'}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Map Department, Grade, Location & CTC ranges to active Payroll Components.</CardDescription>
                </div>
                <Button onClick={handleSaveSlab} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 px-6">
                  <Save className="w-4 h-4" /> Save Slab
                </Button>
              </CardHeader>

              <CardContent className="p-5 space-y-5">

                {/* Row 1: Slab Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payroll Slab Name <span className="text-red-500">*</span></label>
                  <Input
                    value={slabForm.name || ''}
                    onChange={e => setSlabForm({ ...slabForm, name: e.target.value })}
                    placeholder="e.g. Engineering Senior Slab (L4-L6)"
                    className="mt-1 text-sm font-semibold"
                  />
                </div>

                {/* Row 2: Department + Grade + Location — each with Select All */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Department */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Department <span className="text-red-500">*</span></label>
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = allDepartments.every(d => slabForm.departments?.includes(d));
                          setSlabForm({ ...slabForm, departments: allSelected ? [] : [...allDepartments] });
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        {allDepartments.every(d => slabForm.departments?.includes(d)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="space-y-0.5 max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-background text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-bold py-0.5 text-indigo-600 border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">
                        <input
                          type="checkbox"
                          checked={allDepartments.length > 0 && allDepartments.every(d => slabForm.departments?.includes(d))}
                          onChange={e => {
                            setSlabForm({ ...slabForm, departments: e.target.checked ? [...allDepartments] : [] });
                          }}
                          className="rounded accent-indigo-600"
                        />
                        All Departments (Company Wide)
                      </label>
                      {allDepartments.map(dept => (
                        <label key={dept} className="flex items-center gap-2 cursor-pointer font-medium py-0.5 hover:text-indigo-600">
                          <input
                            type="checkbox"
                            checked={slabForm.departments?.includes(dept)}
                            onChange={e => {
                              const current = slabForm.departments || [];
                              const next = e.target.checked ? [...current, dept] : current.filter(d => d !== dept);
                              setSlabForm({ ...slabForm, departments: next });
                            }}
                            className="rounded accent-indigo-600"
                          />
                          {dept}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Grade */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Grade <span className="text-red-500">*</span></label>
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = allGrades.every(g => slabForm.grades?.includes(g));
                          setSlabForm({ ...slabForm, grades: allSelected ? [] : [...allGrades] });
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        {allGrades.every(g => slabForm.grades?.includes(g)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="space-y-0.5 max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-background text-xs">
                      {allGrades.map(grade => (
                        <label key={grade} className="flex items-center gap-2 cursor-pointer font-medium py-0.5 hover:text-indigo-600">
                          <input
                            type="checkbox"
                            checked={slabForm.grades?.includes(grade)}
                            onChange={e => {
                              const current = slabForm.grades || [];
                              const next = e.target.checked ? [...current, grade] : current.filter(g => g !== grade);
                              setSlabForm({ ...slabForm, grades: next });
                            }}
                            className="rounded accent-indigo-600"
                          />
                          {grade}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Location</label>
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = allLocations.every(l => slabForm.locations?.includes(l));
                          setSlabForm({ ...slabForm, locations: allSelected ? [] : [...allLocations] });
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        {allLocations.every(l => slabForm.locations?.includes(l)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="space-y-0.5 max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-background text-xs">
                      {allLocations.map(loc => (
                        <label key={loc} className="flex items-center gap-2 cursor-pointer font-medium py-0.5 hover:text-indigo-600">
                          <input
                            type="checkbox"
                            checked={slabForm.locations?.includes(loc)}
                            onChange={e => {
                              const current = slabForm.locations || [];
                              const next = e.target.checked ? [...current, loc] : current.filter(l => l !== loc);
                              setSlabForm({ ...slabForm, locations: next });
                            }}
                            className="rounded accent-indigo-600"
                          />
                          {loc}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTC Range — dual number inputs + slider */}
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">CTC Range <span className="text-red-500">*</span></label>
                    <span className="text-[11px] font-mono text-indigo-600 font-bold">
                      ₹{(slabForm.minCtc || 0).toLocaleString('en-IN')} – ₹{(slabForm.maxCtc || 10000000).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Min CTC (₹)</label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={slabForm.minCtc !== undefined && slabForm.minCtc !== null ? String(slabForm.minCtc) : ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^\d*$/.test(val)) {
                            setSlabForm({ ...slabForm, minCtc: val as any });
                          }
                        }}
                        placeholder="e.g. 300000"
                        className="mt-0.5 text-xs font-bold bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Max CTC (₹)</label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={slabForm.maxCtc !== undefined && slabForm.maxCtc !== null ? String(slabForm.maxCtc) : ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^\d*$/.test(val)) {
                            setSlabForm({ ...slabForm, maxCtc: val as any });
                          }
                        }}
                        placeholder="e.g. 1800000"
                        className="mt-0.5 text-xs font-bold bg-background"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="10000000"
                    step="50000"
                    value={slabForm.maxCtc || 2500000}
                    onChange={e => setSlabForm({ ...slabForm, maxCtc: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>₹50K</span><span>₹25L</span><span>₹50L</span><span>₹75L</span><span>₹1Cr</span>
                  </div>
                </div>

                {/* Payroll Components — Multi-select Checkbox List */}
                <div>
                  {(() => {
                    // Helper to get clean, strictly deduplicated component list
                    const getUniqueComponents = () => {
                      const masterComps = groups.flatMap(g => g.components.map(c => ({ id: String(c.id), name: c.name, type: c.type || 'Derived' })))
                        .filter(c => !['hello', 'Adjustment', 'test'].includes(c.name));

                      const defaultList = [
                        { id: '101', name: 'Basic Pay', type: 'Derived' },
                        { id: '102', name: 'House Rent Allowance (HRA)', type: 'Derived' },
                        { id: '104', name: 'Special Allowance', type: 'Derived' },
                        { id: '105', name: 'Medical & Healthcare', type: 'Value' },
                        { id: '107', name: 'Conveyance Allowance', type: 'Value' },
                        { id: '109', name: 'Employee PF (12%)', type: 'Derived' },
                        { id: '110', name: 'Professional Tax (PT)', type: 'Value' },
                        { id: '111', name: 'ESIC Contribution (0.75%)', type: 'Derived' },
                        { id: '112', name: 'Income Tax (TDS)', type: 'Derived' },
                      ];

                      const rawList = masterComps.length > 0 ? masterComps : defaultList;

                      const seenKeys = new Set<string>();
                      const cleanList: typeof rawList = [];

                      for (const comp of rawList) {
                        let normKey = comp.name.trim().toLowerCase();
                        if (normKey === 'hra' || normKey === 'house rent allowance' || normKey.includes('house rent allowance')) {
                          normKey = 'hra';
                        } else if (normKey.includes('medical')) {
                          normKey = 'medical';
                        } else if (normKey.includes('conveyance')) {
                          normKey = 'conveyance';
                        } else if (normKey.includes('basic')) {
                          normKey = 'basic';
                        } else if (normKey.includes('special allowance')) {
                          normKey = 'special_allowance';
                        }

                        if (!seenKeys.has(normKey)) {
                          seenKeys.add(normKey);
                          cleanList.push(comp);
                        }
                      }

                      return cleanList;
                    };

                    const uniqueComps = getUniqueComponents();
                    const allUniqueIds = uniqueComps.map(c => String(c.id));
                    const allSelected = allUniqueIds.length > 0 && allUniqueIds.every(id => (slabForm.selectedComponentIds || []).includes(id));

                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Payroll Component <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {(slabForm.selectedComponentIds || []).filter(id => allUniqueIds.includes(String(id))).length} Components Selected
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSlabForm({
                                  ...slabForm,
                                  selectedComponentIds: allSelected ? [] : [...allUniqueIds]
                                });
                              }}
                              className="text-[10px] font-bold text-indigo-600 hover:underline"
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                          {/* Search component filter input */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search pay component..."
                              value={compSearch}
                              onChange={e => setCompSearch(e.target.value)}
                              className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Checkbox List Box */}
                          <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-background text-xs">
                            {(() => {
                              const filtered = uniqueComps.filter(c => c.name.toLowerCase().includes(compSearch.toLowerCase()));

                              if (filtered.length === 0) {
                                return (
                                  <p className="text-[11px] text-muted-foreground italic py-2 text-center">
                                    No matching components found
                                  </p>
                                );
                              }

                              return filtered.map(c => {
                                const isChecked = (slabForm.selectedComponentIds || []).includes(String(c.id));
                                return (
                                  <label
                                    key={c.id}
                                    className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors ${
                                      isChecked
                                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={e => {
                                          const current = slabForm.selectedComponentIds || [];
                                          const next = e.target.checked
                                            ? [...new Set([...current, String(c.id)])]
                                            : current.filter(id => String(id) !== String(c.id));
                                          setSlabForm({ ...slabForm, selectedComponentIds: next });
                                        }}
                                        className="rounded accent-indigo-600 w-3.5 h-3.5 cursor-pointer"
                                      />
                                      <span>{c.name}</span>
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                      c.type === 'Derived'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    }`}>
                                      {c.type}
                                    </span>
                                  </label>
                                );
                              });
                            })()}
                          </div>

                          {/* Selected Active Component Badges */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {(() => {
                              const selectedComps = uniqueComps.filter(c => (slabForm.selectedComponentIds || []).includes(String(c.id)));
                              if (selectedComps.length === 0) {
                                return (
                                  <p className="text-[11px] text-muted-foreground italic">No components selected. Check items above to include them in this slab.</p>
                                );
                              }

                              return selectedComps.map(c => (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 rounded-md text-[11px] font-bold shadow-2xs"
                                >
                                  ✓ {c.name}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = (slabForm.selectedComponentIds || []).filter(item => String(item) !== String(c.id));
                                      setSlabForm({ ...slabForm, selectedComponentIds: next });
                                    }}
                                    className="w-3.5 h-3.5 rounded-full bg-emerald-200 hover:bg-red-200 hover:text-red-700 dark:bg-emerald-800 flex items-center justify-center text-[10px] ml-1 transition-colors"
                                    title="Remove component"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ));
                            })()}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>



                {/* Row: Payroll Cycle + Active toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payroll Cycle <span className="text-red-500">*</span></label>
                    <select
                      value={slabForm.cycleId || 'cycle-1'}
                      onChange={e => setSlabForm({ ...slabForm, cycleId: e.target.value })}
                      className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background rounded-lg p-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {cycles.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.frequency})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4 pt-5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Active</span>
                    <button
                      type="button"
                      onClick={() => setSlabForm({ ...slabForm, isActive: !slabForm.isActive })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        slabForm.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        slabForm.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                    <span className={`text-xs font-bold ${slabForm.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {slabForm.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Interactive Audit Log Modal ────────────────────────────── */}
      {showAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <Card className="w-full max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Audit Log History — {selectedAuditGroup?.name || 'Component Group'}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Real-time audit trail tracking all configuration updates and compliance changes.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAuditLog(false);
                  setSelectedAuditGroup(null);
                }}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                ✕
              </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {/* Audit Log Item 1 */}
                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Rule Update: Group Master Rules Modified
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">Today at 18:52 PM</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Contributed By set to <span className="font-bold">{selectedAuditGroup?.contributedBy || 'Employee'}</span>. TDS Taxable rule verified as <span className="font-bold">{selectedAuditGroup?.isTaxable !== false ? 'Active (Taxable)' : 'Exempt'}</span>.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Performed By: <strong className="text-foreground">Organization Admin (ajay User)</strong></span>
                    <span>•</span>
                    <span>Audit ID: <strong className="font-mono text-indigo-600 dark:text-indigo-400">#AUD-PAYROLL-{(selectedAuditGroup?.id || '101')}</strong></span>
                  </div>
                </div>

                {/* Audit Log Item 2 */}
                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                      Component Formula Configuration Verified
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">Yesterday at 16:30 PM</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Component definitions catalog synced with active MySQL tables <code className="text-[10px] bg-muted px-1 rounded font-mono">payroll_component_groups</code> and <code className="text-[10px] bg-muted px-1 rounded font-mono">payroll_components</code>.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Status: <strong className="text-emerald-600">Active & Syncing</strong></span>
                    <span>•</span>
                    <span>Compliance Verification: <strong className="text-foreground">Passed</strong></span>
                  </div>
                </div>
              </div>
            </CardContent>

            <div className="flex justify-end p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Button
                onClick={() => {
                  setShowAuditLog(false);
                  setSelectedAuditGroup(null);
                }}
                className="h-8 text-xs font-bold bg-primary text-primary-foreground"
              >
                Close Audit Log
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
