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
  Eye,
  ChevronDown,
  ChevronUp,
  Wallet,
  Calculator,
  TrendingUp,
  AlertCircle,
  ShieldCheck
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
    : (ctcVal > 0 ? ctcVal : (grossVal > 0 ? grossVal * 12 : 0));

  const basicVal = Number(s.basic || s.basic_monthly || s.basicMonthly || (grossVal * 0.5));
  const hraVal = Number(s.hra || s.hra_monthly || s.hraMonthly || (basicVal * 0.4));
  const saVal = Number(s.specialAllowance || s.special_allowance_monthly || s.specialAllowanceMonthly || Math.max(0, grossVal - (basicVal + hraVal)));
  const pfVal = Number(s.pf || s.pf_deduction || s.pfDeduction || Math.min(1800, Math.round(basicVal * 0.12)));
  const ptVal = Number(s.pt || s.pt_deduction || s.ptDeduction || (grossVal > 15000 ? 200 : 0));
  const esiVal = Number(s.esic || s.esi_deduction || s.esiDeduction || (grossVal <= 21000 ? Math.round(grossVal * 0.0075) : 0));
  const totalDed = Number(s.totalDeduction || s.total_deductions || s.total_deductions_monthly || (pfVal + ptVal + esiVal));

  return {
    id: String(s.id),
    slab: s.slabName || s.slab_name || s.slab || (s.structure_name && !['simple', 'CL', 'start', 'Senior SDE'].includes(s.structure_name) && !s.structure_name.startsWith('Structure for') ? s.structure_name : '') || activeSlabNameFallback || 'Monthly',
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
  const [allCycles, setAllCycles] = useState<any[]>([]);
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
  const [inputFrequency, setInputFrequency] = useState<'annual' | 'monthly'>('annual');
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().slice(0, 10));
  const [arrearPayMonth, setArrearPayMonth] = useState<string>(new Date().toISOString().slice(0, 10));

  // Dynamic Component Definitions & Modal Items
  const [allComponentDefs, setAllComponentDefs] = useState<any[]>([]);
  const [modalEarnings, setModalEarnings] = useState<Array<{ id: string | number; name: string; category: string; type: string; formula: string; amount: number; basedOnAttendance?: boolean }>>([]);
  const [modalDeductions, setModalDeductions] = useState<Array<{ id: string | number; name: string; category: string; type: string; formula: string; amount: number; basedOnAttendance?: boolean }>>([]);
  const [showExtraEarnings, setShowExtraEarnings] = useState(false);
  const [showExtraDeductions, setShowExtraDeductions] = useState(false);

  // Dynamic Component Values
  const [dynamicValues, setDynamicValues] = useState<Record<string, number>>({});

  const loadPayrollData = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const empCompanyId = (employee as any).companyId || (employee as any).company_id;
      const slabsParams = empCompanyId ? { companyId: String(empCompanyId) } : undefined;

      const [groupsRes, compsRes, slabsRes, structRes, cyclesRes] = await Promise.all([
        apiClient.get('/payroll/component-groups').catch(() => ({ data: [] })),
        apiClient.get('/payroll/component-definitions').catch(() => ({ data: [] })),
        apiClient.get('/payroll/slabs', { params: slabsParams }).catch(() => ({ data: [] })),
        apiClient.get(`/payroll/salary-structure?employee_id=${employee.id}`).catch(() => ({ data: [] })),
        apiClient.get('/payroll/cycles').catch(() => ({ data: [] }))
      ]);

      const rawGroups = extract(groupsRes);
      const rawComps = extract(compsRes);
      const slabsData = extract(slabsRes);
      const data = extract(structRes);
      const cyclesData = extract(cyclesRes);

      setAllComponentDefs(rawComps);
      setAllSlabs(slabsData);
      setAllCycles(cyclesData);

      const mappedGroups: ComponentGroup[] = rawGroups.map((g: any) => {
        const groupComps = rawComps
          .filter((c: any) => String(c.groupId || c.group_id) === String(g.id))
          .filter((c: any) => {
            const cType = (c.componentType || c.component_type || c.type || '').toString().toLowerCase();
            return cType !== 'module';
          })
          .map((c: any) => ({
            id: String(c.id),
            name: c.name || 'Component',
            type: (() => {
              const raw = (c.componentType || c.component_type || 'Value').toString();
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

      // Resolve active slab (prioritize existing structure, then employee's assigned slab from onboarding, then first slab)
      const currentStructure = data[0];
      const empSlabId = (employee as any)?.salary_slab_id || (employee as any)?.salarySlabId;
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
      } else if (empSlabId) {
        const catalogSlab = slabsData.find((s: any) => String(s.id) === String(empSlabId));
        if (catalogSlab) {
          resolvedSlabId = String(catalogSlab.id);
          resolvedSlabName = catalogSlab.name || catalogSlab.slab_name || 'Standard Pay Slab';
          setActiveSlabId(resolvedSlabId);
          setActiveSlabName(resolvedSlabName);
          const rawComponentIds = catalogSlab.selectedComponentIds ?? catalogSlab.selected_component_ids;
          let comps: any[] = [];
          try {
            comps = typeof rawComponentIds === 'string' ? JSON.parse(rawComponentIds) : (rawComponentIds || []);
          } catch {}
          setSlabComponentIds(comps.map(String));
        }
      } else if (slabsData.length > 0) {
        resolvedSlabId = String(slabsData[0].id);
        resolvedSlabName = slabsData[0].name || slabsData[0].slab_name || 'Standard Pay Slab';
        setActiveSlabId(resolvedSlabId);
        setActiveSlabName(resolvedSlabName);
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

  // Universal client-side formula evaluator with complete Math function & context binding support
  const evaluateFormula = (formulaStr: string, ctx: Record<string, number>): number => {
    if (!formulaStr || !formulaStr.trim()) return 0;
    let expr = formulaStr.toLowerCase().trim();

    // 0. Pre-process bracket notation: e.g. [CTC / 12], [ALLOWANCE * 100 / CTC], [50 % ctc], [CTC], [Basic]
    expr = expr.replace(/\[\s*([0-9.]+)\s*%\s*(?:of\s*)?([a-z_]+)\s*\]/gi, '($2 * ($1 / 100))');
    expr = expr.replace(/\[\s*([^\]]+?)\s*\]/g, (_, innerKey) => {
      if (/[\+\-\*\/%^]/.test(innerKey)) {
        return `(${innerKey})`;
      }
      const k = innerKey.toLowerCase().trim().replace(/[\s\-_]+/g, '_');
      if (ctx[k] !== undefined) return String(ctx[k]);
      if (k === 'basic' || k === 'basic_salary') return String(ctx['basic'] || 0);
      if (k === 'hra' || k === 'house_rent' || k === 'house_rent_allowance') return String(ctx['hra'] || 0);
      if (k === 'gross' || k === 'ctc' || k === 'gross_salary' || k === 'monthly_ctc') return String(ctx['gross'] || ctx['ctc'] || 0);
      return innerKey;
    });

    // 1. Handle inline conditionals: e.g. "0.75% of Gross (if Gross <= 21000)" or "if gross <= 21000"
    if (expr.includes('if')) {
      const ifMatch = expr.match(/\(?\s*if\s+([a-z_]+)\s*(<=|>=|<|>|==|=)\s*([0-9.]+)\s*\)?/i);
      if (ifMatch) {
        const varName = ifMatch[1].toLowerCase();
        const op = ifMatch[2];
        const threshold = Number(ifMatch[3]);
        const varVal = ctx[varName] ?? ctx['gross'] ?? 0;
        let condPassed = false;
        if (op === '<=') condPassed = varVal <= threshold;
        else if (op === '>=') condPassed = varVal >= threshold;
        else if (op === '<') condPassed = varVal < threshold;
        else if (op === '>') condPassed = varVal > threshold;
        else if (op === '=' || op === '==') condPassed = varVal === threshold;

        if (!condPassed) return 0;
        expr = expr.replace(ifMatch[0], '').trim();
      }
    }

    // 2. Handle descriptive English formulas
    if (expr.includes('income tax') || expr.includes('tax slab') || expr.includes('projection')) {
      const annualGross = (ctx.gross || 0) * 12;
      return annualGross > 700000 ? Math.round((annualGross - 700000) * 0.05 / 12) : 0;
    }
    if (expr.includes('residual') || expr.includes('balance') || expr.includes('ctc -') || expr.includes('gross -')) {
      const monthlyGross = ctx.gross || ctx.ctc || 0;
      const basic = ctx.basic || 0;
      const hra = ctx.hra || 0;
      const other = ctx.other || ctx.others || 0;
      return Math.max(0, monthlyGross - (basic + hra + other));
    }

    // 3. Normalize percentage expressions: e.g. "50% of gross" -> "(gross * (50 / 100))"
    expr = expr.replace(/([0-9.]+)\s*%\s*(?:of\s*)?([a-z_]+)/gi, '($2 * ($1 / 100))');
    expr = expr.replace(/([0-9.]+)\s*%/g, '($1 / 100)');
    expr = expr.replace(/\bof\b/gi, '*');

    // 4. Bind Math functions
    expr = expr.replace(/\bmin\s*\(/gi, 'Math.min(');
    expr = expr.replace(/\bmax\s*\(/gi, 'Math.max(');
    expr = expr.replace(/\bround\s*\(/gi, 'Math.round(');
    expr = expr.replace(/\bceil\s*\(/gi, 'Math.ceil(');
    expr = expr.replace(/\bfloor\s*\(/gi, 'Math.floor(');

    // 5. Replace mapped variable keys (longest first to avoid substring collision)
    const sortedKeys = Object.keys(ctx).sort((a, b) => b.length - a.length);
    for (const k of sortedKeys) {
      if (!k) continue;
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      expr = expr.replace(regex, String(ctx[k] ?? 0));
    }

    try {
      const res = Function('Math', `'use strict'; return (${expr});`)(Math);
      return isNaN(res) || !isFinite(res) ? 0 : Math.round(res);
    } catch {
      return 0;
    }
  };

  // Helper to extract clean formula string from component definition or name
  const getComponentFormula = (comp: any): string => {
    if (comp.formula && typeof comp.formula === 'string' && comp.formula.trim()) {
      return comp.formula.trim();
    }
    const match = (comp.name || '').match(/\(([^)]+)\)/);
    if (match && match[1]) {
      const inside = match[1].trim();
      if (
        inside.includes('%') ||
        inside.includes('*') ||
        inside.includes('+') ||
        inside.includes('-') ||
        inside.includes('/') ||
        inside.includes('min(') ||
        inside.includes('max(') ||
        inside.includes('if') ||
        inside.toLowerCase().includes('gross') ||
        inside.toLowerCase().includes('basic') ||
        inside.toLowerCase().includes('ctc')
      ) {
        return inside;
      }
    }
    return '';
  };

  // Helper to format clean formula for UI labels
  const formatFormulaDisplay = (formula: string, name?: string): string => {
    const nameLower = (name || '').toLowerCase();
    if (nameLower.includes('special')) return 'Residual Balance';
    if (!formula || !formula.trim()) return 'Fixed Value';

    const clean = formula.trim().replace(/\[|\]/g, '');
    const cleanLower = clean.toLowerCase();

    if (
      cleanLower.includes('ctc / 12 -') ||
      cleanLower.includes('ctc/12 -') ||
      cleanLower.includes('gross -') ||
      cleanLower.includes('basic +')
    ) {
      return 'Residual Balance';
    }

    if (cleanLower.includes('ctc * 0.5') || cleanLower.includes('ctc*0.5') || cleanLower.includes('50% of ctc') || cleanLower.includes('0.50 / 12')) {
      return '50% of CTC';
    }
    if (cleanLower.includes('basic * 0.5') || cleanLower.includes('basic*0.5') || cleanLower.includes('50% of basic')) {
      return '50% of Basic';
    }
    if (cleanLower.includes('basic * 0.4') || cleanLower.includes('basic*0.4') || cleanLower.includes('40% of basic')) {
      return '40% of Basic';
    }
    if (cleanLower.includes('basic * 0.12') || cleanLower.includes('basic*0.12') || cleanLower.includes('12% of basic')) {
      return '12% of Basic';
    }
    if (cleanLower.includes('gross * 0.0075') || cleanLower.includes('gross*0.0075') || cleanLower.includes('0.75% of gross')) {
      return '0.75% of Gross';
    }

    const pctMatch = clean.match(/([0-9.]+)\s*%/);
    if (pctMatch) {
      return `${pctMatch[1]}% Formula`;
    }

    if (clean.length > 18) {
      return 'Formula-Based';
    }
    return clean;
  };

  // Recalculate dynamic components when CTC or Slab or Frequency changes
  const recalculateFromCTC = useCallback((ctcStr: string, freqToUse?: 'annual' | 'monthly', slabIdToUse?: string, compDefsToUse?: any[]) => {
    const rawVal = Math.max(0, Number(ctcStr) || 0);
    const activeFreq = freqToUse || inputFrequency;
    const ctc = activeFreq === 'annual' ? rawVal : rawVal * 12;
    const monthlyGross = activeFreq === 'monthly' ? rawVal : Math.round(rawVal / 12);
    const sId = slabIdToUse !== undefined ? slabIdToUse : activeSlabId;
    const defs = compDefsToUse || allComponentDefs;

    const activeDefs = defs.filter((c: any) => c.is_active !== 0 && c.is_active !== false && c.isActive !== false);
    const chosenSlab = allSlabs.find(s => String(s.id) === String(sId))
      || allSlabs.find(s => {
          const min = Number(s.min_ctc ?? s.minCtc ?? 0);
          const max = Number(s.max_ctc ?? s.maxCtc ?? 10000000);
          return ctc >= min && ctc <= max;
        })
      || allSlabs[0];

    let selectedIds: string[] = [];
    if (chosenSlab?.selected_component_ids || chosenSlab?.selectedComponentIds) {
      try {
        const raw = chosenSlab.selected_component_ids ?? chosenSlab.selectedComponentIds;
        selectedIds = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
        selectedIds = selectedIds.map(String);
      } catch { selectedIds = []; }
    }

    const checkDemographicEligibility = (c: any): boolean => {
      if (!employee) return true;
      const empGender = (employee as any).gender;
      const empDept = (employee as any).department_id || (employee as any).departmentId;
      const empGrade = (employee as any).grade_id || (employee as any).gradeId || (employee as any).designation_id || (employee as any).designationId;
      const empLoc = (employee as any).location_id || (employee as any).locationId || (employee as any).branch_id || (employee as any).branchId;
      const empId = employee.id;

      // Gender filter
      const gFilter = (c.gender_filter || c.genderFilter || 'All').toString().toLowerCase();
      if (gFilter !== 'all' && empGender && empGender.toString().toLowerCase() !== gFilter) return false;

      // Department filter
      if (c.departments) {
        try {
          const depts = typeof c.departments === 'string' ? JSON.parse(c.departments) : c.departments;
          if (Array.isArray(depts) && depts.length > 0 && empDept && !depts.map(String).includes(String(empDept))) return false;
        } catch {}
      }

      // Grade / Designation filter
      if (c.grades) {
        try {
          const grades = typeof c.grades === 'string' ? JSON.parse(c.grades) : c.grades;
          if (Array.isArray(grades) && grades.length > 0 && empGrade && !grades.map(String).includes(String(empGrade))) return false;
        } catch {}
      }

      // Location filter
      if (c.locations) {
        try {
          const locs = typeof c.locations === 'string' ? JSON.parse(c.locations) : c.locations;
          if (Array.isArray(locs) && locs.length > 0 && empLoc && !locs.map(String).includes(String(empLoc))) return false;
        } catch {}
      }

      // Specific Employees filter
      if (c.employees) {
        try {
          const emps = typeof c.employees === 'string' ? JSON.parse(c.employees) : c.employees;
          if (Array.isArray(emps) && emps.length > 0 && !emps.map(String).includes(String(empId))) return false;
        } catch {}
      }

      return true;
    };

    const availableComps = (selectedIds.length > 0
      ? activeDefs.filter((c: any) => selectedIds.includes(String(c.id)))
      : activeDefs
    ).filter(checkDemographicEligibility);

    // Base Context
    const formulaCtx: Record<string, number> = {
      ctc: monthlyGross,
      monthly_ctc: monthlyGross,
      annual_ctc: ctc,
      gross: monthlyGross,
      gross_salary: monthlyGross,
      basic: 0,
      basic_salary: 0,
      hra: 0,
      other: 0,
      others: 0,
    };

    // Separate Earnings & Deductions
    const earningComps: any[] = [];
    const deductionComps: any[] = [];

    for (const comp of availableComps) {
      const group = allGroups.find(g => String(g.id) === String(comp.groupId || comp.group_id));
      const groupCat = (group?.category || comp.category || comp.group_category || '').toLowerCase();
      const isDeduction = groupCat ? groupCat.includes('deduct') : ['pf', 'provident', 'esic', 'esi', 'tax', 'tds', 'pt', 'professional tax', 'lop', 'advance', 'recovery', 'vpf', 'loan'].some(k => (comp.name || '').toLowerCase().includes(k));
      if (isDeduction) {
        deductionComps.push(comp);
      } else {
        earningComps.push(comp);
      }
    }

    // Pass 1: Fixed Value non-Basic/non-Special components
    let fixedOtherSum = 0;
    for (const comp of earningComps) {
      const nameLower = (comp.name || '').toLowerCase();
      const compType = comp.componentType || comp.component_type || comp.type || 'Value';
      if (!nameLower.includes('basic') && !nameLower.includes('special') && !nameLower.includes('hra')) {
        if (compType === 'Value' && Number(comp.amount || 0) > 0) {
          fixedOtherSum += Number(comp.amount);
          const normKey = nameLower.replace(/[^a-z0-9]/g, '_');
          formulaCtx[normKey] = Number(comp.amount);
        }
      }
    }
    formulaCtx['other'] = fixedOtherSum;
    formulaCtx['others'] = fixedOtherSum;

    // Pass 2: Calculate Basic Component
    let basicAmount = 0;
    const basicComp = earningComps.find(c => (c.name || '').toLowerCase().includes('basic'));
    if (basicComp) {
      const bFormula = getComponentFormula(basicComp);
      const bAmt = Number(basicComp.amount ?? basicComp.value ?? 0);
      if (bFormula) {
        basicAmount = evaluateFormula(bFormula, formulaCtx);
      } else if (bAmt > 0) {
        basicAmount = bAmt;
      }
    }

    formulaCtx['basic'] = basicAmount;
    formulaCtx['basic_salary'] = basicAmount;

    // Pass 3: Evaluate all other earning components (Multi-pass for cross-component formula references)
    const evaluatedEarningAmounts = new Map<string | number, number>();

    for (let pass = 0; pass < 2; pass++) {
      for (const comp of earningComps) {
        const compName = comp.name || 'Component';
        const compNameLower = compName.toLowerCase();
        if (compNameLower.includes('basic')) continue;
        if (compNameLower.includes('special') && (compNameLower.includes('allowance') || compNameLower.includes('residual') || (comp.formula || '').toLowerCase().includes('ctc -') || (comp.formula || '').toLowerCase().includes('gross -'))) {
          continue; // special residual resolved after pass 2
        }

        const formula = getComponentFormula(comp);
        const configuredAmt = Number(comp.amount ?? comp.value ?? 0);

        let amt = 0;
        if (formula) {
          amt = evaluateFormula(formula, formulaCtx);
        } else if (configuredAmt > 0) {
          amt = configuredAmt;
        }

        const bType = comp.boundary_type || comp.boundaryType;
        const minBound = Number(comp.min_amount || comp.minAmount || 0);
        const maxBound = Number(comp.max_amount || comp.maxAmount || 0);
        if (bType && bType !== 'Choose') {
          if ((bType === 'Min' || bType === 'Both') && minBound > 0) amt = Math.max(minBound, amt);
          if ((bType === 'Max' || bType === 'Both') && maxBound > 0) amt = Math.min(maxBound, amt);
        }

        const normKey = compNameLower.replace(/[^a-z0-9]/g, '_');
        formulaCtx[normKey] = amt;
        formulaCtx[compNameLower] = amt;
        formulaCtx[compName.toUpperCase()] = amt;
        if (compNameLower.includes('hra')) formulaCtx['hra'] = amt;
        evaluatedEarningAmounts.set(comp.id, amt);
      }
    }

    const newEarnings: Array<{ id: string | number; name: string; category: string; type: string; formula: string; amount: number; basedOnAttendance?: boolean }> = [];
    let specialIdx = -1;
    let allocatedEarningsTotal = 0;

    for (const comp of earningComps) {
      const compName = comp.name || 'Component';
      const compNameLower = compName.toLowerCase();
      const compType = comp.componentType || comp.component_type || comp.type || 'Derived';
      const formula = getComponentFormula(comp);
      const isAttBased = Boolean(comp.basedOnAttendance ?? comp.based_on_attendance);

      let amt = 0;
      if (compNameLower.includes('basic')) {
        amt = basicAmount;
      } else if (compNameLower.includes('special') && (compNameLower.includes('allowance') || compNameLower.includes('residual') || formula.toLowerCase().includes('ctc -') || formula.toLowerCase().includes('gross -'))) {
        amt = -1; // placeholder
      } else {
        amt = evaluatedEarningAmounts.get(comp.id) ?? 0;
      }

      if (amt !== -1) allocatedEarningsTotal += amt;

      newEarnings.push({
        id: comp.id,
        name: compName,
        category: 'Earning',
        type: compType,
        formula: formula || comp.formula || '',
        amount: amt,
        basedOnAttendance: isAttBased
      });

      if (amt === -1) {
        specialIdx = newEarnings.length - 1;
      }
    }

    // If Special Allowance exists, resolve residual. If not, assign residual CTC to other non-Basic slab components before creating Special Allowance
    if (specialIdx >= 0) {
      const specialAllowanceAmt = Math.max(0, monthlyGross - allocatedEarningsTotal);
      newEarnings[specialIdx].amount = specialAllowanceAmt;
      formulaCtx['special_allowance'] = specialAllowanceAmt;
    } else if (monthlyGross > allocatedEarningsTotal) {
      const residualAmt = Math.max(0, monthlyGross - allocatedEarningsTotal);
      const otherEarningIdx = newEarnings.findIndex(c => !(c.name || '').toLowerCase().includes('basic'));
      if (otherEarningIdx >= 0) {
        newEarnings[otherEarningIdx].amount += residualAmt;
        const normKey = (newEarnings[otherEarningIdx].name || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
        formulaCtx[normKey] = newEarnings[otherEarningIdx].amount;
      } else {
        newEarnings.push({
          id: 'special_residual_auto',
          name: 'Special Allowance',
          category: 'Earning',
          type: 'Derived',
          formula: 'Residual Balance',
          amount: residualAmt,
          basedOnAttendance: false
        });
        formulaCtx['special_allowance'] = residualAmt;
      }
    }

    // Pass 4: Evaluate Deductions (Multi-pass for cross-component formula references)
    const evaluatedDeductionAmounts = new Map<string | number, number>();

    for (let pass = 0; pass < 2; pass++) {
      for (const comp of deductionComps) {
        const compName = comp.name || 'Deduction';
        const compNameLower = compName.toLowerCase();
        const formula = getComponentFormula(comp);
        const configuredAmt = Number(comp.amount ?? comp.value ?? 0);

        let amt = 0;
        if (formula) {
          amt = evaluateFormula(formula, formulaCtx);
        } else if (configuredAmt > 0) {
          amt = configuredAmt;
        }

        const bType = comp.boundary_type || comp.boundaryType;
        const minBound = Number(comp.min_amount || comp.minAmount || 0);
        const maxBound = Number(comp.max_amount || comp.maxAmount || 0);
        if (bType && bType !== 'Choose') {
          if ((bType === 'Min' || bType === 'Both') && minBound > 0) amt = Math.max(minBound, amt);
          if ((bType === 'Max' || bType === 'Both') && maxBound > 0) amt = Math.min(maxBound, amt);
        }

        const normKey = compNameLower.replace(/[^a-z0-9]/g, '_');
        formulaCtx[normKey] = amt;
        formulaCtx[compNameLower] = amt;
        formulaCtx[compName.toUpperCase()] = amt;
        evaluatedDeductionAmounts.set(comp.id, amt);
      }
    }

    const newDeductions: Array<{ id: string | number; name: string; category: string; type: string; formula: string; amount: number; basedOnAttendance?: boolean }> = [];

    for (const comp of deductionComps) {
      const compName = comp.name || 'Deduction';
      const compType = comp.componentType || comp.component_type || comp.type || 'Derived';
      const formula = getComponentFormula(comp);
      const isAttBased = Boolean(comp.basedOnAttendance ?? comp.based_on_attendance);
      const amt = evaluatedDeductionAmounts.get(comp.id) ?? 0;

      newDeductions.push({
        id: comp.id,
        name: compName,
        category: 'Deduction',
        type: compType,
        formula: formula || comp.formula || '',
        amount: amt,
        basedOnAttendance: isAttBased
      });
    }

    setModalEarnings(newEarnings);
    setModalDeductions(newDeductions);
    return { earnings: newEarnings, deductions: newDeductions };
  }, [activeSlabId, allSlabs, allGroups, allComponentDefs, inputFrequency]);

  const handleSalaryInputChange = (val: string, freq?: 'annual' | 'monthly') => {
    setSalaryInput(val);
    recalculateFromCTC(val, freq || 'annual', activeSlabId, allComponentDefs);
  };

  const handleFrequencyChange = (newFreq: 'annual' | 'monthly') => {
    setInputFrequency(newFreq);
    const curNum = Number(salaryInput) || 0;
    if (curNum > 0) {
      const converted = newFreq === 'monthly' ? Math.round(curNum / 12) : curNum * 12;
      setSalaryInput(String(converted));
      recalculateFromCTC(String(converted), newFreq, activeSlabId, allComponentDefs);
    } else {
      recalculateFromCTC(salaryInput, newFreq, activeSlabId, allComponentDefs);
    }
  };

  // Automatically recalculate modal breakdown when modal opens or active slab changes
  useEffect(() => {
    if (modalOpen && allComponentDefs.length > 0) {
      const targetSlabId = activeSlabId || (allSlabs[0]?.id ? String(allSlabs[0].id) : '');
      recalculateFromCTC(salaryInput, 'annual', targetSlabId, allComponentDefs);
    }
  }, [modalOpen, activeSlabId, allComponentDefs]);

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    const currentSlabId = activeSlabId || (employee as any)?.salary_slab_id || (employee as any)?.salarySlabId;
    const defaultSlab = (currentSlabId ? allSlabs.find(s => String(s.id) === String(currentSlabId)) : null) || allSlabs[0];
    const defaultSlabId = defaultSlab ? String(defaultSlab.id) : '';
    const defaultSlabName = defaultSlab?.name || defaultSlab?.slab_name || 'Standard Pay Slab';
    const minCtc = Number(defaultSlab?.min_ctc ?? defaultSlab?.minCtc ?? 0);

    setActiveSlabId(defaultSlabId);
    setActiveSlabName(defaultSlabName);

    const empCtc = Number((employee as any)?.annual_ctc || (employee as any)?.annualCtc || ((employee as any)?.gross_salary ? (employee as any)?.gross_salary * 12 : 0));
    const initialCtc = empCtc > 0 ? String(empCtc) : '';

    setInputFrequency('annual');
    setSalaryInput(initialCtc);
    recalculateFromCTC(initialCtc, 'annual', defaultSlabId, allComponentDefs);
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setArrearPayMonth(new Date().toISOString().slice(0, 10));
    setModalOpen(true);
  };

  const handleOpenEditModal = (rec: PayStructureRecord) => {
    setEditingRecord(rec);
    const recCtc = Number(rec.ctc || (rec.gross > 0 ? rec.gross * 12 : 0));
    const matchedSlab = allSlabs.find(s => String(s.id) === String(rec.slabId))
      || allSlabs.find(s => {
          const min = Number(s.min_ctc ?? s.minCtc ?? 0);
          const max = Number(s.max_ctc ?? s.maxCtc ?? 10000000);
          return recCtc >= min && recCtc <= max;
        })
      || allSlabs[0];
    const slabIdToSet = matchedSlab?.id ? String(matchedSlab.id) : (allSlabs[0]?.id ? String(allSlabs[0].id) : '');
    setActiveSlabId(slabIdToSet);
    setActiveSlabName(matchedSlab?.name || matchedSlab?.slab_name || allSlabs[0]?.name || 'Standard Pay Slab');

    const ctcToUse = String(recCtc);
    setInputFrequency('annual');
    setSalaryInput(ctcToUse);

    // Recalculate dynamically based on CTC and latest component settings from database
    recalculateFromCTC(ctcToUse, 'annual', slabIdToSet, allComponentDefs);

    setEffectiveFrom(rec.effectiveFrom ? String(rec.effectiveFrom).slice(0, 10) : new Date().toISOString().slice(0, 10));
    setArrearPayMonth(rec.arrearPayMonth ? String(rec.arrearPayMonth).slice(0, 10) : (rec.effectiveFrom ? String(rec.effectiveFrom).slice(0, 10) : new Date().toISOString().slice(0, 10)));
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
      if (!effectiveFrom || !effectiveFrom.trim()) {
        showToast.error('Effective Date Required', 'Please select an Effective From date before saving.');
        return;
      }

      const numVal = Math.max(0, Number(salaryInput) || 0);
      if (numVal <= 0) {
        showToast.error('Annual CTC Required', 'Please enter a valid Annual CTC amount greater than 0.');
        return;
      }

      const annualCtc = numVal;
      const grossMonthly = modalEarnings.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
      const totalDed = modalDeductions.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
      const netTakeHome = Math.max(0, grossMonthly - totalDed);

      const basicItem = modalEarnings.find(e => e.name.toLowerCase().includes('basic'));
      const hraItem = modalEarnings.find(e => e.name.toLowerCase().includes('hra') || e.name.toLowerCase().includes('house rent'));
      const saItem = modalEarnings.find(e => e.name.toLowerCase().includes('special'));
      const pfItem = modalDeductions.find(d => d.name.toLowerCase().includes('pf') || d.name.toLowerCase().includes('provident'));
      const esiItem = modalDeductions.find(d => d.name.toLowerCase().includes('esi'));
      const ptItem = modalDeductions.find(d => d.name.toLowerCase().includes('pt') || d.name.toLowerCase().includes('professional'));

      const b = basicItem ? Number(basicItem.amount) : Math.round(grossMonthly * 0.5);
      const h = hraItem ? Number(hraItem.amount) : 0;
      const sa = saItem ? Number(saItem.amount) : 0;
      const pfVal = pfItem ? Number(pfItem.amount) : 0;
      const esiVal = esiItem ? Number(esiItem.amount) : 0;
      const ptVal = ptItem ? Number(ptItem.amount) : 0;

      const earningsBreakup = modalEarnings.map(e => ({
        component_id: e.id,
        code: e.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
        name: e.name,
        type: e.type,
        formula: e.formula,
        amount: Number(e.amount) || 0
      }));

      const deductionsBreakup = modalDeductions.map(d => ({
        component_id: d.id,
        code: d.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
        name: d.name,
        type: d.type,
        formula: d.formula,
        amount: Number(d.amount) || 0
      }));

      const chosenSlab = allSlabs.find(s => String(s.id) === activeSlabId);
      const activeOrFirstCycle = allCycles.find((c: any) => c.is_active || c.is_current_cycle || c.isCurrentCycle) || allCycles[0];
      const resolvedCycle = chosenSlab?.cycle_id || (employee as any).cycleId || (employee as any).cycle_id || activeCycleId || activeOrFirstCycle?.id || null;
      const finalCycleId = resolvedCycle ? Number(resolvedCycle) : null;

      const payload = {
        employee_id: employee.id,
        company_id: (employee as any).companyId || (employee as any).company_id || null,
        slab_id: activeSlabId ? Number(activeSlabId) : null,
        cycle_id: finalCycleId,
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

  const grossCalculated = modalEarnings.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
  const totalDeductionCalculated = modalDeductions.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
  const netSalaryCalculated = Math.max(0, grossCalculated - totalDeductionCalculated);
  const targetAnnualCtc = inputFrequency === 'monthly' ? (Number(salaryInput) || 0) * 12 : (Number(salaryInput) || 0);
  const annualCtcCalculated = targetAnnualCtc > 0 ? targetAnnualCtc : (grossCalculated * 12);

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
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Payroll Structure & Compensation</h3>
               
              </div>
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
                <th className="px-4 py-3">Slab Template</th>
                <th className="px-4 py-3 text-right">Annual CTC</th>
                <th className="px-4 py-3 text-right">Monthly Gross</th>
                <th className="px-4 py-3 text-right">Net Take-Home</th>
                <th className="px-4 py-3">Effective From</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 w-24">Action</th>
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
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/20">
                        <Banknote className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">No Payroll Structure Assigned Yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click below to assign an active compensation package with auto-computed components.
                        </p>
                      </div>
                      {canEditPayroll && (
                        <Button
                          onClick={handleOpenAddModal}
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Assign Pay Structure Now
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                payStructures.map(rec => {
                  const ctcDisplay = rec.ctc || (rec.gross * 12);
                  return (
                    <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
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
        <DialogContent className="max-w-4xl w-[96vw] p-0 overflow-hidden bg-card text-card-foreground border border-border shadow-2xl rounded-2xl">
          {/* Header */}
          <DialogHeader className="p-4 px-6 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-sm font-bold text-foreground">
                  {editingRecord ? 'Edit Employee Payroll Structure' : 'Assign New Payroll Structure'}
                </span>
                <span className="block text-[11px] font-normal text-muted-foreground">
                  Configure annual CTC, assign pay slab, and verify monthly take-home
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-5 max-h-[84vh] overflow-y-auto">
            {/* Top Config Card */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Slab Dropdown */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" /> Assigned Pay Slab <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => recalculateFromCTC(salaryInput, 'annual', activeSlabId)}
                      className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Recalculate all components according to this slab"
                    >
                      <RefreshCw className="w-3 h-3" /> Recompute
                    </button>
                  </div>
                  <select
                    value={activeSlabId}
                    onChange={(e) => {
                      const val = e.target.value;
                      const chosen = allSlabs.find(s => String(s.id) === String(val));
                      if (chosen) {
                        setActiveSlabId(String(chosen.id));
                        setActiveSlabName(chosen.name || 'Standard Pay Slab');
                        recalculateFromCTC(salaryInput, 'annual', String(chosen.id));
                      }
                    }}
                    className="w-full h-9 border border-input bg-background text-foreground rounded-lg px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-xs"
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

                {/* Annual CTC Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-primary" /> Annual CTC (₹/yr) <span className="text-rose-500">*</span>
                    </label>
                    {Number(salaryInput) > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        ₹{Math.round(Number(salaryInput) / 12).toLocaleString('en-IN')}/mo
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={salaryInput}
                      onChange={(e) => handleSalaryInputChange(e.target.value, 'annual')}
                      placeholder="e.g. 1200000"
                      className="h-9 pl-6 text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-xs"
                    />
                  </div>
                  
                  {/* Live CTC & Typo Helper */}
                  {(() => {
                    const curCtc = Number(salaryInput) || 0;
                    const selectedModalSlab = allSlabs.find(s => String(s.id) === String(activeSlabId));
                    const minCtc = Number(selectedModalSlab?.min_ctc ?? selectedModalSlab?.minCtc ?? 0);
                    const maxCtc = Number(selectedModalSlab?.max_ctc ?? selectedModalSlab?.maxCtc ?? 0);
                    const isOutOfRange = maxCtc > 0 && (curCtc < minCtc || curCtc > maxCtc);
                    const potentialTypo = curCtc > 0 && curCtc < 180000 ? curCtc * 10 : null;

                    return (
                      <div className="space-y-1 text-[10px]">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-muted-foreground">
                            {curCtc > 0 ? `₹${(curCtc / 100000).toFixed(2)} Lakhs per annum` : 'Enter CTC'}
                          </span>
                          {minCtc > 0 && isOutOfRange && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              ⚠️ Outside slab (₹{(minCtc / 100000).toFixed(0)}L - ₹{(maxCtc / 100000).toFixed(0)}L)
                            </span>
                          )}
                        </div>
                        {potentialTypo && (
                          <div className="p-1.5 px-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold flex items-center justify-between">
                            <span>💡 Did you mean ₹{(potentialTypo / 100000).toFixed(1)}L (₹{potentialTypo.toLocaleString('en-IN')})?</span>
                            <button
                              type="button"
                              onClick={() => handleSalaryInputChange(String(potentialTypo), 'annual')}
                              className="text-[9px] font-bold bg-amber-500/20 px-2 py-0.5 rounded hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 cursor-pointer"
                            >
                              Apply
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Effective From */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Effective From <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={effectiveFrom ? String(effectiveFrom).slice(0, 10) : ''}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className={`h-9 text-xs font-semibold shadow-xs ${!effectiveFrom ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                  />
                  {!effectiveFrom && (
                    <span className="text-[10px] font-semibold text-rose-500 block">
                      * Please choose effective date
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Earnings vs Deductions 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Earnings Column */}
              <div className="border border-emerald-500/20 rounded-xl overflow-hidden bg-card shadow-xs flex flex-col">
                <div className="px-4 py-3 bg-emerald-500/5 border-b border-emerald-500/15 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      Earnings (Monthly)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      ₹{(grossCalculated * 12).toLocaleString('en-IN')}/yr
                    </span>
                    <Badge variant="outline" className="text-xs font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 px-2.5 py-0.5">
                      ₹{grossCalculated.toLocaleString('en-IN')}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 space-y-1 flex-1 divide-y divide-border/40">
                  {modalEarnings.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-4 text-center">No active earnings in this slab.</p>
                  ) : (
                    modalEarnings.map((item, idx) => {
                      const amt = Number(item.amount) || 0;
                      return (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors group"
                        >
                          <div className="min-w-0 pr-3">
                            <span className="text-xs font-semibold text-foreground truncate block">{item.name}</span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="relative w-28 sm:w-32">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                              <Input
                                type="number"
                                value={item.amount}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setModalEarnings(prev => {
                                    const updated = prev.map((it, i) => i === idx ? { ...it, amount: val } : it);
                                    let saIdx = updated.findIndex(it => it.name.toLowerCase().includes('special'));
                                    const mGross = inputFrequency === 'monthly' ? (Number(salaryInput) || 0) : Math.round((Number(salaryInput) || 0) / 12);
                                    if (mGross > 0) {
                                      const otherSum = updated
                                        .filter((_, i) => i !== saIdx)
                                        .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
                                      if (saIdx >= 0 && saIdx !== idx) {
                                        updated[saIdx] = {
                                          ...updated[saIdx],
                                          amount: Math.max(0, mGross - otherSum)
                                        };
                                      }
                                    }
                                    return updated;
                                  });
                                }}
                                className="h-8 pl-6 pr-2 text-xs font-bold text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-background border-border/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground w-22 text-right tabular-nums">
                              ₹{(amt * 12).toLocaleString('en-IN')}/yr
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Deductions Column */}
              <div className="border border-rose-500/20 rounded-xl overflow-hidden bg-card shadow-xs flex flex-col">
                <div className="px-4 py-3 bg-rose-500/5 border-b border-rose-500/15 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                      Deductions (Monthly)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      ₹{(totalDeductionCalculated * 12).toLocaleString('en-IN')}/yr
                    </span>
                    <Badge variant="outline" className="text-xs font-extrabold bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 px-2.5 py-0.5">
                      ₹{totalDeductionCalculated.toLocaleString('en-IN')}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 space-y-1 flex-1 divide-y divide-border/40">
                  {modalDeductions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-4 text-center">No active deductions in this slab.</p>
                  ) : (
                    modalDeductions.map((item, idx) => {
                      const amt = Number(item.amount) || 0;
                      return (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors group"
                        >
                          <div className="min-w-0 pr-3">
                            <span className="text-xs font-semibold text-foreground truncate block">{item.name}</span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="relative w-28 sm:w-32">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                              <Input
                                type="number"
                                value={item.amount}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setModalDeductions(prev => prev.map((it, i) => i === idx ? { ...it, amount: val } : it));
                                }}
                                className="h-8 pl-6 pr-2 text-xs font-bold text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-background border-border/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground w-22 text-right tabular-nums">
                              ₹{(amt * 12).toLocaleString('en-IN')}/yr
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Compensation Summary Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-emerald-500/10 to-primary/5 border border-primary/20 flex items-center justify-between flex-wrap gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block">
                    Estimated Monthly Take-Home
                  </span>
                  <span className="text-xl font-black text-primary flex items-baseline gap-1">
                    ₹{netSalaryCalculated.toLocaleString('en-IN')}
                    <span className="text-xs font-semibold text-muted-foreground">/ mo</span>
                    <span className="text-[11px] font-medium text-muted-foreground ml-2">
                      (₹{(netSalaryCalculated * 12).toLocaleString('en-IN')}/yr)
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-5 divide-x divide-border/60">
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Gross Salary</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{grossCalculated.toLocaleString('en-IN')}/mo</span>
                </div>
                <div className="pl-5 text-right">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Deductions</span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">-₹{totalDeductionCalculated.toLocaleString('en-IN')}/mo</span>
                </div>
                <div className="pl-5 text-right">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block">Annual CTC</span>
                  <span className="text-sm font-black text-foreground">₹{annualCtcCalculated.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="h-9 px-4 text-xs font-semibold cursor-pointer">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-5 text-xs font-bold shadow-sm gap-1.5 cursor-pointer">
                <CheckCircle2 className="w-4 h-4" />
                {editingRecord ? 'Update Salary Structure' : 'Save & Activate Structure'}
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
                <span className="font-bold text-foreground">₹{(viewRecord.basic ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-muted-foreground">HRA (Monthly):</span>
                <span className="font-bold text-foreground">₹{(viewRecord.hra ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-muted-foreground">Special Allowance:</span>
                <span className="font-bold text-foreground">₹{(viewRecord.specialAllowance ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-muted-foreground">Gross Monthly:</span>
                <span className="font-bold text-emerald-600">₹{(viewRecord.gross ?? 0).toLocaleString('en-IN')}</span>
              </div>
              {(viewRecord.pf ?? 0) > 0 && (
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <span className="font-semibold text-muted-foreground">PF Deduction:</span>
                  <span className="font-bold text-rose-600">- ₹{(viewRecord.pf ?? 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              {(viewRecord.esic ?? 0) > 0 && (
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <span className="font-semibold text-muted-foreground">ESIC Deduction:</span>
                  <span className="font-bold text-rose-600">- ₹{(viewRecord.esic ?? 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              {(viewRecord.pt ?? 0) > 0 && (
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <span className="font-semibold text-muted-foreground">Professional Tax:</span>
                  <span className="font-bold text-rose-600">- ₹{(viewRecord.pt ?? 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-primary/30">
                <span className="font-bold text-foreground text-sm">Net Monthly Take-Home:</span>
                <span className="font-black text-primary text-base">₹{(viewRecord.netSalary ?? 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeePayrollDetail;