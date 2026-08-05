import React, { useState, useEffect } from 'react';
import { apiClient } from '@/config/api';
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
import { showToast } from '@/components/ui/toast';

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
  isDailyWages: boolean;
  dailyWagesIncludePaidHolidays?: boolean;
  dailyWagesIncludeWeekOff?: boolean;
  frequency: 'Monthly' | 'Semi-Monthly' | 'Weekly' | 'Bi-Weekly';
  startDate: number;
  cutoffDay: number;
  monthOffset: 'Current' | 'Previous' | 'Next';
  disbursementDate: number;
  capAmount?: number;
  toleranceEnabled: boolean;
  toleranceMinutes: number;
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
  const [activeTab, setActiveTab] = useState<'cycles' | 'components' | 'slabs'>('cycles');

  // Master lists loaded dynamically from backend
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

  // Components state
  const [groups, setGroups] = useState<ComponentGroup[]>([]);
  const [activeComponentCategory, setActiveComponentCategory] = useState<'Earning' | 'Deduction'>('Earning');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');

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

  // Fetch real database records on mount
  useEffect(() => {
    // 1. Fetch Departments
    apiClient.get('/settings/departments').then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const names = data.map((d: any) => d.name || d.department_name).filter(Boolean);
        if (names.length > 0) setAllDepartments([...new Set([...names, 'All Departments'])]);
      } else {
        setAllDepartments([]);
      }
    }).catch(() => { setAllDepartments([]); });

    // 2. Fetch Locations
    apiClient.get('/settings/locations').then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const names = data.map((l: any) => l.name || l.location_name).filter(Boolean);
        if (names.length > 0) setAllLocations([...new Set(names)]);
      } else {
        setAllLocations([]);
      }
    }).catch(() => { setAllLocations([]); });

    // 3. Fetch Designations / Grades
    apiClient.get('/settings/designations').then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const names = data.map((g: any) => g.name || g.designation_name || g.title).filter(Boolean);
        if (names.length > 0) setAllGrades([...new Set(names)]);
      } else {
        setAllGrades([]);
      }
    }).catch(() => { setAllGrades([]); });

    // 3. Fetch Cycles from DB
    apiClient.get('/payroll/cycles').then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const mappedCycles: PayrollCycleItem[] = data.map((c: any) => ({
          id: String(c.id || c.uuid),
          name: c.cycle_name || c.name || 'Monthly Payroll Cycle',
          isDailyWages: Boolean(c.is_daily_wages),
          frequency: c.frequency || (c.cycle_type === 'biweekly' ? 'Bi-Weekly' : 'Monthly'),
          startDate: c.start_date || 1,
          cutoffDay: c.cutoff_day || 25,
          monthOffset: c.month_offset || 'Current',
          disbursementDate: c.disbursement_date || 1,
          capAmount: c.cap_amount || 1000000,
          toleranceEnabled: c.tolerance_enabled ?? true,
          toleranceMinutes: c.tolerance_minutes || 15,
          isActive: c.status === 'open' || (c.is_active ?? true)
        }));
        setCycles(mappedCycles);
        if (mappedCycles.length > 0) {
          setSelectedCycleId(mappedCycles[0].id);
          setCycleForm(mappedCycles[0]);
        }
      } else {
        setCycles([]);
        setSelectedCycleId('');
      }
    }).catch(() => {
      setCycles([]);
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

    // 5. Fetch Components from DB
    apiClient.get('/payroll/components').then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const mappedComps: ComponentItem[] = data.map((c: any) => ({
          id: String(c.id || c.code),
          name: c.name,
          groupId: c.component_type === 'deduction' ? 'grp-ded' : 'grp-earn',
          type: c.calculation_type === 'percentage_of_basic' || c.calculation_type === 'formula' ? 'Derived' : 'Value',
          isNonCashable: false,
          basedOnAttendance: c.calculation_type === 'attendance_based',
          isActive: c.status !== 'inactive',
          amount: Number(c.amount || 0),
          formula: c.formula_expression || ''
        }));

        const dbGroups: ComponentGroup[] = [
          {
            id: 'grp-earn',
            name: 'Earnings Group',
            category: 'Earning',
            roundFormat: 'Round',
            groupFunction: 'Sum',
            configureOnProfile: true,
            displayOnProfile: true,
            isEditable: true,
            contributedBy: 'Employee',
            recalculateOnChange: true,
            groupForPayslip: 'Earnings',
            displayOrder: 1,
            disableArrear: false,
            displayTotalOnProcess: true,
            tdsSameMonth: true,
            isTaxable: true,
            isActive: true,
            components: mappedComps.filter(c => c.groupId === 'grp-earn')
          },
          {
            id: 'grp-ded',
            name: 'Deductions Group',
            category: 'Deduction',
            roundFormat: 'Round',
            groupFunction: 'Sum',
            configureOnProfile: true,
            displayOnProfile: true,
            isEditable: true,
            contributedBy: 'Employee',
            recalculateOnChange: true,
            groupForPayslip: 'Deductions',
            displayOrder: 2,
            disableArrear: false,
            displayTotalOnProcess: true,
            tdsSameMonth: false,
            isTaxable: false,
            isActive: true,
            components: mappedComps.filter(c => c.groupId === 'grp-ded')
          }
        ];
        setGroups(dbGroups);
        if (dbGroups.length > 0) {
          setSelectedGroupId(dbGroups[0].id);
          setGroupForm(dbGroups[0]);
          if (dbGroups[0].components.length > 0) {
            setSelectedComponentId(dbGroups[0].components[0].id);
            setCompForm(dbGroups[0].components[0]);
          }
        }
      }
    }).catch(() => {});
  }, []);


  // Sync selected cycle form
  const handleSelectCycle = (c: PayrollCycleItem) => {
    setSelectedCycleId(c.id);
    setCycleForm(c);
  };

  // Sync selected group form
  const handleSelectGroup = (g: ComponentGroup) => {
    setSelectedGroupId(g.id);
    setGroupForm(g);
    if (g.components.length > 0) {
      setSelectedComponentId(g.components[0].id);
      setCompForm(g.components[0]);
    }
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

  // Handlers with MySQL Persistence
  const handleSaveCycle = async () => {
    if (!cycleForm.name) {
      showToast.error('Validation Error', 'Please enter a valid Payroll Cycle Name');
      return;
    }
    const payload = {
      cycle_name: cycleForm.name,
      name: cycleForm.name,
      is_daily_wages: cycleForm.isDailyWages,
      daily_wages_include_paid_holidays: cycleForm.dailyWagesIncludePaidHolidays,
      daily_wages_include_week_off: cycleForm.dailyWagesIncludeWeekOff,
      frequency: cycleForm.frequency,
      start_date: cycleForm.startDate,
      cutoff_day: cycleForm.cutoffDay,
      month_offset: cycleForm.monthOffset,
      disbursement_date: cycleForm.disbursementDate,
      cap_amount: cycleForm.capAmount,
      tolerance_enabled: cycleForm.toleranceEnabled,
      tolerance_minutes: cycleForm.toleranceMinutes,
      is_active: cycleForm.isActive
    };

    try {
      const res = await apiClient.post('/payroll/cycles', payload);
      const saved = res.data?.data || {};
      const newId = String(saved.id || selectedCycleId || `cycle-${Date.now()}`);
      const updatedCycle: PayrollCycleItem = {
        ...cycleForm,
        id: newId
      } as PayrollCycleItem;

      setCycles(prev => {
        const exists = prev.some(c => c.id === newId || (selectedCycleId && c.id === selectedCycleId));
        if (exists) {
          return prev.map(c => (c.id === newId || c.id === selectedCycleId) ? updatedCycle : c);
        }
        return [...prev, updatedCycle];
      });
      setSelectedCycleId(newId);
      showToast.success('Saved to Database', `Payroll Cycle "${cycleForm.name}" saved to MySQL.`);
    } catch (err) {
      console.error(err);
      showToast.error('Save Error', 'Failed to save Payroll Cycle.');
    }
  };

  const handleSaveGroup = () => {
    if (!groupForm.name) {
      showToast.error('Validation Error', 'Group Name is required');
      return;
    }
    setGroups(prev => prev.map(g => g.id === selectedGroupId ? { ...g, ...groupForm } as ComponentGroup : g));
    showToast.success('Group Saved', `Component Group "${groupForm.name}" configuration saved.`);
  };

  const handleSaveComponent = () => {
    if (!compForm.name) {
      showToast.error('Validation Error', 'Component Name is required');
      return;
    }
    setGroups(prev => prev.map(g => {
      if (g.id === selectedGroupId) {
        const updatedComps = g.components.map(c => c.id === selectedComponentId ? { ...c, ...compForm } as ComponentItem : c);
        return { ...g, components: updatedComps };
      }
      return g;
    }));
    showToast.success('Component Saved', `Payroll Component "${compForm.name}" updated.`);
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
    if (!slabForm.selectedComponentIds || slabForm.selectedComponentIds.length === 0) {
      showToast.error('Validation Error', 'Select at least one Payroll Component');
      return;
    }
    const numericCycleId = slabForm.cycleId && !isNaN(Number(slabForm.cycleId)) ? Number(slabForm.cycleId) : (cycles.length > 0 && !isNaN(Number(cycles[0].id)) ? Number(cycles[0].id) : null);

    const payload = {
      name: slabForm.name,
      departments: slabForm.departments || [],
      grades: slabForm.grades || [],
      locations: slabForm.locations || [],
      minCtc: slabForm.minCtc || 0,
      maxCtc: slabForm.maxCtc || 10000000,
      selectedComponentIds: slabForm.selectedComponentIds || [],
      cycleId: numericCycleId,
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 text-foreground space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────────
          HEADER BAR
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-md shadow-indigo-500/20">
            <Sliders className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Payroll Master Settings</h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">Hoshi Architecture</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Configure Payroll Cycles, Component Groups, Derived Formulas, Attendance Sensitivity, and CTC Slabs.</p>
          </div>
        </div>

        {/* 1-2-3 Guided Step Tab Selector Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('cycles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'cycles'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">1</span>
            <Calendar className="w-4 h-4" />
            Step 1: Payroll Cycle
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'components'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">2</span>
            <Layers className="w-4 h-4" />
            Step 2: Payroll Component
          </button>
          <button
            onClick={() => setActiveTab('slabs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'slabs'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">3</span>
            <Calculator className="w-4 h-4" />
            Step 3: Payroll Slab
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: PAYROLL CYCLE MANAGEMENT (Hoshi Image 1)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'cycles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Cycles List */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <CardTitle className="text-sm font-bold">Payroll Cycle</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold">{cycles.length}</Badge>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {cycles.map(cycle => (
                  <div
                    key={cycle.id}
                    onClick={() => handleSelectCycle(cycle)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedCycleId === cycle.id
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-teal-600 shadow-md'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm flex items-center gap-2">
                        <span>{cycle.name}</span>
                      </div>
                      <Badge className={selectedCycleId === cycle.id ? 'bg-white/20 text-white border-none' : 'bg-slate-100 dark:bg-slate-800 text-xs'}>
                        {cycle.frequency}
                      </Badge>
                    </div>
                    <div className="text-xs opacity-90 mt-2 flex items-center justify-between">
                      <span>Cutoff: Day {cycle.cutoffDay}</span>
                      <span>Pay Day: {cycle.disbursementDate}</span>
                    </div>
                  </div>
                ))}

                <Button
                  onClick={() => {
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
                  }}
                  variant="outline"
                  className="w-full mt-2 border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-2 justify-center py-5"
                >
                  <Plus className="w-4 h-4" /> Add Payroll Cycle
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Add / Edit Form */}
          <div className="lg:col-span-8">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-500" />
                    {selectedCycleId ? 'Edit Payroll Cycle' : 'Add Payroll Cycle'}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Configure calculation start, cutoff days, and disbursement rules.</CardDescription>
                </div>
                {selectedCycleId && (
                  <Badge className={cycleForm.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}>
                    {cycleForm.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payroll Cycle Name <span className="text-red-500">*</span></label>
                    <Input
                      value={cycleForm.name || ''}
                      onChange={e => setCycleForm({ ...cycleForm, name: e.target.value })}
                      placeholder="e.g. Monthly Regular"
                      className="mt-1 text-sm font-semibold"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                      <span className="text-xs font-bold block">Daily wages</span>
                      <span className="text-[11px] text-muted-foreground">Enable for hourly or daily wage calculations</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cycleForm.isDailyWages || false}
                      onChange={e => setCycleForm({ ...cycleForm, isDailyWages: e.target.checked })}
                      className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                      <span className="text-xs font-bold block">Daily wages include paid holidays</span>
                      <span className="text-[11px] text-muted-foreground">Count public/national holidays as paid days</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={(cycleForm as any).dailyWagesIncludePaidHolidays || false}
                      onChange={e => setCycleForm({ ...cycleForm, dailyWagesIncludePaidHolidays: e.target.checked } as any)}
                      className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                      <span className="text-xs font-bold block">Daily wages include week off</span>
                      <span className="text-[11px] text-muted-foreground">Count weekly off days as paid days</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={(cycleForm as any).dailyWagesIncludeWeekOff || false}
                      onChange={e => setCycleForm({ ...cycleForm, dailyWagesIncludeWeekOff: e.target.checked } as any)}
                      className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payslip Frequency <span className="text-red-500">*</span></label>
                    <select
                      value={cycleForm.frequency || 'Monthly'}
                      onChange={e => setCycleForm({ ...cycleForm, frequency: e.target.value as any })}
                      className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background text-foreground rounded-lg p-2 text-sm font-semibold focus:outline-none"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Semi-Monthly">Semi-Monthly</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payroll Calculation Start Date <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={cycleForm.startDate || 1}
                        onChange={e => setCycleForm({ ...cycleForm, startDate: Number(e.target.value) })}
                        className="text-sm font-semibold"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">of every month</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">CutOff Days for Payroll Calculations <span className="text-red-500">*</span></label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={cycleForm.cutoffDay || 25}
                      onChange={e => setCycleForm({ ...cycleForm, cutoffDay: Number(e.target.value) })}
                      className="mt-1 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Month Offset</label>
                    <select
                      value={cycleForm.monthOffset || 'Current'}
                      onChange={e => setCycleForm({ ...cycleForm, monthOffset: e.target.value as any })}
                      className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background text-foreground rounded-lg p-2 text-sm font-semibold focus:outline-none"
                    >
                      <option value="Current">Current Month</option>
                      <option value="Previous">Previous Month</option>
                      <option value="Next">Next Month</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payroll Disbursement Date <span className="text-red-500">*</span></label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={cycleForm.disbursementDate || 1}
                      onChange={e => setCycleForm({ ...cycleForm, disbursementDate: Number(e.target.value) })}
                      placeholder="e.g. 1st of next month"
                      className="mt-1 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payroll Calculation Cap (₹)</label>
                    <Input
                      type="number"
                      value={cycleForm.capAmount || 1000000}
                      onChange={e => setCycleForm({ ...cycleForm, capAmount: Number(e.target.value) })}
                      className="mt-1 text-sm font-semibold"
                    />
                  </div>
                </div>

                {/* Tolerance Expansion */}
                <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold text-foreground">[+] Tolerance Settings</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cycleForm.toleranceEnabled || false}
                      onChange={e => setCycleForm({ ...cycleForm, toleranceEnabled: e.target.checked })}
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  {cycleForm.toleranceEnabled && (
                    <div className="flex items-center gap-3 pt-2">
                      <span className="text-xs text-muted-foreground">Attendance Grace Period:</span>
                      <Input
                        type="number"
                        value={cycleForm.toleranceMinutes || 15}
                        onChange={e => setCycleForm({ ...cycleForm, toleranceMinutes: Number(e.target.value) })}
                        className="w-24 text-xs font-bold"
                      />
                      <span className="text-xs text-muted-foreground">minutes</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Active</span>
                    <button
                      type="button"
                      onClick={() => setCycleForm({ ...cycleForm, isActive: true })}
                      className={`px-5 py-1.5 rounded text-xs font-bold transition-all border ${
                        cycleForm.isActive
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-background text-slate-500 border-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setCycleForm({ ...cycleForm, isActive: false })}
                      className={`px-5 py-1.5 rounded text-xs font-bold transition-all border ${
                        !cycleForm.isActive
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-background text-slate-500 border-slate-300 hover:border-rose-400'
                      }`}
                    >
                      No
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCycleId('');
                        setCycleForm({
                          name: '',
                          isDailyWages: false,
                          frequency: 'Monthly',
                          startDate: 1,
                          cutoffDay: 25,
                          monthOffset: 'Current',
                          disbursementDate: 1,
                          capAmount: 1000000,
                          toleranceEnabled: false,
                          toleranceMinutes: 15,
                          isActive: true
                        });
                      }}
                      className="text-xs font-bold border-slate-300 text-slate-600 gap-2"
                    >
                      ✕ Cancel
                    </Button>
                    <Button onClick={handleSaveCycle} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 px-6">
                      <Save className="w-4 h-4" /> + Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: PAYROLL COMPONENT ENGINE (Hoshi Images 2 & 3)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'components' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Earning/Deduction Groups & Components */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full mr-3">
                  <button
                    onClick={() => setActiveComponentCategory('Earning')}
                    className={`w-1/2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      activeComponentCategory === 'Earning'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Earning
                  </button>
                  <button
                    onClick={() => setActiveComponentCategory('Deduction')}
                    className={`w-1/2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      activeComponentCategory === 'Deduction'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Deduction
                  </button>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5" /> + Component Group
                </Button>
              </div>

              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                {groups
                  .filter(g => g.category === activeComponentCategory)
                  .map(group => (
                    <div key={group.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      {/* Group Header — teal gradient like Hoshi */}
                      <div
                        onClick={() => handleSelectGroup(group)}
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all ${
                          selectedGroupId === group.id
                            ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white'
                            : 'bg-gradient-to-r from-teal-700/90 to-teal-600/90 text-white hover:from-teal-600 hover:to-teal-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold tracking-wide">{group.name}</span>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border tracking-widest uppercase ${
                            activeComponentCategory === 'Earning'
                              ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100'
                              : 'bg-rose-400/20 border-rose-300/40 text-rose-100'
                          }`}>
                            {activeComponentCategory === 'Earning' ? 'E' : 'D'}
                            {' '}{group.name.replace(/\s+/g, '_').toUpperCase().slice(0, 12)}
                          </span>
                          <button
                            onClick={() => handleSelectGroup(group)}
                            className="p-1 rounded hover:bg-white/20 transition-colors"
                            title="Edit Group"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-white/80" />
                          </button>
                          <button
                            onClick={() => setShowAuditLog(true)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-white/15 hover:bg-white/25 transition-colors text-white border border-white/20"
                          >
                            <History className="w-3 h-3" /> Audit Log
                          </button>
                        </div>
                      </div>
                      {/* Component rows */}
                      <div>
                        {group.components.map(comp => (
                          <div
                            key={comp.id}
                            onClick={() => {
                              setSelectedGroupId(group.id);
                              setGroupForm(group);
                              handleSelectComponent(comp);
                            }}
                            className={`flex items-center justify-between px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-all ${
                              selectedComponentId === comp.id
                                ? 'bg-indigo-50 dark:bg-indigo-950/30 border-l-2 border-l-indigo-500'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <span className={`text-xs font-semibold ${
                              selectedComponentId === comp.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'
                            }`}>{comp.name}</span>
                            <Edit2 className="w-3 h-3 text-slate-400 hover:text-indigo-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Component Table + Formula Setting */}
          <div className="lg:col-span-7 space-y-5">

            {/* Component Table (Hoshi right panel — Name / Component Type / Based On Attendance / Active / Action) */}
            {selectedGroupId && (() => {
              const selectedGroup = groups.find(g => g.id === selectedGroupId);
              if (!selectedGroup) return null;
              return (
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
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
                        {selectedGroup.components.map(comp => (
                          <tr
                            key={comp.id}
                            className={`border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${
                              selectedComponentId === comp.id ? 'bg-indigo-50 dark:bg-indigo-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                            }`}
                            onClick={() => {
                              setSelectedGroupId(selectedGroup.id);
                              setGroupForm(selectedGroup);
                              handleSelectComponent(comp);
                            }}
                          >
                            <td className={`px-4 py-2.5 font-semibold ${ selectedComponentId === comp.id ? 'text-indigo-700' : '' }`}>{comp.name}</td>
                            <td className="px-4 py-2.5 uppercase font-bold text-slate-500">{comp.type}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                comp.basedOnAttendance ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                              }`}>{comp.basedOnAttendance ? 'Yes' : 'No'}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                comp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-500'
                              }`}>{comp.isActive ? 'Yes' : 'No'}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={e => { e.stopPropagation(); handleSelectComponent(comp); }}
                                  className="p-1 rounded hover:bg-indigo-100 text-indigo-600 transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); }}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400 transition-colors"
                                  title="Reset"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Formula Setting Card — matches Hoshi screenshot exactly */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span className="text-indigo-500 font-black">£</span> Formula Setting
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                {/* Component Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Component Name <span className="text-red-500">*</span></label>
                  <Input
                    value={compForm.name || ''}
                    onChange={e => setCompForm({ ...compForm, name: e.target.value })}
                    placeholder="e.g. Adjustment"
                    className="mt-1 text-sm font-semibold"
                  />
                </div>

                {/* Non-Cashable / Based On Attendance / Active — Yes/No button rows */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Non-Cashable Item */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Non-Cashable Item</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setCompForm({ ...compForm, isNonCashable: false })}
                        className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${
                          !compForm.isNonCashable ? 'bg-slate-700 text-white border-slate-700' : 'bg-background text-slate-500 border-slate-200 hover:border-slate-400'
                        }`}>No</button>
                      <button type="button" onClick={() => setCompForm({ ...compForm, isNonCashable: true })}
                        className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${
                          compForm.isNonCashable ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-background text-slate-500 border-slate-200 hover:border-indigo-400'
                        }`}>Yes</button>
                    </div>
                  </div>

                  {/* Based On Attendance */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Based On Attendance</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setCompForm({ ...compForm, basedOnAttendance: false })}
                        className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${
                          !compForm.basedOnAttendance ? 'bg-slate-700 text-white border-slate-700' : 'bg-background text-slate-500 border-slate-200 hover:border-slate-400'
                        }`}>No</button>
                      <button type="button" onClick={() => setCompForm({ ...compForm, basedOnAttendance: true })}
                        className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${
                          compForm.basedOnAttendance ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-background text-slate-500 border-slate-200 hover:border-indigo-400'
                        }`}>Yes</button>
                    </div>
                  </div>

                  {/* Active */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Active</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setCompForm({ ...compForm, isActive: false })}
                        className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${
                          !compForm.isActive ? 'bg-rose-500 text-white border-rose-500' : 'bg-background text-slate-500 border-slate-200 hover:border-rose-400'
                        }`}>No</button>
                      <button type="button" onClick={() => setCompForm({ ...compForm, isActive: true })}
                        className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${
                          compForm.isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-background text-slate-500 border-slate-200 hover:border-indigo-400'
                        }`}>Yes</button>
                    </div>
                  </div>
                </div>

                {/* Component Type — checkbox style like Hoshi */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Component Type <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-6 mt-2">
                    {(['Value', 'Derived', 'Module'] as const).map(t => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compForm.type === t}
                          onChange={() => setCompForm({ ...compForm, type: t })}
                          className="w-4 h-4 rounded accent-indigo-600"
                        />
                        <span className={`text-sm font-semibold ${ compForm.type === t ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400' }`}>{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={compForm.amount ?? 0}
                    onChange={e => setCompForm({ ...compForm, amount: Number(e.target.value) })}
                    className="mt-1 text-sm font-bold w-44"
                    placeholder="0.00"
                  />
                </div>

                {/* Derived formula if Derived type */}
                {compForm.type === 'Derived' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Derived Formula Expression</label>
                    <Input
                      value={compForm.formula || ''}
                      onChange={e => setCompForm({ ...compForm, formula: e.target.value })}
                      placeholder="e.g. CTC * 0.50 or BASIC * 0.40"
                      className="mt-1 text-xs font-mono font-bold bg-slate-900 text-emerald-400"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">Valid tokens: CTC, BASIC, HRA, GROSS, MIN(), MAX()</span>
                  </div>
                )}

                {/* Module sync if Module type */}
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
                      <option value="Timesheet">Project Timesheet Hours Sync</option>
                    </select>
                  </div>
                )}

                {/* Boundary Type (Min/Max) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Boundary Type (Min/Max)</label>
                  <select
                    className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background rounded-lg p-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value === 'range') setCompForm({ ...compForm, minBoundary: 0, maxBoundary: 100000 });
                      else setCompForm({ ...compForm, minBoundary: undefined, maxBoundary: undefined });
                    }}
                  >
                    <option value="">Choose</option>
                    <option value="range">Set Min / Max Boundary</option>
                    <option value="min">Min Only</option>
                    <option value="max">Max Only</option>
                  </select>
                  {(compForm.minBoundary !== undefined || compForm.maxBoundary !== undefined) && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500">Min Value (₹)</label>
                        <Input type="number" value={compForm.minBoundary ?? 0}
                          onChange={e => setCompForm({ ...compForm, minBoundary: Number(e.target.value) })}
                          className="mt-0.5 text-xs font-bold" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500">Max Value (₹)</label>
                        <Input type="number" value={compForm.maxBoundary ?? 0}
                          onChange={e => setCompForm({ ...compForm, maxBoundary: Number(e.target.value) })}
                          className="mt-0.5 text-xs font-bold" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Effective From Date + Effective To Date */}
                <div className="grid grid-cols-2 gap-4">
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

                {/* Condition Setting — collapsible */}
                <details className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <summary className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 list-none select-none">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" /> Condition Setting
                  </summary>
                  <div className="p-4 space-y-2">
                    <p className="text-[11px] text-muted-foreground">Define conditions under which this component is applied (e.g. only when employment_type = Regular).</p>
                    <Input placeholder="e.g. employment_type = 'Regular'" className="text-xs font-mono" />
                  </div>
                </details>

                {/* Employment Setting — collapsible */}
                <details className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <summary className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 list-none select-none">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" /> Employment Setting
                  </summary>
                  <div className="p-4 space-y-3">
                    <p className="text-[11px] text-muted-foreground">Restrict this component to specific employment types.</p>
                    <div className="flex flex-wrap gap-3">
                      {['Regular', 'Intern', 'Probation', 'Contract', 'All'].map(et => (
                        <label key={et} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" className="rounded accent-indigo-600" defaultChecked={et === 'All'} />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{et}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </details>

                {/* Update + Cancel buttons */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button onClick={handleSaveComponent} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 px-6">
                    <Save className="w-4 h-4" /> + Update
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCompForm({
                      name: '',
                      type: 'Value',
                      isNonCashable: false,
                      basedOnAttendance: false,
                      isActive: true,
                      amount: 0,
                      formula: '',
                      moduleSource: 'Overtime',
                      minBoundary: undefined,
                      maxBoundary: undefined,
                      groupId: selectedGroupId || ''
                    })}
                    className="text-xs font-bold border-rose-300 text-rose-600 hover:bg-rose-50"
                  >
                    ✕ Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                      {slab.isFromDb && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-teal-100 text-teal-700 border border-teal-300 tracking-wider">DB</span>
                      )}
                    </div>
                    <div className="text-xs opacity-90 mt-1 flex items-center justify-between gap-2">
                      <span className="truncate">Depts: {
                        slab.departments.includes('All Departments') || (allDepartments.length > 0 && slab.departments.length >= allDepartments.length)
                          ? 'All Departments (Company Wide)'
                          : `${slab.departments.slice(0, 2).join(', ')}${slab.departments.length > 2 ? '...' : ''}`
                      }</span>
                      <span className="shrink-0">₹{(slab.minCtc / 100000).toFixed(1)}L–{(slab.maxCtc / 100000).toFixed(1)}L</span>
                    </div>
                    {slab.employmentType && slab.employmentType !== 'Regular' && (
                      <div className="mt-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          slab.employmentType === 'Intern' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          slab.employmentType === 'Probation' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>{slab.employmentType}</span>
                      </div>
                    )}
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

                {/* Row 1: Slab Name + Employment Type + Active */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payroll Slab Name <span className="text-red-500">*</span></label>
                    <Input
                      value={slabForm.name || ''}
                      onChange={e => setSlabForm({ ...slabForm, name: e.target.value })}
                      placeholder="e.g. Engineering Senior Slab (L4-L6)"
                      className="mt-1 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Employment Type</label>
                    <select
                      value={(slabForm as any).employmentType || 'Regular'}
                      onChange={e => setSlabForm({ ...slabForm, employmentType: e.target.value } as any)}
                      className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background rounded-lg p-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Regular">Regular</option>
                      <option value="Intern">Intern</option>
                      <option value="Probation">Probation</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
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
                        type="number"
                        value={slabForm.minCtc || ''}
                        onChange={e => setSlabForm({ ...slabForm, minCtc: Number(e.target.value) })}
                        placeholder="e.g. 300000"
                        className="mt-0.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Max CTC (₹)</label>
                      <Input
                        type="number"
                        value={slabForm.maxCtc || ''}
                        onChange={e => setSlabForm({ ...slabForm, maxCtc: Number(e.target.value) })}
                        placeholder="e.g. 1800000"
                        className="mt-0.5 text-xs font-bold"
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

                {/* Payroll Components — full list with search + Select All */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payroll Component <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400">{slabForm.selectedComponentIds?.length || 0} selected</span>
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = FULL_PAYROLL_COMPONENTS.map(c => c.id);
                          const allSelected = allIds.every(id => slabForm.selectedComponentIds?.includes(id));
                          setSlabForm({ ...slabForm, selectedComponentIds: allSelected ? [] : allIds });
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        {FULL_PAYROLL_COMPONENTS.map(c => c.id).every(id => slabForm.selectedComponentIds?.includes(id)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>
                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="Search components..."
                      value={compSearch}
                      onChange={e => setCompSearch(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-background rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    {FULL_PAYROLL_COMPONENTS
                      .filter(c => c.name.toLowerCase().includes(compSearch.toLowerCase()))
                      .map(comp => {
                        const isChecked = slabForm.selectedComponentIds?.includes(comp.id);
                        return (
                          <label
                            key={comp.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 dark:bg-indigo-900/30 dark:border-indigo-700'
                                : 'bg-background border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                const current = slabForm.selectedComponentIds || [];
                                const next = e.target.checked ? [...current, comp.id] : current.filter(id => id !== comp.id);
                                setSlabForm({ ...slabForm, selectedComponentIds: next });
                              }}
                              className="rounded accent-indigo-600 shrink-0"
                            />
                            <span className="font-semibold truncate">{comp.name}</span>
                          </label>
                        );
                      })
                    }
                  </div>
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
    </div>
  );
};
