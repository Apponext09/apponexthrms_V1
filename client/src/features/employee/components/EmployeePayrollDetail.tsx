import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileText,
  Edit2,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  Lock,
  Banknote,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Eye
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { formatPayrollDate } from '@/lib/utils';
import type { Employee } from '@/types';

const extract = (res: any): any[] => {
  const p = res?.data?.data ?? res?.data;
  if (Array.isArray(p)) return p;
  if (p && typeof p === 'object') {
    if (Array.isArray(p.items)) return p.items;
    if (Array.isArray(p.data)) return p.data;
  }
  return [];
};

interface PayStructureRecord {
  id: string;
  slab: string;
  slabId?: string;
  cycleId?: string;
  cycleName?: string;
  effectiveFrom: string;
  arrearPayMonth?: string;
  status: 'Active' | 'Deleted';
  addedBy: string;
  addedOn: string;
  updateBy?: string;
  updateOn?: string;

  // Calculation Mode
  calcMode: 'salary_input' | 'component_based';
  salaryInput: number;

  // Earnings
  basic: number;
  hra: number;
  standardAllowance: number;
  mealAllowance: number;
  communicationAllowance: number;
  childrenEduAllowance: number;
  lta: number;
  specialAllowance: number;

  // Deductions
  esic: number;
  pt: number;
  pf: number;
  pfEmployer: number;

  // Totals
  gross: number;
  totalDeduction: number;
  netSalary: number;
  ctc: number;
  
  customComponents?: any;
  earningsBreakup?: any[];
  deductionsBreakup?: any[];
}

interface ComponentDef {
  id: string;
  name: string;
  type: string;
  formula: string;
  amount: number;
}

interface ComponentGroup {
  id: string;
  name: string;
  category: string;
  isEditable: boolean;
  components: ComponentDef[];
}

