import React, { useState } from 'react';
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
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface PayrollCycleItem {
  id: string;
  name: string;
  isDailyWages: boolean;
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
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL MOCK DATA (Hoshi HRMS Aligned)
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_CYCLES: PayrollCycleItem[] = [
  {
    id: 'cycle-1',
    name: 'Monthly Salaried Regular',
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
  },
  {
    id: 'cycle-2',
    name: 'Executive & Board Batch',
    isDailyWages: false,
    frequency: 'Monthly',
    startDate: 1,
    cutoffDay: 28,
    monthOffset: 'Current',
    disbursementDate: 30,
    capAmount: 5000000,
    toleranceEnabled: false,
    toleranceMinutes: 0,
    isActive: true
  },
  {
    id: 'cycle-3',
    name: 'Plant Daily Wages',
    isDailyWages: true,
    frequency: 'Weekly',
    startDate: 1,
    cutoffDay: 7,
    monthOffset: 'Current',
    disbursementDate: 8,
    capAmount: 100000,
    toleranceEnabled: true,
    toleranceMinutes: 30,
    isActive: false
  }
];

const INITIAL_GROUPS: ComponentGroup[] = [
  {
    id: 'grp-adj',
    name: 'Adjustment',
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
    isActive: true,
    components: [
      { id: 'c-adj-1', name: 'Adjustment', groupId: 'grp-adj', type: 'Value', isNonCashable: false, basedOnAttendance: false, isActive: true, amount: 0 },
      { id: 'c-adj-2', name: 'Conveyance Allowance', groupId: 'grp-adj', type: 'Value', isNonCashable: false, basedOnAttendance: false, isActive: false, amount: 1600 }
    ]
  },
  {
    id: 'grp-basic',
    name: 'Basic Pay',
    category: 'Earning',
    roundFormat: 'Round',
    groupFunction: 'Sum',
    configureOnProfile: true,
    displayOnProfile: true,
    isEditable: false,
    contributedBy: 'Employee',
    recalculateOnChange: true,
    groupForPayslip: 'Basic Earnings',
    displayOrder: 1,
    disableArrear: false,
    displayTotalOnProcess: true,
    tdsSameMonth: true,
    isTaxable: true,
    isActive: true,
    components: [
      { id: 'c-b-1', name: 'Basic Base', groupId: 'grp-basic', type: 'Value', isNonCashable: false, basedOnAttendance: true, isActive: true, amount: 25000 },
      { id: 'c-b-2', name: 'Basic 50% CTC Formula', groupId: 'grp-basic', type: 'Derived', formula: 'CTC * 0.50', isNonCashable: false, basedOnAttendance: true, isActive: true, amount: 0 }
    ]
  },
  {
    id: 'grp-hra',
    name: 'House Rent Allowance (HRA)',
    category: 'Earning',
    roundFormat: 'Round',
    groupFunction: 'Sum',
    configureOnProfile: true,
    displayOnProfile: true,
    isEditable: true,
    contributedBy: 'Employee',
    recalculateOnChange: true,
    groupForPayslip: 'Allowances',
    displayOrder: 2,
    disableArrear: false,
    displayTotalOnProcess: true,
    tdsSameMonth: true,
    isTaxable: true,
    isActive: true,
    components: [
      { id: 'c-hra-1', name: 'HRA Standard (50% Basic)', groupId: 'grp-hra', type: 'Derived', formula: 'BASIC * 0.50', isNonCashable: false, basedOnAttendance: true, isActive: true, amount: 0 }
    ]
  },
  {
    id: 'grp-pf',
    name: 'Provident Fund (PF)',
    category: 'Deduction',
    roundFormat: 'Round',
    groupFunction: 'Sum',
    configureOnProfile: true,
    displayOnProfile: true,
    isEditable: false,
    contributedBy: 'Employee',
    recalculateOnChange: true,
    groupForPayslip: 'Statutory Deductions',
    displayOrder: 20,
    disableArrear: false,
    displayTotalOnProcess: true,
    tdsSameMonth: false,
    isTaxable: false,
    isActive: true,
    components: [
      { id: 'c-pf-1', name: 'PF Employee Share (12%)', groupId: 'grp-pf', type: 'Derived', formula: 'MIN(BASIC, 15000) * 0.12', isNonCashable: false, basedOnAttendance: true, isActive: true, amount: 1800 }
    ]
  }
];

const INITIAL_SLABS: PayrollSlabItem[] = [
  {
    id: 'slab-1',
    name: 'ADMIN - CEO & CXO Tier',
    departments: ['Executive', 'Administration', 'IT'],
    grades: ['CXO', 'VP', 'Director'],
    locations: ['Airoli', 'Mumbai', 'Remote'],
    minCtc: 2500000,
    maxCtc: 10000000,
    selectedComponentIds: ['c-adj-1', 'c-b-1', 'c-b-2', 'c-hra-1', 'c-pf-1'],
    cycleId: 'cycle-2',
    isActive: true
  },
  {
    id: 'slab-2',
    name: 'Engineering & Operations Mid-Level',
    departments: ['Engineering', 'Product', 'Operations'],
    grades: ['L2', 'L3', 'Senior Manager'],
    locations: ['Airoli', 'Bangalore'],
    minCtc: 600000,
    maxCtc: 2500000,
    selectedComponentIds: ['c-adj-1', 'c-b-2', 'c-hra-1', 'c-pf-1'],
    cycleId: 'cycle-1',
    isActive: true
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const PayrollSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cycles' | 'components' | 'slabs'>('cycles');

  // Cycles state
  const [cycles, setCycles] = useState<PayrollCycleItem[]>(INITIAL_CYCLES);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('cycle-1');
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
  const [groups, setGroups] = useState<ComponentGroup[]>(INITIAL_GROUPS);
  const [activeComponentCategory, setActiveComponentCategory] = useState<'Earning' | 'Deduction'>('Earning');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('grp-adj');
  const [selectedComponentId, setSelectedComponentId] = useState<string>('c-adj-1');

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
  const [slabs, setSlabs] = useState<PayrollSlabItem[]>(INITIAL_SLABS);
  const [selectedSlabId, setSelectedSlabId] = useState<string>('slab-1');
  const [slabForm, setSlabForm] = useState<Partial<PayrollSlabItem>>({
    name: '',
    departments: ['Engineering'],
    grades: ['L1'],
    locations: ['Airoli'],
    minCtc: 300000,
    maxCtc: 1500000,
    selectedComponentIds: ['c-b-2', 'c-hra-1', 'c-pf-1'],
    cycleId: 'cycle-1',
    isActive: true
  });

  // Audit Log Drawer / Modal
  const [showAuditLog, setShowAuditLog] = useState(false);

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

  // Handlers
  const handleSaveCycle = () => {
    if (!cycleForm.name) {
      showToast.error('Validation Error', 'Please enter a valid Payroll Cycle Name');
      return;
    }
    if (selectedCycleId) {
      setCycles(prev => prev.map(c => c.id === selectedCycleId ? { ...c, ...cycleForm } as PayrollCycleItem : c));
      showToast.success('Cycle Updated', `Payroll Cycle "${cycleForm.name}" updated successfully.`);
    } else {
      const newId = `cycle-${Date.now()}`;
      const newCycle = { ...cycleForm, id: newId } as PayrollCycleItem;
      setCycles(prev => [...prev, newCycle]);
      setSelectedCycleId(newId);
      showToast.success('Cycle Created', `New Payroll Cycle "${cycleForm.name}" created.`);
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

  const handleSaveSlab = () => {
    if (!slabForm.name) {
      showToast.error('Validation Error', 'Payroll Slab Name is required');
      return;
    }
    setSlabs(prev => prev.map(s => s.id === selectedSlabId ? { ...s, ...slabForm } as PayrollSlabItem : s));
    showToast.success('Slab Saved', `Payroll Slab "${slabForm.name}" configuration saved.`);
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

        {/* Tab Selector Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('cycles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'cycles'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Payroll Cycle
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'components'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-4 h-4" />
            Payroll Component
          </button>
          <button
            onClick={() => setActiveTab('slabs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'slabs'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Payroll Slab
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
                      <span className="text-xs font-bold block">Daily Wages Worker</span>
                      <span className="text-[11px] text-muted-foreground">Enable for hourly or daily wage calculations</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cycleForm.isDailyWages || false}
                      onChange={e => setCycleForm({ ...cycleForm, isDailyWages: e.target.checked })}
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
                    <span className="text-xs font-bold">Active Status:</span>
                    <button
                      onClick={() => setCycleForm({ ...cycleForm, isActive: !cycleForm.isActive })}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                        cycleForm.isActive ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {cycleForm.isActive ? 'Active (Yes)' : 'Inactive (No)'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button onClick={handleSaveCycle} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 px-6">
                      <Save className="w-4 h-4" /> Save Cycle
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
                  <Plus className="w-3.5 h-3.5" /> + Group
                </Button>
              </div>

              <CardContent className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {groups
                  .filter(g => g.category === activeComponentCategory)
                  .map(group => (
                    <div
                      key={group.id}
                      className={`border rounded-xl p-4 transition-all ${
                        selectedGroupId === group.id
                          ? 'border-teal-500 bg-teal-50/20 dark:bg-teal-950/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div
                        onClick={() => handleSelectGroup(group)}
                        className="flex items-center justify-between cursor-pointer border-b border-slate-100 dark:border-slate-800 pb-2 mb-3"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-500" />
                          <span className="font-bold text-sm text-foreground">{group.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{group.components.length} Components</Badge>
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setShowAuditLog(true); }} className="h-7 w-7 text-xs">
                            <History className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Component List inside Group */}
                      <div className="space-y-1.5 pl-2">
                        {group.components.map(comp => (
                          <div
                            key={comp.id}
                            onClick={() => {
                              setSelectedGroupId(group.id);
                              setGroupForm(group);
                              handleSelectComponent(comp);
                            }}
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                              selectedComponentId === comp.id
                                ? 'bg-indigo-600 text-white font-bold border-indigo-700 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{comp.name}</span>
                              {comp.basedOnAttendance && (
                                <Badge className={selectedComponentId === comp.id ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}>
                                  LOP
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] opacity-80 uppercase">{comp.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Group & Component Configuration Form (Hoshi Image 2 & 3) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Group Configuration Card */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  Earning Group Configuration ({groupForm.name})
                </CardTitle>
                <Button size="sm" onClick={handleSaveGroup} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1">
                  <Save className="w-3.5 h-3.5" /> Save Group
                </Button>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold">Group Name <span className="text-red-500">*</span></label>
                    <Input
                      value={groupForm.name || ''}
                      onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                      className="mt-1 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold">Round Format <span className="text-red-500">*</span></label>
                    <select
                      value={groupForm.roundFormat || 'Round'}
                      onChange={e => setGroupForm({ ...groupForm, roundFormat: e.target.value as any })}
                      className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background rounded-lg p-2 text-xs font-semibold"
                    >
                      <option value="Round">Round</option>
                      <option value="Round Up">Round Up</option>
                      <option value="Round Down">Round Down</option>
                      <option value="Nearest Integer">Nearest Integer</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold">Group Function <span className="text-red-500">*</span></label>
                    <select
                      value={groupForm.groupFunction || 'Sum'}
                      onChange={e => setGroupForm({ ...groupForm, groupFunction: e.target.value as any })}
                      className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background rounded-lg p-2 text-xs font-semibold"
                    >
                      <option value="Sum">Sum</option>
                      <option value="Max">Max</option>
                      <option value="Min">Min</option>
                      <option value="Custom">Custom Formula</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold">Contributed By <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setGroupForm({ ...groupForm, contributedBy: 'Employee' })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          groupForm.contributedBy === 'Employee' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-background text-slate-700'
                        }`}
                      >
                        Employee
                      </button>
                      <button
                        type="button"
                        onClick={() => setGroupForm({ ...groupForm, contributedBy: 'Employer' })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          groupForm.contributedBy === 'Employer' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-background text-slate-700'
                        }`}
                      >
                        Employer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Group Rule Toggles Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between">
                    <span className="text-[11px] font-bold">Taxable</span>
                    <button
                      onClick={() => setGroupForm({ ...groupForm, isTaxable: !groupForm.isTaxable })}
                      className={`mt-2 py-1 px-2 rounded text-[10px] font-bold ${groupForm.isTaxable ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {groupForm.isTaxable ? 'Yes' : 'No'}
                    </button>
                  </div>

                  <div className="p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between">
                    <span className="text-[11px] font-bold">Is Editable</span>
                    <button
                      onClick={() => setGroupForm({ ...groupForm, isEditable: !groupForm.isEditable })}
                      className={`mt-2 py-1 px-2 rounded text-[10px] font-bold ${groupForm.isEditable ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {groupForm.isEditable ? 'Yes' : 'No'}
                    </button>
                  </div>

                  <div className="p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between">
                    <span className="text-[11px] font-bold">Disable Arrear</span>
                    <button
                      onClick={() => setGroupForm({ ...groupForm, disableArrear: !groupForm.disableArrear })}
                      className={`mt-2 py-1 px-2 rounded text-[10px] font-bold ${groupForm.disableArrear ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {groupForm.disableArrear ? 'Yes' : 'No'}
                    </button>
                  </div>

                  <div className="p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between">
                    <span className="text-[11px] font-bold">Recalculate On Change</span>
                    <button
                      onClick={() => setGroupForm({ ...groupForm, recalculateOnChange: !groupForm.recalculateOnChange })}
                      className={`mt-2 py-1 px-2 rounded text-[10px] font-bold ${groupForm.recalculateOnChange ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {groupForm.recalculateOnChange ? 'Yes' : 'No'}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Component Level & Formula Setting Card (Hoshi Image 2) */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-500" />
                  Formula & Component Setting ({compForm.name})
                </CardTitle>
                <Button size="sm" onClick={handleSaveComponent} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1">
                  <Save className="w-3.5 h-3.5" /> Save Component
                </Button>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold">Component Name <span className="text-red-500">*</span></label>
                    <Input
                      value={compForm.name || ''}
                      onChange={e => setCompForm({ ...compForm, name: e.target.value })}
                      className="mt-1 text-xs font-semibold"
                    />
                  </div>

                  <div className="p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between">
                    <span className="text-[11px] font-bold">Non-Cashable Item</span>
                    <button
                      type="button"
                      onClick={() => setCompForm({ ...compForm, isNonCashable: !compForm.isNonCashable })}
                      className={`mt-1 py-1 px-2 rounded text-[10px] font-bold ${compForm.isNonCashable ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {compForm.isNonCashable ? 'Yes' : 'No'}
                    </button>
                  </div>

                  <div className="p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between">
                    <span className="text-[11px] font-bold">Based On Attendance (LOP)</span>
                    <button
                      type="button"
                      onClick={() => setCompForm({ ...compForm, basedOnAttendance: !compForm.basedOnAttendance })}
                      className={`mt-1 py-1 px-2 rounded text-[10px] font-bold ${compForm.basedOnAttendance ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {compForm.basedOnAttendance ? 'Yes' : 'No'}
                    </button>
                  </div>
                </div>

                {/* Component Type Selector (Value vs Derived vs Module) */}
                <div>
                  <label className="text-xs font-bold">Component Calculation Type <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-3 gap-3 mt-1.5">
                    {(['Value', 'Derived', 'Module'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCompForm({ ...compForm, type: t })}
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                          compForm.type === t
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                            : 'bg-background hover:bg-slate-50 border-slate-200 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {t === 'Value' && <DollarSign className="w-4 h-4" />}
                        {t === 'Derived' && <Percent className="w-4 h-4" />}
                        {t === 'Module' && <Layers className="w-4 h-4" />}
                        <span>{t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Fields based on Type */}
                {compForm.type === 'Value' && (
                  <div>
                    <label className="text-xs font-bold">Fixed Base Amount (₹)</label>
                    <Input
                      type="number"
                      value={compForm.amount || 0}
                      onChange={e => setCompForm({ ...compForm, amount: Number(e.target.value) })}
                      className="mt-1 text-xs font-bold"
                    />
                  </div>
                )}

                {compForm.type === 'Derived' && (
                  <div>
                    <label className="text-xs font-bold">Derived Formula Expression</label>
                    <Input
                      value={compForm.formula || ''}
                      onChange={e => setCompForm({ ...compForm, formula: e.target.value })}
                      placeholder="e.g. CTC * 0.50 or BASIC * 0.40"
                      className="mt-1 text-xs font-mono font-bold bg-slate-900 text-emerald-400"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">Valid tokens: CTC, BASIC, HRA, GROSS, MIN(), MAX()</span>
                  </div>
                )}

                {compForm.type === 'Module' && (
                  <div>
                    <label className="text-xs font-bold">Module Integration Sync Source</label>
                    <select
                      value={compForm.moduleSource || 'Overtime'}
                      onChange={e => setCompForm({ ...compForm, moduleSource: e.target.value })}
                      className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background rounded-lg p-2 text-xs font-bold"
                    >
                      <option value="Overtime">Overtime Module (OT Rate x Hours)</option>
                      <option value="Loan">Loan Module (EMI Deduction Sync)</option>
                      <option value="Expense">Expense & Travel Claims Sync</option>
                      <option value="Timesheet">Project Timesheet Hours Sync</option>
                    </select>
                  </div>
                )}
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
                    <div className="font-bold text-sm">{slab.name}</div>
                    <div className="text-xs opacity-90 mt-1 flex items-center justify-between">
                      <span>Depts: {slab.departments.join(', ')}</span>
                      <span>₹{(slab.minCtc / 100000).toFixed(1)}L - ₹{(slab.maxCtc / 100000).toFixed(1)}L</span>
                    </div>
                  </div>
                ))}

                <Button
                  onClick={() => {
                    setSelectedSlabId('');
                    setSlabForm({
                      name: 'New Payroll Slab',
                      departments: ['Engineering'],
                      grades: ['L1'],
                      locations: ['Airoli'],
                      minCtc: 300000,
                      maxCtc: 1500000,
                      selectedComponentIds: ['c-b-2', 'c-hra-1', 'c-pf-1'],
                      cycleId: 'cycle-1',
                      isActive: true
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

              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold">Payroll Slab Name <span className="text-red-500">*</span></label>
                    <Input
                      value={slabForm.name || ''}
                      onChange={e => setSlabForm({ ...slabForm, name: e.target.value })}
                      placeholder="e.g. ADMIN - CEO"
                      className="mt-1 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold">Payroll Cycle Link <span className="text-red-500">*</span></label>
                    <select
                      value={slabForm.cycleId || 'cycle-1'}
                      onChange={e => setSlabForm({ ...slabForm, cycleId: e.target.value })}
                      className="w-full mt-1 border border-slate-200 dark:border-slate-800 bg-background rounded-lg p-2 text-sm font-semibold"
                    >
                      {cycles.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.frequency})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filters: Department, Grade, Location */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
                  <div>
                    <label className="text-xs font-bold block mb-1.5">Department Filter</label>
                    <div className="space-y-1 max-h-28 overflow-y-auto border rounded-lg p-2 bg-background text-xs">
                      {['Executive', 'Administration', 'Engineering', 'Product', 'Sales', 'HR', 'Finance'].map(dept => (
                        <label key={dept} className="flex items-center gap-2 cursor-pointer font-medium">
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
                          <span>{dept}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1.5">Job Grade Filter</label>
                    <div className="space-y-1 max-h-28 overflow-y-auto border rounded-lg p-2 bg-background text-xs">
                      {['CXO', 'VP', 'Director', 'Senior Manager', 'L3', 'L2', 'L1'].map(grade => (
                        <label key={grade} className="flex items-center gap-2 cursor-pointer font-medium">
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
                          <span>{grade}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1.5">Location Filter</label>
                    <div className="space-y-1 max-h-28 overflow-y-auto border rounded-lg p-2 bg-background text-xs">
                      {['Airoli', 'Mumbai', 'Bangalore', 'Remote', 'Delhi'].map(loc => (
                        <label key={loc} className="flex items-center gap-2 cursor-pointer font-medium">
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
                          <span>{loc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTC Slider Section (Hoshi Image 4) */}
                <div className="space-y-3 p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>CTC Range Selector</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono">₹{(slabForm.minCtc || 0).toLocaleString('en-IN')} - ₹{(slabForm.maxCtc || 10000000).toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="100000"
                    max="10000000"
                    step="100000"
                    value={slabForm.maxCtc || 2500000}
                    onChange={e => setSlabForm({ ...slabForm, maxCtc: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* Component Selector Section (Hoshi Image 4) */}
                <div>
                  <label className="text-xs font-bold block mb-2">Included Payroll Components</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-3 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    {groups.flatMap(g => g.components).map(comp => (
                      <label key={comp.id} className="flex items-center gap-2 p-2 rounded-lg bg-background border text-xs cursor-pointer hover:border-indigo-400">
                        <input
                          type="checkbox"
                          checked={slabForm.selectedComponentIds?.includes(comp.id)}
                          onChange={e => {
                            const current = slabForm.selectedComponentIds || [];
                            const next = e.target.checked ? [...current, comp.id] : current.filter(id => id !== comp.id);
                            setSlabForm({ ...slabForm, selectedComponentIds: next });
                          }}
                          className="rounded accent-indigo-600"
                        />
                        <span className="font-semibold">{comp.name}</span>
                      </label>
                    ))}
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
