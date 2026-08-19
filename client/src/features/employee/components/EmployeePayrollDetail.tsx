import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  FileText,
  Edit2,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { formatPayrollDate } from '@/lib/utils';
import type { Employee } from '@/types';

interface PayStructureRecord {
  id: string;
  slab: string;
  slabId?: string;
  cycleId?: string;
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

  // Deductions
  esic: number;
  pt: number;
  pf: number;

  // Employer Contribution
  pfEmployer: number;

  // Totals
  gross: number;
  totalDeduction: number;
  netSalary: number;
  ctc: number;
  
  customComponents?: any;
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
  
  const grossVal = Number(s.gross || s.gross_monthly || s.grossMonthly || 0);
  const rawCtc = Number(s.ctc || s.annual_ctc || s.annualCtc || 0);
  const ctcVal = rawCtc > 0 ? (rawCtc < 100000 && grossVal > 0 ? grossVal * 12 : rawCtc) : (grossVal * 12);
  const netVal = Number(s.netSalary || s.net_salary_monthly || s.net_take_home || s.netTakeHome || (grossVal * 0.9));

  return {
    id: String(s.id),
    slab: s.slab || s.slabName || s.slab_name || s.structureName || s.structure_name || activeSlabNameFallback || 'Monthly',
    slabId: s.slabId !== undefined ? String(s.slabId) : (s.slab_id !== undefined ? String(s.slab_id) : undefined),
    cycleId: s.cycleId !== undefined ? String(s.cycleId) : (s.cycle_id !== undefined ? String(s.cycle_id) : undefined),
    effectiveFrom: s.effectiveFrom || s.effective_from || new Date().toISOString().split('T')[0],
    arrearPayMonth: s.arrearPayMonth || s.arrear_pay_month || s.effective_from || '',
    status: s.status === 'Deleted' || s.is_active === false || s.isActive === false ? 'Deleted' : 'Active',
    addedBy: s.addedBy || s.added_by || 'hradmin',
    addedOn: s.addedOn || s.added_on || new Date().toISOString().replace('T', ' ').substring(0, 19),
    updateBy: s.updateBy || s.updated_by || '',
    updateOn: s.updateOn || s.updated_on || '',
    calcMode: s.calcMode || s.calculation_mode || 'salary_input',
    salaryInput: grossVal || (ctcVal > 100000 ? Math.round(ctcVal / 12) : ctcVal) || 40000,
    basic: Number(s.basic || s.basic_monthly || (grossVal * 0.5)),
    hra: Number(s.hra || s.hra_monthly || (grossVal * 0.2)),
    standardAllowance: Number(s.standardAllowance || s.standard_allowance_monthly || 0),
    mealAllowance: Number(s.mealAllowance || s.meal_allowance_monthly || 0),
    communicationAllowance: Number(s.communicationAllowance || s.communication_allowance_monthly || 0),
    childrenEduAllowance: Number(s.childrenEduAllowance || s.children_edu_allowance_monthly || 0),
    lta: Number(s.lta || s.lta_monthly || 0),
    esic: Number(s.esic || s.esic_deduction || 0),
    pt: Number(s.pt || s.pt_deduction || (grossVal > 15000 ? 200 : 0)),
    pf: Number(s.pf || s.pf_deduction || Math.min(1800, Math.round(grossVal * 0.5 * 0.12))),
    pfEmployer: Number(s.pfEmployer || s.pf_employer || Math.min(1800, Math.round(grossVal * 0.5 * 0.12))),
    gross: grossVal,
    totalDeduction: Number(s.totalDeduction || s.total_deductions_monthly || 0),
    netSalary: netVal,
    ctc: ctcVal,
    customComponents: customComps
  };
};

interface EmployeePayrollDetailProps {
  employee: Employee;
}

export function EmployeePayrollDetail({ employee }: EmployeePayrollDetailProps) {
  // Role-based permission check: Only Admin can create, edit, delete, or reassign salary structures. HR is Read-Only.
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
  const [salaryInput, setSalaryInput] = useState<string>('120000');
  const [effectiveFrom, setEffectiveFrom] = useState<string>('2026-08-08');
  const [arrearPayMonth, setArrearPayMonth] = useState<string>('2026-08-08');

  // Dynamic Component Values
  const [dynamicValues, setDynamicValues] = useState<Record<string, number>>({});

  // Legacy state for payload mapping (fallback for server schema)
  const [basic, setBasic] = useState('0');
  const [hra, setHra] = useState('0');
  const [pf, setPf] = useState('0');
  const [pfEmployer, setPfEmployer] = useState('0');
  const [pt, setPt] = useState('0');
  const [esic, setEsic] = useState('0');

  useEffect(() => {
    if (!employee?.id) return;

    // Fetch Master Component Data
    Promise.all([
      apiClient.get('/payroll/component-groups').catch(() => ({ data: { data: [] } })),
      apiClient.get('/payroll/component-definitions').catch(() => ({ data: { data: [] } }))
    ]).then(([groupsRes, compsRes]) => {
      const rawGroups = groupsRes.data?.data || groupsRes.data || [];
      const rawComps = compsRes.data?.data || compsRes.data || [];
      
      const mappedGroups: ComponentGroup[] = rawGroups.map((g: any) => {
        const groupComps = rawComps
          .filter((c: any) => String(c.groupId || c.group_id) === String(g.id))
          .map((c: any) => ({
            id: String(c.id),
            name: c.name || 'Component',
            type: c.componentType || c.component_type || 'Value',
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
      });
      setAllGroups(mappedGroups);
    });

    // Load the full slab catalog for reference (component picker, PF rate lookup, etc.)
    // AND fetch employee salary structures in a single coordinated flow so that the
    // slab name resolved from the structure row is always available when records are mapped.
    const loadPayrollData = async () => {
      try {
        // Parallel: fetch slab catalog and employee structures at the same time
        const [slabsRes, structRes] = await Promise.all([
          apiClient.get('/payroll/slabs').catch(() => ({ data: { data: [] } })),
          apiClient.get(`/payroll/salary-structure?employee_id=${employee.id}`).catch(() => ({ data: { data: [] } }))
        ]);

        const slabsData: any[] = slabsRes.data?.data || slabsRes.data || [];
        setAllSlabs(slabsData);

        const data: any[] = structRes.data?.data || structRes.data || [];

        // -- Resolve active slab from the structure row (the JOIN already returned slab_name / slabName) --
        const currentStructure = data.find((s: any) => s.slabId || s.slab_id);
        let resolvedSlabName = 'Not Assigned';
        let resolvedSlabId = '';
        let resolvedCycleId = '';

        if (currentStructure) {
          resolvedSlabId = String(currentStructure.slabId || currentStructure.slab_id || '');
          // Prefer the slab_name joined from payroll_slabs (already camelCased to slabName by Knex).
          // Also check the slab catalog as a fallback.
          const joinedSlabName = currentStructure.slabName || currentStructure.slab_name;
          const catalogSlab = slabsData.find((s: any) => String(s.id) === resolvedSlabId);
          resolvedSlabName = joinedSlabName || catalogSlab?.name || 'Assigned Slab';
          resolvedCycleId = String(currentStructure.cycleId || currentStructure.cycle_id || '');

          setActiveSlabId(resolvedSlabId);
          setActiveSlabName(resolvedSlabName);
          setActiveCycleId(resolvedCycleId);

          // Pull PF rate and component IDs from the catalog slab
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
        } else {
          setActiveSlabId('');
          setActiveSlabName('Not Assigned');
        }

        // -- Map structure records using the LOCALLY resolved slab name (not stale React state) --
        if (Array.isArray(data) && data.length > 0) {
          const mappedRecords: PayStructureRecord[] = data.map((s: any) => {
            // Each row already has slabName from the JOIN — use it directly per-row
            const perRowSlabName = s.slabName || s.slab_name;
            const perRowSlabId = s.slabId || s.slab_id;
            const catalogSlabForRow = perRowSlabId
              ? slabsData.find((sl: any) => String(sl.id) === String(perRowSlabId))
              : null;
            const fallbackName = perRowSlabName || catalogSlabForRow?.name || resolvedSlabName;
            return mapStructureRecord(s, fallbackName);
          });
          // Deduplicate records to prevent repeat rows
          const uniqueMap = new Map<string, PayStructureRecord>();
          mappedRecords.forEach(r => {
            const key = `${r.effectiveFrom}_${r.id}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, r);
            }
          });
          setPayStructures(Array.from(uniqueMap.values()));
        }
      } catch (err) {
        console.error('Error loading payroll data:', err);
      }
    };

    loadPayrollData();
  }, [employee]);

  // Strict matching helper: ONLY show components explicitly assigned to the selected slab
  const isComponentInSlab = useCallback((comp: { id: string; name: string }, slabCompIds: string[]) => {
    if (!slabCompIds || slabCompIds.length === 0) return false;
    const cId = String(comp.id).trim().toLowerCase();
    const cName = String(comp.name || '').trim().toLowerCase();
    const cSlug = cName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    return slabCompIds.some(raw => {
      const s = String(raw).trim().toLowerCase();
      const sSlug = s.replace(/[^a-zA-Z0-9]/g, '_');
      return s === cId || s === cName || sSlug === cSlug;
    });
  }, []);

  // Extract active slab's components grouped by category
  const activeEarnings = useMemo(() => {
    return allGroups
      .filter(g => g.category === 'Earning')
      .map(g => ({
        ...g,
        components: g.components.filter(c => isComponentInSlab(c, slabComponentIds))
      }))
      .filter(g => g.components.length > 0);
  }, [allGroups, slabComponentIds, isComponentInSlab]);

  const activeDeductions = useMemo(() => {
    return allGroups
      .filter(g => g.category !== 'Earning')
      .map(g => ({
        ...g,
        components: g.components.filter(c => isComponentInSlab(c, slabComponentIds))
      }))
      .filter(g => g.components.length > 0);
  }, [allGroups, slabComponentIds, isComponentInSlab]);

  // Robust Formula Evaluator supporting %, (N*CTC)/100, N*0.4, and JS expressions referencing any present components
  const evaluateComponentFormula = (formula: string, context: Record<string, number>) => {
    if (!formula || typeof formula !== 'string') return 0;
    const f = formula.trim();

    // Pattern A: "50%" or "50% of CTC" or "50% of BASIC"
    const pctMatch = f.match(/^(\d+(?:\.\d+)?)\s*%\s*(?:of\s*)?([a-zA-Z_0-9]+)?$/i);
    if (pctMatch) {
      const pct = parseFloat(pctMatch[1]) / 100;
      const baseKey = (pctMatch[2] || '').toUpperCase();
      const base = context[baseKey] !== undefined ? context[baseKey] : (baseKey.includes('BASIC') ? (context.BASIC || 0) : (baseKey.includes('GROSS') ? (context.GROSS || 0) : (context.CTC || 0)));
      return Math.round(base * pct);
    }

    // Pattern B: "(50 * CTC) / 100" or "(40 * BASIC) / 100"
    const div100Match = f.match(/^\(?(\d+(?:\.\d+)?)\s*\*\s*([a-zA-Z_0-9]+)\)?\s*\/\s*100$/i);
    if (div100Match) {
      const pct = parseFloat(div100Match[1]) / 100;
      const baseKey = div100Match[2].toUpperCase();
      const base = context[baseKey] !== undefined ? context[baseKey] : (baseKey.includes('BASIC') ? (context.BASIC || 0) : (baseKey.includes('GROSS') ? (context.GROSS || 0) : (context.CTC || 0)));
      return Math.round(base * pct);
    }

    // Pattern C: "BASIC * 0.40" or "CTC * 0.50"
    const multMatch = f.match(/^([a-zA-Z_0-9]+)\s*\*\s*(0?\.\d+)$/i) || f.match(/^(0?\.\d+)\s*\*\s*([a-zA-Z_0-9]+)$/i);
    if (multMatch) {
      const factor = parseFloat(multMatch[1]) || parseFloat(multMatch[2]);
      const baseKey = (isNaN(parseFloat(multMatch[1])) ? multMatch[1] : multMatch[2]).toUpperCase();
      const base = context[baseKey] !== undefined ? context[baseKey] : (baseKey.includes('BASIC') ? (context.BASIC || 0) : (baseKey.includes('GROSS') ? (context.GROSS || 0) : (context.CTC || 0)));
      return Math.round(base * factor);
    }

    // Pattern D: Complex / Dynamic arithmetic expressions e.g. "GROSS - BASIC - HRA" or "(CTC * 0.5) + 2000"
    try {
      let expr = f;
      // Sort keys longest first so "ANNUAL_CTC" is replaced before "CTC"
      const keys = Object.keys(context).sort((a, b) => b.length - a.length);
      for (const k of keys) {
        const regex = new RegExp(`\\b${k}\\b`, 'gi');
        expr = expr.replace(regex, String(context[k] || 0));
      }
      // Sanitize: allow only numbers, operators, parentheses, decimal points, spaces
      if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
        return 0;
      }
      return Math.round(Number(Function('"use strict";return (' + expr + ')')()) || 0);
    } catch {
      return 0;
    }
  };

  // Recalculate dynamic values based on CTC input
  const recalculateFromCTC = (ctcStr: string, currentSlabCompIds: string[] = slabComponentIds) => {
    const rawVal = Number(ctcStr) || 0;
    const monthlyGross = rawVal > 100000 ? Math.round(rawVal / 12) : rawVal;
    const annualCTC = monthlyGross * 12;
    
    const context: Record<string, number> = {
      CTC: monthlyGross,
      MONTHLY_CTC: monthlyGross,
      ANNUAL_CTC: annualCTC,
      GROSS: monthlyGross,
      MONTHLY_GROSS: monthlyGross,
      BASIC: Math.round(monthlyGross * 0.50),
      HRA: Math.round(monthlyGross * 0.20),
      PF_RATE: slabPfRate || 12,
    };
    
    const newValues: Record<string, number> = {};

    const targetEarnings = allGroups
      .filter(g => g.category === 'Earning')
      .map(g => ({
        ...g,
        components: g.components.filter(c => isComponentInSlab(c, currentSlabCompIds))
      }))
      .filter(g => g.components.length > 0);

    const targetDeductions = allGroups
      .filter(g => g.category !== 'Earning')
      .map(g => ({
        ...g,
        components: g.components.filter(c => isComponentInSlab(c, currentSlabCompIds))
      }))
      .filter(g => g.components.length > 0);
    
    let foundBasicId: string | null = null;
    let foundHraId: string | null = null;
    let foundPfId: string | null = null;
    let foundPtId: string | null = null;
    let foundSpecialId: string | null = null;

    // First Pass: Resolve Basic
    targetEarnings.forEach(g => {
      g.components.forEach(c => {
        const lowerName = c.name.toLowerCase();
        if (lowerName.includes('basic') && !lowerName.includes('earned')) {
          foundBasicId = c.id;
          if (c.type === 'Derived' && c.formula) {
            newValues[c.id] = Math.round(evaluateComponentFormula(c.formula, context));
          } else {
            newValues[c.id] = Math.round(monthlyGross * 0.50);
          }
          context.BASIC = newValues[c.id] || context.BASIC;
          context[c.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')] = newValues[c.id];
        }
      });
    });

    if (!foundBasicId) {
      context.BASIC = Math.round(monthlyGross * 0.50);
    }

    // Second Pass: Resolve HRA & Other Earnings
    let allocatedEarnings = context.BASIC;
    targetEarnings.forEach(g => {
      g.components.forEach(c => {
        if (c.id === foundBasicId) return;
        const lowerName = c.name.toLowerCase();
        if (lowerName.includes('hra') || lowerName.includes('house rent')) {
          foundHraId = c.id;
          if (c.type === 'Derived' && c.formula) {
            newValues[c.id] = Math.round(evaluateComponentFormula(c.formula, context));
          } else {
            newValues[c.id] = Math.round(context.BASIC * 0.40);
          }
          context.HRA = newValues[c.id] || context.HRA;
          context[c.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')] = newValues[c.id];
          allocatedEarnings += (newValues[c.id] || 0);
        } else if (lowerName.includes('special') || lowerName.includes('standard')) {
          foundSpecialId = c.id;
        } else if (c.type === 'Derived' && c.formula) {
          newValues[c.id] = Math.round(evaluateComponentFormula(c.formula, context));
          context[c.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')] = newValues[c.id];
          allocatedEarnings += (newValues[c.id] || 0);
        } else if (c.type === 'Value') {
          newValues[c.id] = c.amount || 0;
          context[c.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')] = newValues[c.id];
          allocatedEarnings += (newValues[c.id] || 0);
        }
      });
    });

    // Allocate remainder to Special/Standard Allowance
    if (foundSpecialId) {
      newValues[foundSpecialId] = Math.max(0, monthlyGross - allocatedEarnings);
      context.SPECIAL_ALLOWANCE = newValues[foundSpecialId];
      context.STANDARD_ALLOWANCE = newValues[foundSpecialId];
    }

    // Third Pass: Deductions (PF, PT, ESIC, TDS)
    targetDeductions.forEach(g => {
      g.components.forEach(c => {
        const lowerName = c.name.toLowerCase();
        if (lowerName.includes('pf') || lowerName.includes('provident')) {
          foundPfId = c.id;
          const pfWage = Math.min(context.BASIC, 15000);
          newValues[c.id] = Math.round(pfWage * (slabPfRate / 100 || 0.12));
          context.PF = newValues[c.id];
        } else if (lowerName.includes('pt') || lowerName.includes('professional tax')) {
          foundPtId = c.id;
          newValues[c.id] = monthlyGross > 15000 ? 200 : 0;
          context.PT = newValues[c.id];
        } else if (lowerName.includes('esi') || lowerName.includes('esic')) {
          newValues[c.id] = monthlyGross <= 21000 ? Math.ceil(monthlyGross * 0.0075) : 0;
          context.ESIC = newValues[c.id];
        } else if (lowerName.includes('tds') || lowerName.includes('tax')) {
          newValues[c.id] = 0;
          context.TDS = 0;
        } else if (c.type === 'Derived' && c.formula) {
          newValues[c.id] = Math.round(evaluateComponentFormula(c.formula, context));
          context[c.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')] = newValues[c.id];
        } else if (c.type === 'Value') {
          newValues[c.id] = c.amount || 0;
          context[c.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')] = newValues[c.id];
        }
      });
    });

    // Update mapped legacy states for backend saving
    if (foundBasicId) setBasic(String(newValues[foundBasicId] || 0));
    if (foundHraId) setHra(String(newValues[foundHraId] || 0));
    if (foundPfId) {
      setPf(String(newValues[foundPfId] || 0));
      setPfEmployer(String(newValues[foundPfId] || 0));
    }
    if (foundPtId) setPt(String(newValues[foundPtId] || 0));

    setDynamicValues(newValues);
  };

  const handleSalaryInputChange = (val: string) => {
    setSalaryInput(val);
    recalculateFromCTC(val);
  };

  const handleDynamicValueChange = (compId: string, val: string) => {
    setDynamicValues(prev => ({ ...prev, [compId]: Number(val) || 0 }));
  };

  // Computed Totals
  const grossCalculated = activeEarnings.reduce((sum, g) => {
    return sum + g.components.reduce((gSum, c) => gSum + (dynamicValues[c.id] || 0), 0);
  }, 0);

  const totalDeductionCalculated = activeDeductions.reduce((sum, g) => {
    return sum + g.components.reduce((gSum, c) => gSum + (dynamicValues[c.id] || 0), 0);
  }, 0);

  const netSalaryCalculated = Math.max(0, grossCalculated - totalDeductionCalculated);
  const monthlyCtcCalculated = grossCalculated + Number(pfEmployer || 0);
  const annualCtcCalculated = monthlyCtcCalculated * 12;
  const ctcCalculated = annualCtcCalculated;

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    const chosenSlab = allSlabs.find(s => String(s.id) === String(activeSlabId)) || allSlabs[0];
    let compIds: string[] = [];
    if (chosenSlab) {
      setActiveSlabId(String(chosenSlab.id));
      setActiveSlabName(chosenSlab.name || chosenSlab.slab_name || 'Monthly');
      setActiveCycleId((chosenSlab.cycleId || chosenSlab.cycle_id) ? String(chosenSlab.cycleId || chosenSlab.cycle_id) : '');
      const rawPf = chosenSlab.pfRatePct ?? chosenSlab.pf_rate_pct;
      setSlabPfRate(Number(rawPf ?? 12));
      const rawComps = chosenSlab.selectedComponentIds ?? chosenSlab.selected_component_ids;
      try {
        compIds = typeof rawComps === 'string' ? JSON.parse(rawComps) : (rawComps || []);
      } catch {}
      compIds = compIds.map(String);
      setSlabComponentIds(compIds);
    }
    setSalaryInput('40000'); // Default Monthly Gross/CTC
    recalculateFromCTC('40000', compIds);
    const today = new Date().toISOString().split('T')[0];
    setEffectiveFrom(today);
    setArrearPayMonth(today);
    setModalOpen(true);
  };

  const handleOpenEditModal = (rec: PayStructureRecord) => {
    setEditingRecord(rec);
    const matchedSlab = allSlabs.find(s => (s.name || s.slab_name) === rec.slab || String(s.id) === String((rec as any).slabId || (rec as any).slab_id)) || allSlabs[0];
    let compIds: string[] = [];
    if (matchedSlab) {
      setActiveSlabId(String(matchedSlab.id));
      setActiveSlabName(matchedSlab.name || matchedSlab.slab_name || rec.slab);
      setActiveCycleId((matchedSlab.cycleId || matchedSlab.cycle_id) ? String(matchedSlab.cycleId || matchedSlab.cycle_id) : '');
      const rawPf = matchedSlab.pfRatePct ?? matchedSlab.pf_rate_pct;
      setSlabPfRate(Number(rawPf ?? 12));
      const rawComps = matchedSlab.selectedComponentIds ?? matchedSlab.selected_component_ids;
      try {
        compIds = typeof rawComps === 'string' ? JSON.parse(rawComps) : (rawComps || []);
      } catch {}
      compIds = compIds.map(String);
      setSlabComponentIds(compIds);
    }
    const inputVal = rec.gross || (rec.ctc > 100000 ? Math.round(rec.ctc / 12) : rec.ctc) || rec.salaryInput || 40000;
    setSalaryInput(String(inputVal));
    setEffectiveFrom(rec.effectiveFrom);
    setArrearPayMonth(rec.arrearPayMonth || rec.effectiveFrom);
    if (rec.customComponents && Object.keys(rec.customComponents).length > 0) {
      setDynamicValues(rec.customComponents);
    } else {
      recalculateFromCTC(String(inputVal), compIds);
    }
    setModalOpen(true);
  };

  const handleViewModal = (rec: PayStructureRecord) => {
    setViewRecord(rec);
    setViewModalOpen(true);
  };

  const handleDelete = async (rec: PayStructureRecord) => {
    if (!confirm('Are you sure you want to delete this Pay Structure?')) return;
    try {
      await apiClient.delete(`/payroll/salary-structure/${rec.id}`);
      setPayStructures(prev => prev.map(p => p.id === rec.id ? { ...p, status: 'Deleted' } : p));
      showToast.success('Structure deleted successfully');
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const handleSave = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Construct payload with legacy fields (for DB columns) AND custom_components (for dynamic UI)
    const payload = {
      employee_id: employee.id,
      slab: activeSlabName || 'Monthly',
      slab_id: activeSlabId || null,
      cycle_id: activeCycleId || null,
      pf_rate_pct: slabPfRate || 12,
      effective_from: effectiveFrom || todayStr,
      arrear_pay_month: arrearPayMonth || effectiveFrom || todayStr,
      calculation_mode: 'component_based',
      salary_input: Number(salaryInput) || 0,
      
      // Fallback schema mapping
      basic_monthly: Number(basic) || 0,
      hra_monthly: Number(hra) || 0,
      pf_deduction: Number(pf) || 0,
      pt_deduction: Number(pt) || 0,
      esic_deduction: Number(esic) || 0,
      pf_employer: Number(pfEmployer) || 0,
      
      gross_monthly: grossCalculated,
      grossMonthly: grossCalculated,
      total_deductions_monthly: totalDeductionCalculated,
      net_salary_monthly: netSalaryCalculated,
      net_take_home: netSalaryCalculated,
      netTakeHome: netSalaryCalculated,
      annual_ctc: annualCtcCalculated,
      annualCtc: annualCtcCalculated,
      
      // Full Dynamic Payload mapped as JSON
      customComponents: JSON.stringify(dynamicValues)
    };

    try {
      if (editingRecord) {
        await apiClient.put(`/payroll/salary-structure/${editingRecord.id}`, payload);
        showToast.success('Pay structure updated successfully');
      } else {
        await apiClient.post('/payroll/salary-structure', payload);
        showToast.success('New pay structure saved successfully');
      }
      // Re-fetch after save
      const res = await apiClient.get(`/payroll/salary-structure?employee_id=${employee.id}`);
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        const mapped = data.map((s: any) => mapStructureRecord(s, activeSlabName));
        const uniqueMap = new Map<string, PayStructureRecord>();
        mapped.forEach(r => {
          const key = `${r.effectiveFrom}_${r.slab}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, r);
          }
        });
        setPayStructures(Array.from(uniqueMap.values()));
      }
    } catch (err: any) {
      console.error('Error saving pay structure:', err);
      showToast.error('Save Failed', err?.response?.data?.message || 'Could not save this pay structure — it was not saved.');
      return;
    }

    setModalOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ background: '#1e88e5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.2px' }}>Payroll Detail</h2>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div style={{ marginBottom: 14 }}>
            {canEditPayroll ? (
              <button
                onClick={handleOpenAddModal}
                style={{
                  background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4,
                  padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#1e293b',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>+</span> Add Pay Structure
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Salary structure modification is restricted to Organization Admin only (Read-Only for HR).</span>
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 12px', width: 90 }}>Action</th>
                  <th style={{ padding: '10px 12px' }}>Slab Template</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Annual CTC (₹)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Monthly Gross (₹)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Net Take-Home (₹)</th>
                  <th style={{ padding: '10px 12px' }}>Effective From</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payStructures.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No structure records found.</td></tr>
                )}
                {payStructures.map(rec => {
                  const ctcDisplay = rec.ctc || (rec.gross * 12);
                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => handleViewModal(rec)} title="View Breakdown" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e88e5' }}>
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {canEditPayroll && (
                            <>
                              <button onClick={() => handleOpenEditModal(rec)} title="Edit Pay Structure" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(rec)} title="Delete Pay Structure" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>{rec.slab}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        ₹{ctcDisplay.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                        ₹{rec.gross.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                        ₹{rec.netSalary.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>{formatPayrollDate(rec.effectiveFrom)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {rec.status === 'Active' ? <span style={{ color: '#22c55e', background: '#dcfce7', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>Active</span> : <span style={{ color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>Deleted</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-white text-slate-900 border-none shadow-2xl rounded-lg">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Payroll Structure</span>
            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>✕</button>
          </div>

          <div style={{ padding: '16px 24px 20px', maxHeight: '82vh', overflowY: 'auto' }}>
            <div style={{ paddingBottom: 10, borderBottom: '2px solid #00a8a8', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#991b1b', margin: 0 }}>
                Payroll Breakup <span style={{ color: '#b91c1c' }}>[Dynamic Structure]</span>
              </h3>
            </div>

            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>🏷️ Salary Slab:</span>
              <select
                value={activeSlabId}
                onChange={(e) => {
                  const val = e.target.value;
                  const chosen = allSlabs.find(s => String(s.id) === String(val));
                  if (chosen) {
                    const cycleIdVal = chosen.cycleId ?? chosen.cycle_id;
                    const pfRateVal = chosen.pfRatePct ?? chosen.pf_rate_pct;
                    const componentIdsVal = chosen.selectedComponentIds ?? chosen.selected_component_ids;
                    setActiveSlabId(String(chosen.id));
                    setActiveSlabName(chosen.name || chosen.slab_name || 'Monthly');
                    setActiveCycleId(cycleIdVal ? String(cycleIdVal) : '');
                    setSlabPfRate(Number(pfRateVal ?? 12));
                    let parsedCompIds: string[] = [];
                    try {
                      parsedCompIds = typeof componentIdsVal === 'string' ? JSON.parse(componentIdsVal) : (componentIdsVal || []);
                    } catch {}
                    const nextCompIds = parsedCompIds.map(String);
                    setSlabComponentIds(nextCompIds);
                    recalculateFromCTC(salaryInput, nextCompIds);
                  }
                }}
                style={{
                  height: 32, border: '1.5px solid #0284c7', borderRadius: 6, padding: '0 10px',
                  fontSize: 12, fontWeight: 700, background: !canEditPayroll ? '#f1f5f9' : '#ffffff', color: '#0c4a6e',
                  cursor: !canEditPayroll ? 'not-allowed' : 'pointer'
                }}
                disabled={!canEditPayroll}
              >
                {allSlabs.map(s => {
                  const minCtcVal = s.minCtc ?? s.min_ctc;
                  const maxCtcVal = s.maxCtc ?? s.max_ctc;
                  return (
                    <option key={s.id} value={String(s.id)}>
                      🏷️ {s.name || s.slab_name} {minCtcVal ? `(₹${(Number(minCtcVal) / 100000).toFixed(1)}L - ₹${(Number(maxCtcVal || 10000000) / 100000).toFixed(1)}L CTC)` : ''}
                    </option>
                  );
                })}
              </select>
              <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>
                ({slabComponentIds.length} components assigned to this slab)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 16, alignItems: 'flex-start', background: '#f8fafc', padding: 14, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Monthly Gross / CTC Input :</label>
                <input
                  type="number"
                  value={salaryInput}
                  onChange={(e) => handleSalaryInputChange(e.target.value)}
                  readOnly={!canEditPayroll}
                  placeholder="Enter Gross Monthly Salary / CTC"
                  style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, fontWeight: 700, background: !canEditPayroll ? '#f1f5f9' : '#ffffff' }}
                />
                <p style={{ fontSize: 10, color: '#0369a1', fontStyle: 'italic', marginTop: 3, marginBottom: 0 }}>
                  * Modifying this will re-calculate dynamic derived components.
                </p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Effective From :</label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#ffffff' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Arrear Pay Month :</label>
                <input
                  type="date"
                  value={arrearPayMonth}
                  onChange={(e) => setArrearPayMonth(e.target.value)}
                  style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#ffffff' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
              {/* EARNINGS */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ borderTop: '3px solid #22c55e', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: 0 }}>Employee's Earning</h4>
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
                  {activeEarnings.map(group => (
                    <div key={group.id} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>{group.name}</div>
                      {group.components.map(comp => (
                        <div key={comp.id} style={{ marginBottom: 8 }}>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>{comp.name}</label>
                          <input
                            type="number"
                            value={dynamicValues[comp.id] || ''}
                            onChange={(e) => handleDynamicValueChange(comp.id, e.target.value)}
                            readOnly={!group.isEditable}
                            placeholder={comp.name}
                            style={{
                              width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4,
                              padding: '0 10px', fontSize: 12, fontWeight: 600,
                              background: !group.isEditable ? '#f1f5f9' : '#fff',
                              color: !group.isEditable ? '#64748b' : '#0f172a'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                  {activeEarnings.length === 0 && (
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>No earning components assigned to this slab.</p>
                  )}
                </div>
              </div>

              {/* DEDUCTIONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ borderTop: '3px solid #ef4444', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: 0 }}>Employee's Deduction</h4>
                  </div>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
                    {activeDeductions.map(group => (
                      <div key={group.id} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>{group.name}</div>
                        {group.components.map(comp => (
                          <div key={comp.id} style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>{comp.name}</label>
                            <input
                              type="number"
                              value={dynamicValues[comp.id] || ''}
                              onChange={(e) => handleDynamicValueChange(comp.id, e.target.value)}
                              readOnly={!group.isEditable}
                              placeholder={comp.name}
                              style={{
                                width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4,
                                padding: '0 10px', fontSize: 12, fontWeight: 600,
                                background: !group.isEditable ? '#f1f5f9' : '#fff',
                                color: !group.isEditable ? '#64748b' : '#0f172a'
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                    {activeDeductions.length === 0 && (
                      <p style={{ fontSize: 12, color: '#94a3b8' }}>No deduction components assigned to this slab.</p>
                    )}
                  </div>
                </div>

                {/* COMPUTED SUMMARY */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Annual CTC</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#059669' }}>₹{annualCtcCalculated.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Total Monthly Gross</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>₹{grossCalculated.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Total Deductions</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>₹{totalDeductionCalculated.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Net Take Home (Monthly)</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#1e88e5' }}>₹{netSalaryCalculated.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <Button variant="outline" onClick={() => setModalOpen(false)} style={{ fontSize: 12, height: 36, fontWeight: 600 }}>
                {canEditPayroll ? 'Cancel' : 'Close'}
              </Button>
              {canEditPayroll && (
                <Button onClick={handleSave} style={{ fontSize: 12, height: 36, fontWeight: 600, background: '#1e88e5' }}>
                  {editingRecord ? 'Update Structure' : 'Save & Active'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