const mapStructureRecord = (s: any, activeSlabNameFallback: string): PayStructureRecord => {
  let customComps = {};
  try {
    customComps = typeof s.customComponents === 'string'
      ? JSON.parse(s.customComponents)
      : (typeof s.custom_components === 'string'
        ? JSON.parse(s.custom_components)
        : (s.customComponents || s.custom_components || {}));
  } catch {}

  let eb = [];
  try {
    const rawEB = s.earningsBreakup || s.earnings_breakup;
    eb = typeof rawEB === 'string' ? JSON.parse(rawEB) : (rawEB || []);
  } catch {}

  let db = [];
  try {
    const rawDB = s.deductionsBreakup || s.deductions_breakup;
    db = typeof rawDB === 'string' ? JSON.parse(rawDB) : (rawDB || []);
  } catch {}
  
  const savedInput = Number(s.salaryInput || s.salary_input || 0);
  const rawCtc = Number(s.ctc || s.annual_ctc || s.annualCtc || 0);
  const rawGross = Number(s.gross || s.gross_monthly || s.grossMonthly || 0);
  const rawNet = Number(s.netSalary || s.net_salary_monthly || s.net_take_home || s.netTakeHome || 0);

  const ctcVal = rawCtc > 0 ? rawCtc : (rawGross > 0 ? rawGross * 12 : (savedInput > 0 ? (savedInput < 50000 ? savedInput * 12 : savedInput) : 0));
  const grossVal = rawGross > 0 ? rawGross : (ctcVal > 0 ? Math.round(ctcVal / 12) : (savedInput > 0 ? (savedInput < 50000 ? savedInput : Math.round(savedInput / 12)) : 0));
  const netVal = rawNet > 0 ? rawNet : grossVal;

  const displaySalaryInput = savedInput > 0
    ? (savedInput < 50000 ? savedInput * 12 : savedInput)
    : (ctcVal > 0 ? ctcVal : (grossVal > 0 ? grossVal * 12 : 480000));

  const basicVal = Number(s.basic || s.basic_monthly || s.basicMonthly || (grossVal * 0.5));
  const hraVal = Number(s.hra || s.hra_monthly || s.hraMonthly || (basicVal * 0.4));
  const saVal = Number(s.specialAllowance || s.special_allowance_monthly || s.specialAllowanceMonthly || Math.max(0, grossVal - (basicVal + hraVal)));
  const pfVal = Number(s.pf || s.pf_deduction || s.pfDeduction || Math.min(1800, Math.round(basicVal * 0.12)));
  const ptVal = Number(s.pt || s.pt_deduction || s.ptDeduction || (grossVal > 15000 ? 200 : 0));
  const esiVal = Number(s.esic || s.esi_deduction || s.esiDeduction || (grossVal <= 21000 ? Math.round(grossVal * 0.0075) : 0));
  const totalDed = Number(s.totalDeduction || s.total_deductions || s.total_deductions_monthly || (pfVal + ptVal + esiVal));

  return {
    id: String(s.id),
    slab: s.slab || s.slabName || s.slab_name || s.structureName || s.structure_name || activeSlabNameFallback || 'Monthly Slab',
    slabId: s.slabId !== undefined ? String(s.slabId) : (s.slab_id !== undefined ? String(s.slab_id) : undefined),
    cycleId: s.cycleId !== undefined ? String(s.cycleId) : (s.cycle_id !== undefined ? String(s.cycle_id) : undefined),
    cycleName: s.cycleName || s.cycle_name || '',
    effectiveFrom: s.effectiveFrom || s.effective_from || new Date().toISOString().split('T')[0],
    arrearPayMonth: s.arrearPayMonth || s.arrear_pay_month || s.effective_from || '',
    status: s.status === 'Deleted' || s.is_active === false || s.isActive === false ? 'Deleted' : 'Active',
    addedBy: s.addedBy || s.added_by || 'Admin',
    addedOn: s.addedOn || s.added_on || new Date().toISOString().replace('T', ' ').substring(0, 19),
    updateBy: s.updateBy || s.updated_by || '',
    updateOn: s.updateOn || s.updated_on || '',
    calcMode: s.calcMode || s.calculation_mode || 'salary_input',
    salaryInput: displaySalaryInput,
    basic: basicVal,
    hra: hraVal,
    specialAllowance: saVal,
    standardAllowance: Number(s.standardAllowance || s.standard_allowance_monthly || 0),
    mealAllowance: Number(s.mealAllowance || s.meal_allowance_monthly || 0),
    communicationAllowance: Number(s.communicationAllowance || s.communication_allowance_monthly || 0),
    childrenEduAllowance: Number(s.childrenEduAllowance || s.children_edu_allowance_monthly || 0),
    lta: Number(s.lta || s.lta_monthly || 0),
    esic: esiVal,
    pt: ptVal,
    pf: pfVal,
    pfEmployer: Number(s.pfEmployer || s.pf_employer || pfVal),
    gross: grossVal,
    totalDeduction: totalDed,
    netSalary: netVal,
    ctc: ctcVal,
    customComponents: customComps,
    earningsBreakup: eb,
    deductionsBreakup: db
  };
};

interface EmployeePayrollDetailProps {
  employee: Employee;
}

export function EmployeePayrollDetail({ employee }: EmployeePayrollDetailProps) {
  const { user } = useAuthStore();
  const uAny = user as any;
  const userRole = (
    (Array.isArray(uAny?.roles) ? uAny.roles.join(' ') : uAny?.roles) ||
    uAny?.role?.code ||
    uAny?.role ||
    uAny?.accessRole ||
    ''
  ).toString().toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const isHR = userRole.includes('hr') && !isAdmin;
  const canEditPayroll = isAdmin && !isHR;

  // Pay Structure records
  const [payStructures, setPayStructures] = useState<PayStructureRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Slab Info
  const [allSlabs, setAllSlabs] = useState<any[]>([]);
  const [activeSlabName, setActiveSlabName] = useState<string>('');
  const [activeSlabId, setActiveSlabId] = useState<string>('');
  const [activeCycleId, setActiveCycleId] = useState<string>('');
  const [slabPfRate, setSlabPfRate] = useState<number>(12);
  const [slabComponentIds, setSlabComponentIds] = useState<string[]>([]);

  // Master Data
  const [allGroups, setAllGroups] = useState<ComponentGroup[]>([]);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayStructureRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<PayStructureRecord | null>(null);

  // Form Fields inside Modal
  const [salaryInput, setSalaryInput] = useState<string>('600000');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().slice(0, 10));
  const [arrearPayMonth, setArrearPayMonth] = useState<string>(new Date().toISOString().slice(0, 10));

  // Dynamic Component Values
  const [dynamicValues, setDynamicValues] = useState<Record<string, number>>({});

  // Calculations
  const [basic, setBasic] = useState('25000');
  const [hra, setHra] = useState('10000');
  const [specialAllowance, setSpecialAllowance] = useState('15000');
  const [pf, setPf] = useState('1800');
  const [pfEmployer, setPfEmployer] = useState('1800');
  const [pt, setPt] = useState('200');
  const [esic, setEsic] = useState('0');

  const loadPayrollData = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const empCompanyId = (employee as any).companyId || (employee as any).company_id;
      const slabsParams = empCompanyId ? { companyId: String(empCompanyId) } : undefined;

      const [groupsRes, compsRes, slabsRes, structRes] = await Promise.all([
        apiClient.get('/payroll/component-groups').catch(() => ({ data: [] })),
        apiClient.get('/payroll/component-definitions').catch(() => ({ data: [] })),
        apiClient.get('/payroll/slabs', { params: slabsParams }).catch(() => ({ data: [] })),
        apiClient.get(`/payroll/salary-structure?employee_id=${employee.id}`).catch(() => ({ data: [] }))
      ]);

      const rawGroups = extract(groupsRes);
      const rawComps = extract(compsRes);
      const slabsData = extract(slabsRes);
      const data = extract(structRes);

      setAllSlabs(slabsData);

      const mappedGroups: ComponentGroup[] = rawGroups.map((g: any) => {
        const groupComps = rawComps
          .filter((c: any) => String(c.groupId || c.group_id) === String(g.id))
          .filter((c: any) => {
            const cType = (c.componentType || c.component_type || c.type || '').toString().toLowerCase();
            // Module-sourced components are excluded from the profile component list
            // (their values flow in via PayrollService automatically)
            return cType !== 'module';
          })
          .map((c: any) => ({
            id: String(c.id),
            name: c.name || 'Component',
            type: (() => {
              const raw = (c.componentType || c.component_type || 'Value').toString();
              // Formula and Module both display as Derived in the employee profile
              if (raw === 'Formula' || raw === 'Module' || raw === 'module' || raw === 'formula') return 'Derived';
              return raw === 'Derived' ? 'Derived' : 'Value';
            })() as 'Value' | 'Derived',
            formula: c.formula || '',
            amount: Number(c.amount || 0)
          }));
        return {
          id: String(g.id),
          name: g.name || 'Group',
          category: g.category || 'Earning',
          isEditable: Boolean(g.isEditable ?? g.is_editable),
          components: groupComps
        };
      }).filter((g: ComponentGroup) => g.components.length > 0);
      setAllGroups(mappedGroups);

      // Resolve active slab
      const currentStructure = data[0];
      let resolvedSlabName = 'Standard Pay Slab';
      let resolvedSlabId = '';
      let resolvedCycleId = '';

      if (currentStructure) {
        resolvedSlabId = String(currentStructure.slabId || currentStructure.slab_id || '');
        const joinedSlabName = currentStructure.slabName || currentStructure.slab_name;
        const catalogSlab = slabsData.find((s: any) => String(s.id) === resolvedSlabId);
        resolvedSlabName = joinedSlabName || catalogSlab?.name || 'Standard Pay Slab';
        resolvedCycleId = String(currentStructure.cycleId || currentStructure.cycle_id || '');

        setActiveSlabId(resolvedSlabId);
        setActiveSlabName(resolvedSlabName);
        setActiveCycleId(resolvedCycleId);

        if (catalogSlab) {
          const rawPfRate = catalogSlab.pfRatePct ?? catalogSlab.pf_rate_pct;
          setSlabPfRate(Number(rawPfRate ?? 12));
          const rawComponentIds = catalogSlab.selectedComponentIds ?? catalogSlab.selected_component_ids;
          let comps: any[] = [];
          try {
            comps = typeof rawComponentIds === 'string' ? JSON.parse(rawComponentIds) : (rawComponentIds || []);
          } catch {}
          setSlabComponentIds(comps.map(String));
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        const mappedRecords: PayStructureRecord[] = data.map((s: any) => {
          const perRowSlabName = s.slabName || s.slab_name;
          const perRowSlabId = s.slabId || s.slab_id;
          const catalogSlabForRow = perRowSlabId
            ? slabsData.find((sl: any) => String(sl.id) === String(perRowSlabId))
            : null;
          const fallbackName = perRowSlabName || catalogSlabForRow?.name || resolvedSlabName;
          return mapStructureRecord(s, fallbackName);
        });

        const uniqueMap = new Map<string, PayStructureRecord>();
        mappedRecords.forEach(r => {
          const key = `${r.effectiveFrom}_${r.id}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, r);
          }
        });
        setPayStructures(Array.from(uniqueMap.values()));
      } else {
        setPayStructures([]);
      }
    } catch (err) {
      console.error('Error loading payroll data:', err);
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    loadPayrollData();
  }, [loadPayrollData]);

  // Helper for formatting CTC in Lakhs
  const formatLakhsRange = (min: number, max: number) => {
    if (min > 0 && max > 0) {
      const minL = (min / 100000).toFixed(min % 100000 === 0 ? 0 : 1);
      const maxL = (max / 100000).toFixed(max % 100000 === 0 ? 0 : 1);
      return `(₹${minL}L – ₹${maxL}L)`;
    } else if (min > 0) {
      return `(₹${(min / 100000).toFixed(0)}L+)`;
    }
    return '';
  };

  // Recalculate dynamic values when CTC or Slab changes
  const recalculateFromCTC = useCallback((ctcStr: string, customPfRate?: number) => {
    const rawVal = Number(ctcStr) || 0;
    const ctc = rawVal < 50000 && rawVal > 0 ? rawVal * 12 : rawVal;
    const monthlyGross = Math.round(ctc / 12);
    const pfRateToUse = customPfRate !== undefined ? customPfRate : slabPfRate;

    const b = Math.round(monthlyGross * 0.50);
    const h = Math.round(b * 0.40);
    const sa = Math.max(0, monthlyGross - (b + h));
    const pfVal = Math.round(Math.min(b, 15000) * (pfRateToUse / 100));
    const ptVal = monthlyGross > 15000 ? 200 : 0;
    const esiVal = monthlyGross <= 21000 ? Math.round(monthlyGross * 0.0075) : 0;

    setBasic(String(b));
    setHra(String(h));
    setSpecialAllowance(String(sa));
    setPf(String(pfVal));
    setPfEmployer(String(pfVal));
    setPt(String(ptVal));
    setEsic(String(esiVal));
  }, [slabPfRate]);

  const handleSalaryInputChange = (val: string) => {
    setSalaryInput(val);
    recalculateFromCTC(val);
  };

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    const empSlabId = (employee as any)?.salary_slab_id || (employee as any)?.salarySlabId;
    const defaultSlab = (empSlabId ? allSlabs.find(s => String(s.id) === String(empSlabId)) : null) || allSlabs[0];
    const defaultSlabId = defaultSlab ? String(defaultSlab.id) : '';
    const defaultSlabName = defaultSlab?.name || defaultSlab?.slab_name || 'Standard Pay Slab';
    const minCtc = Number(defaultSlab?.min_ctc ?? defaultSlab?.minCtc ?? 0);
    const pfRate = Number(defaultSlab?.pf_rate_pct ?? defaultSlab?.pfRatePct ?? 12);

    setActiveSlabId(defaultSlabId);
    setActiveSlabName(defaultSlabName);
    setSlabPfRate(pfRate);

    // Initial CTC from employee or slab min_ctc
    const empCtc = Number((employee as any)?.annual_ctc || (employee as any)?.annualCtc || ((employee as any)?.gross_salary ? (employee as any)?.gross_salary * 12 : 0));
    const initialCtc = empCtc > 0 ? empCtc : (minCtc > 0 ? minCtc : 600000);

    setSalaryInput(String(initialCtc));
    recalculateFromCTC(String(initialCtc), pfRate);
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setArrearPayMonth(new Date().toISOString().slice(0, 10));
    setModalOpen(true);
  };

  const handleOpenEditModal = (rec: PayStructureRecord) => {
    setEditingRecord(rec);
    const matchedSlab = allSlabs.find(s => String(s.id) === String(rec.slabId));
    setActiveSlabId(rec.slabId || (allSlabs[0]?.id ? String(allSlabs[0].id) : ''));
    setActiveSlabName(rec.slab || matchedSlab?.name || 'Standard Pay Slab');
    if (matchedSlab) {
      const pfRate = Number(matchedSlab.pf_rate_pct ?? matchedSlab.pfRatePct ?? 12);
      setSlabPfRate(pfRate);
    }
    setSalaryInput(String(rec.ctc || rec.gross * 12));
    setBasic(String(rec.basic));
    setHra(String(rec.hra));
    setSpecialAllowance(String(rec.specialAllowance));
    setPf(String(rec.pf));
    setPfEmployer(String(rec.pfEmployer));
    setPt(String(rec.pt));
    setEsic(String(rec.esic));
    setEffectiveFrom(rec.effectiveFrom);
    setArrearPayMonth(rec.arrearPayMonth || rec.effectiveFrom);
    setModalOpen(true);
  };

  const handleViewModal = (rec: PayStructureRecord) => {
    setViewRecord(rec);
    setViewModalOpen(true);
  };

  const handleDelete = async (rec: PayStructureRecord) => {
    if (!confirm(`Are you sure you want to remove the salary structure effective from ${formatPayrollDate(rec.effectiveFrom)}?`)) return;
    try {
      await apiClient.delete(`/payroll/salary-structure/${rec.id}`);
      showToast.success('Structure Deleted', 'Salary structure has been deactivated.');
      loadPayrollData();
    } catch (err: any) {
      showToast.error('Delete Failed', err?.message || 'Could not delete structure.');
    }
  };

  const handleSave = async () => {
    try {
      const ctcVal = Number(salaryInput) || 0;
      const annualCtc = ctcVal < 50000 && ctcVal > 0 ? ctcVal * 12 : ctcVal;
      const grossMonthly = Math.round(annualCtc / 12);
      const b = Number(basic) || Math.round(grossMonthly * 0.50);
      const h = Number(hra) || Math.round(b * 0.40);
      const sa = Number(specialAllowance) || Math.max(0, grossMonthly - (b + h));
      const pfVal = Number(pf) || Math.round(Math.min(b, 15000) * 0.12);
      const ptVal = Number(pt) || 200;
      const esiVal = Number(esic) || 0;
      const totalDed = pfVal + ptVal + esiVal;
      const netTakeHome = grossMonthly - totalDed;

      const earningsBreakup = [
        { component_id: 1, code: 'BASIC', name: 'Basic Salary', type: 'Derived', formula: '50% of CTC', amount: b },
        { component_id: 2, code: 'HRA', name: 'House Rent Allowance (HRA)', type: 'Derived', formula: '40% of Basic', amount: h },
        { component_id: 3, code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance', type: 'Derived', formula: 'CTC - (Basic + HRA + Other)', amount: sa }
      ];

      const deductionsBreakup = [
        { component_id: 9, code: 'PF', name: 'Employee Provident Fund (EPF)', type: 'Derived', formula: '12% of Basic (capped at 1800)', amount: pfVal },
        { component_id: 11, code: 'PT', name: 'Professional Tax', type: 'Value', formula: 'Fixed PT Slab', amount: ptVal },
        ...(esiVal > 0 ? [{ component_id: 10, code: 'ESIC', name: 'Employee State Insurance (ESIC)', type: 'Derived', amount: esiVal }] : [])
      ];

      const chosenSlab = allSlabs.find(s => String(s.id) === activeSlabId);
      const finalCycleId = chosenSlab?.cycle_id || (employee as any).cycleId || 12;

      const payload = {
        employee_id: employee.id,
        company_id: (employee as any).companyId || (employee as any).company_id || null,
        slab_id: activeSlabId ? Number(activeSlabId) : null,
        cycle_id: Number(finalCycleId),
        effective_from: effectiveFrom,
        arrear_pay_month: arrearPayMonth,
        annual_ctc: annualCtc,
        gross_monthly: grossMonthly,
        basic_monthly: b,
        hra_monthly: h,
        special_allowance_monthly: sa,
        total_deductions: totalDed,
        pf_deduction: pfVal,
        esi_deduction: esiVal,
        pt_deduction: ptVal,
        net_take_home: netTakeHome,
        earnings_breakup: earningsBreakup,
        deductions_breakup: deductionsBreakup
      };

      if (editingRecord) {
        await apiClient.put(`/payroll/salary-structure/${editingRecord.id}`, payload);
        showToast.success('Structure Updated', 'Employee salary structure updated successfully.');
      } else {
        await apiClient.post('/payroll/salary-structure', payload);
        showToast.success('Structure Created', 'New salary structure assigned to employee.');
      }

      setModalOpen(false);
      loadPayrollData();
    } catch (err: any) {
      showToast.error('Save Failed', err?.message || 'Could not save salary structure.');
    }
  };

  const numBasic = Number(basic) || 0;
  const numHra = Number(hra) || 0;
  const numSa = Number(specialAllowance) || 0;
  const grossCalculated = numBasic + numHra + numSa;
  const numPf = Number(pf) || 0;
  const numPt = Number(pt) || 0;
  const numEsic = Number(esic) || 0;
  const totalDeductionCalculated = numPf + numPt + numEsic;
  const netSalaryCalculated = Math.max(0, grossCalculated - totalDeductionCalculated);
  const annualCtcCalculated = grossCalculated * 12;

  return (
    <div className="space-y-4">
      {/* Main Container Card matching App Theme */}
      <Card className="border border-border/80 bg-card rounded-xl shadow-xs overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/20 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Payroll Structure & Compensation</h3>
              <p className="text-[11px] text-muted-foreground">Assigned salary slab, monthly gross, statutory deductions & net take-home</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPayrollData}
              className="text-xs font-semibold h-8 gap-1.5 border-border hover:bg-muted/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            {canEditPayroll ? (
              <Button
                onClick={handleOpenAddModal}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-8 gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Pay Structure
              </Button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Read-Only View</span>
              </div>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground border-b border-border/60 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3 w-24">Action</th>
                <th className="px-4 py-3">Slab Template</th>
                <th className="px-4 py-3 text-right">Annual CTC</th>
                <th className="px-4 py-3 text-right">Monthly Gross</th>
                <th className="px-4 py-3 text-right">Net Take-Home</th>
                <th className="px-4 py-3">Effective From</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading payroll structure...</span>
                    </div>
                  </td>
                </tr>
              ) : payStructures.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    <Banknote className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-semibold text-xs">No payroll structure records assigned yet.</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Click "Add Pay Structure" above to assign an active compensation package.</p>
                  </td>
                </tr>
              ) : (
                payStructures.map(rec => {
                  const ctcDisplay = rec.ctc || (rec.gross * 12);
                  return (
                    <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleViewModal(rec)}
                            title="View Full Breakdown"
                            className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {canEditPayroll && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(rec)}
                                title="Edit Pay Structure"
                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(rec)}
                                title="Delete Pay Structure"
                                className="p-1 rounded-md text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{rec.slab}</span>
                          {rec.cycleName && (
                            <Badge variant="outline" className="text-[9px] font-bold bg-muted/30">
                              {rec.cycleName}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{ctcDisplay.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        ₹{rec.gross.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary">
                        ₹{rec.netSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 font-medium text-muted-foreground">
                        {formatPayrollDate(rec.effectiveFrom)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            rec.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold text-[10px]'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold text-[10px]'
                          }
                        >
                          {rec.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL: Configure / Edit Pay Structure */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl w-[95vw] p-0 overflow-hidden bg-card text-card-foreground border border-border shadow-2xl rounded-2xl">
          <DialogHeader className="p-4 px-6 border-b border-border/60 bg-muted/20">
            <DialogTitle className="text-sm font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-primary" />
                {editingRecord ? 'Edit Employee Payroll Structure' : 'Assign New Payroll Structure'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Top Config Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-border/60">
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1.5">Salary Slab Band *</label>
                <select
                  value={activeSlabId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const chosen = allSlabs.find(s => String(s.id) === String(val));
                    if (chosen) {
                      setActiveSlabId(String(chosen.id));
                      setActiveSlabName(chosen.name || 'Standard Pay Slab');
                      const minCtc = Number(chosen.min_ctc ?? chosen.minCtc ?? 0);
                      const maxCtc = Number(chosen.max_ctc ?? chosen.maxCtc ?? 10000000);
                      const pfRate = Number(chosen.pf_rate_pct ?? chosen.pfRatePct ?? 12);
                      setSlabPfRate(pfRate);

                      const curVal = Number(salaryInput) || 0;
                      let newCtc = salaryInput;
                      if (minCtc > 0 && (curVal < minCtc || curVal > maxCtc || curVal === 600000)) {
                        newCtc = String(minCtc);
                        setSalaryInput(newCtc);
                      }
                      recalculateFromCTC(newCtc, pfRate);
                    }
                  }}
                  className="w-full h-9 border border-border bg-background text-foreground rounded-lg px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none"
                >
                  {allSlabs.map(s => {
                    const min = Number(s.min_ctc ?? s.minCtc ?? 0);
                    const max = Number(s.max_ctc ?? s.maxCtc ?? 0);
                    const rangeStr = formatLakhsRange(min, max);
                    return (
                      <option key={s.id} value={String(s.id)}>
                        {s.name || s.slab_name} {rangeStr}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1.5">Annual CTC Input (₹) *</label>
                <Input
                  type="number"
                  value={salaryInput}
                  onChange={(e) => handleSalaryInputChange(e.target.value)}
                  placeholder="e.g. 600000"
                  className="h-9 text-xs font-bold"
                />
                {(() => {
                  const selectedModalSlab = allSlabs.find(s => String(s.id) === String(activeSlabId));
                  const minCtc = Number(selectedModalSlab?.min_ctc ?? selectedModalSlab?.minCtc ?? 0);
                  const maxCtc = Number(selectedModalSlab?.max_ctc ?? selectedModalSlab?.maxCtc ?? 0);
                  const curVal = Number(salaryInput) || 0;
                  const isOutOfRange = maxCtc > 0 && (curVal < minCtc || curVal > maxCtc);

                  if (minCtc > 0) {
                    return (
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground font-medium">
                          Range: ₹{minCtc.toLocaleString('en-IN')} – ₹{maxCtc.toLocaleString('en-IN')}
                        </span>
                        {isOutOfRange && (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            ⚠️ Outside slab range
                          </span>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1.5">Effective From *</label>
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="h-9 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Earnings vs Deductions 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Earnings Column */}
              <div className="border border-border/70 rounded-xl overflow-hidden bg-card shadow-2xs">
                <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Earnings (Monthly)</span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                    ₹{grossCalculated.toLocaleString('en-IN')}
                  </Badge>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">Basic Salary (50% CTC)</label>
                    <Input
                      type="number"
                      value={basic}
                      onChange={(e) => setBasic(e.target.value)}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">House Rent Allowance (HRA 40% Basic)</label>
                    <Input
                      type="number"
                      value={hra}
                      onChange={(e) => setHra(e.target.value)}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">Special Allowance (Residual Balance)</label>
                    <Input
                      type="number"
                      value={specialAllowance}
                      onChange={(e) => setSpecialAllowance(e.target.value)}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="border border-border/70 rounded-xl overflow-hidden bg-card shadow-2xs">
                <div className="px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Deductions (Monthly)</span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">
                    ₹{totalDeductionCalculated.toLocaleString('en-IN')}
                  </Badge>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">Employee Provident Fund (EPF 12%)</label>
                    <Input
                      type="number"
                      value={pf}
                      onChange={(e) => setPf(e.target.value)}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">Professional Tax (PT)</label>
                    <Input
                      type="number"
                      value={pt}
                      onChange={(e) => setPt(e.target.value)}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-foreground block mb-1">ESIC Deduction</label>
                    <Input
                      type="number"
                      value={esic}
                      onChange={(e) => setEsic(e.target.value)}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Compensation Summary Card */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Monthly Take-Home</span>
                <span className="text-xl font-black text-primary">₹{netSalaryCalculated.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Gross Monthly</span>
                  <span className="text-sm font-bold text-foreground">₹{grossCalculated.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Total Deductions</span>
                  <span className="text-sm font-bold text-rose-600">₹{totalDeductionCalculated.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Annual CTC</span>
                  <span className="text-sm font-black text-emerald-600">₹{annualCtcCalculated.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="h-8 text-xs font-semibold">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground h-8 text-xs font-bold">
                {editingRecord ? 'Update Structure' : 'Save & Activate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW BREAKDOWN MODAL */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden bg-card text-card-foreground border border-border shadow-2xl rounded-2xl">
          <DialogHeader className="p-4 px-6 border-b border-border/60 bg-muted/20">
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Salary Structure Breakdown
            </DialogTitle>
          </DialogHeader>

          {viewRecord && (
            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-muted-foreground">Slab Name:</span>
                <span className="font-bold text-foreground">{viewRecord.slab}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-muted-foreground">Annual CTC:</span>
                <span className="font-bold text-emerald-600 text-sm">₹{viewRecord.ctc.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-muted-foreground">Basic Pay (Monthly):</span>
                <span className="font-semibold text-foreground">₹{viewRecord.basic.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-muted-foreground">HRA (Monthly):</span>
                <span className="font-semibold text-foreground">₹{viewRecord.hra.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-muted-foreground">Special Allowance:</span>
                <span className="font-semibold text-foreground">₹{viewRecord.specialAllowance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-muted-foreground">Monthly Deductions (PF/PT):</span>
                <span className="font-bold text-rose-600">₹{viewRecord.totalDeduction.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-foreground text-sm">Net Monthly In-Hand:</span>
                <span className="font-black text-primary text-base">₹{viewRecord.netSalary.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setViewModalOpen(false)} className="h-8 text-xs font-semibold">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
