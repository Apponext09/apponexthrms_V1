import React, { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
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
  TrendingDown
} from 'lucide-react';
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
  calcType: 'fixed' | 'percentage';
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

  const [activeTab, setActiveTab] = useState<'present' | 'assign' | 'mapping' | 'tax'>('present');

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
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().slice(0, 10));
  const [inputCtc, setInputCtc] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);


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
  const [newCompCalcType, setNewCompCalcType] = useState<'fixed' | 'percentage'>('fixed');
  const [newCompValue, setNewCompValue] = useState<string>('');

  const [selectedFormDept, setSelectedFormDept] = useState<string>('all');
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);

  const [dbDepartments, setDbDepartments] = useState<string[]>([]);
  const [payrollSlabs, setPayrollSlabs] = useState<any[]>([]);
  const [selectedSlabId, setSelectedSlabId] = useState<string>('');

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

    // 2. Fetch live Master Pay Components from Master Settings
    apiClient.get('/payroll/components').then((res: any) => {
      const comps = res.data?.data || res.data || [];
      if (Array.isArray(comps) && comps.length > 0) {
        const formattedComps: CustomComponent[] = comps.map((c: any) => ({
          id: String(c.id),
          name: c.component_name || c.name,
          type: (c.component_type || c.type || 'earning').toLowerCase() as any,
          calcType: c.calculation_type === 'percentage' || c.calcType === 'percentage' ? 'percentage' : 'fixed',
          value: Number(c.default_amount || c.defaultAmount || c.amount || 0),
          monthlyAmount: Number(c.default_amount || c.defaultAmount || c.amount || 0),
          enabled: true
        }));
        setCustomComponents(prev => {
          if (prev.length === 0) return formattedComps;
          return prev;
        });
      }
    }).catch(() => {});

    // Fetch payroll slabs for the "Load from Slab" dropdown
    apiClient.get('/payroll/slabs').then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((s: any) => {
          let depts: string[] = []; try { depts = typeof s.departments === 'string' ? JSON.parse(s.departments) : (s.departments || []); } catch {}
          const hasPf = Array.isArray(s.selected_component_ids)
            ? (s.selected_component_ids as string[]).some((id: string) => id.toLowerCase().includes('pf'))
            : true;
          const hasEsi = Array.isArray(s.selected_component_ids)
            ? (s.selected_component_ids as string[]).some((id: string) => id.toLowerCase().includes('esi'))
            : true;
          const isIntern = (s.name || '').toLowerCase().includes('intern');
          return {
            id: String(s.id),
            name: s.name || 'Payroll Slab',
            departments: depts,
            minCtc: Number(s.min_ctc || 0),
            maxCtc: Number(s.max_ctc || 10000000),
            pfEnabled: !isIntern && hasPf,
            esiEnabled: !isIntern && hasEsi,
            healthInsuranceEnabled: !isIntern,
            isActive: Boolean(s.is_active ?? true)
          };
        });
        setPayrollSlabs(mapped);
      }
    }).catch(() => {});

    // 3. Fetch live departments
    apiClient.get('/settings/departments').then((res: any) => {
      const depts = res.data?.data || res.data || [];
      if (Array.isArray(depts) && depts.length > 0) {
        const names = depts.map((d: any) => d.name || d.department_name).filter(Boolean);
        setDbDepartments(names);
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
            assignedEmpName: s.assigned_first_name ? `${s.assigned_first_name} ${s.assigned_last_name || ''}`.trim() : (s.employee_name || s.employeeName),
            assignedEmpCode: s.assigned_employee_code || s.employee_code || s.employeeCode,
            gradeCode: s.grade_code || s.structure_code || `GRADE-${(s.structure_name || s.structureName || 'STD').slice(0, 3).toUpperCase()}`,
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
  const basicMonthly = basicEnabled ? Math.round(grossMonthly * ((parseFloat(basicPct) || 50) / 100)) : 0;
  const hraMonthly = hraEnabled ? Math.round((basicEnabled ? basicMonthly : grossMonthly) * ((parseFloat(hraPct) || 40) / 100)) : 0;
  const specialAllowanceMonthly = specialEnabled ? Math.round((basicEnabled ? basicMonthly : grossMonthly) * ((parseFloat(specialPct) || 20) / 100)) : 0;
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
      const newItem: SalaryStructureItem = {
        id: Date.now(),
        gradeCode: `GRADE-${structureName.slice(0, 3).toUpperCase()}`,
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
      const payload = {
        employeeId: selectedEmp.id,
        structureName,
        structureCode,
        gradeCode: structureCode,
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
    setStructureCode(item.gradeCode || (item as any).structureCode || (item as any).structure_code || '');
    setEffectiveFrom(item.effectiveFrom || new Date().toISOString().slice(0, 10));
    setSelectedTemplate(item.structureName);
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


  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground tracking-tight">Salary Structure & CTC Configurator</h2>
            <p className="text-xs text-muted-foreground">
              Define formula-based earnings, statutory PF/ESI deductions, and assign CTC structures to employees.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setStructureName('');
            setStructureCode('');
            setInputCtc('');
            setCustomComponents([]);
            setShowAddComponent(false);
            setNewCompName('');
            setNewCompValue('');
            setNewCompType('earning');
            setNewCompCalcType('fixed');
            setActiveTab('present');
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-xs font-bold flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Structure
        </Button>
      </div>

      {/* 3 Sub-Tabs Navigation Bar */}
      <div className="flex border-b border-border/60 overflow-x-auto">
        {[
          { key: 'present', label: '1. Present Structures', icon: Building },
          { key: 'assign', label: '2. Assign to Employee', icon: UserCheck },
          { key: 'mapping', label: '3. Employee Mapping', icon: Layers },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${activeTab === key
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
          >
            <Icon className={`w-3.5 h-3.5 ${activeTab === key ? 'text-primary' : 'text-muted-foreground'}`} />
            {label}
          </button>
        ))}
      </div>

      {successMsg ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 animate-fade-in font-medium text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      ) : null}




      {/* TAB 2: Assign Salary Structure to Employee Only */}
      {activeTab === 'assign' && (
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardHeader className="bg-muted/20 border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <UserCheck className="w-4 h-4 text-primary" /> Assign Salary Structure to Employee
            </CardTitle>
            <CardDescription className="text-xs">Select department, select employee, and choose an active salary structure template to assign instantly.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* 1. Department Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-primary" /> Filter Department
                </label>
                <select
                  value={assignFormDept}
                  onChange={(e) => {
                    setAssignFormDept(e.target.value);
                    setAssignEmpId('');
                  }}
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer shadow-2xs"
                >
                  <option value="all">All Departments</option>
                  {uniqueDepartments.map((dept, idx) => (
                    <option key={idx} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Employee Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-primary" /> Select Employee *
                </label>
                <select
                  value={assignEmpId}
                  onChange={(e) => setAssignEmpId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold cursor-pointer shadow-2xs"
                >
                  <option value="">— Select Employee —</option>
                  {employees
                    .filter(e => assignFormDept === 'all' || (e.department && e.department.toLowerCase().includes(assignFormDept.toLowerCase())))
                    .map(e => (
                      <option key={e.id} value={String(e.id)}>
                        {e.name} ({e.code}) — {e.department || 'General'}
                      </option>
                    ))}
                </select>
              </div>

              {/* 3. Structure Template Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-primary" /> Select Salary Structure Template *
                </label>
                <select
                  value={assignTemplateName}
                  onChange={(e) => setAssignTemplateName(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold cursor-pointer shadow-2xs"
                >
                  {availableTemplates.length === 0 ? (
                    <option value="">— No Salary Structures Created Yet —</option>
                  ) : (
                    availableTemplates.map((tpl, i) => (
                      <option key={i} value={tpl}>
                        {tpl}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* 4. Effective From Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Effective From Date *
                </label>
                <Input
                  type="date"
                  value={assignEffectiveFrom}
                  onChange={(e) => setAssignEffectiveFrom(e.target.value)}
                  className="h-9 text-xs font-bold bg-background border-border"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button onClick={handleAssignToEmployee} className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-xs">
                <UserCheck className="w-3.5 h-3.5" /> Assign Salary Structure to Employee
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {/* TAB 3: Employee Salary Structure Mapping */}
      {activeTab === 'mapping' && (
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

                {/* ── Load from Payroll Slab ─────────────────────────────────── */}
                {payrollSlabs.length > 0 && (
                  <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Load from Payroll Slab</span>
                    </div>
                    <select
                      value={selectedSlabId}
                      onChange={(e) => {
                        const slabId = e.target.value;
                        setSelectedSlabId(slabId);
                        const slab = payrollSlabs.find(s => s.id === slabId);
                        if (slab) {
                          setPfEnabled(slab.pfEnabled);
                          setEsiEnabled(slab.esiEnabled);
                          setHealthInsuranceEnabled(slab.healthInsuranceEnabled);
                          if (slab.minCtc > 0 && !inputCtc) setInputCtc(String(slab.minCtc));
                        }
                      }}
                      className="flex h-8 rounded-md border border-indigo-300 bg-white px-3 py-1 text-xs text-indigo-900 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer min-w-[220px]"
                    >
                      <option value="">— Select a Slab to Auto-Configure —</option>
                      {payrollSlabs.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.departments.length > 0 ? `(${s.departments.slice(0,2).join(', ')})` : ''} · ₹{(s.minCtc/100000).toFixed(1)}L–₹{(s.maxCtc/100000).toFixed(1)}L
                        </option>
                      ))}
                    </select>
                    {selectedSlabId && (() => {
                      const slab = payrollSlabs.find(s => s.id === selectedSlabId);
                      if (!slab) return null;
                      return (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            slab.pfEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                          }`}>{slab.pfEnabled ? '✓' : '✗'} PF</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            slab.esiEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                          }`}>{slab.esiEnabled ? '✓' : '✗'} ESI</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            slab.healthInsuranceEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                          }`}>{slab.healthInsuranceEnabled ? '✓' : '✗'} Health Ins.</span>
                        </div>
                      );
                    })()}
                    <span className="text-[10px] text-indigo-500 ml-auto italic">Slab auto-sets statutory deduction toggles below ↓</span>
                  </div>
                )}

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
                              className={`flex-1 h-8 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                                newCompType === 'earning'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                  : 'bg-background text-slate-600 border-border hover:border-emerald-400'
                              }`}
                            >
                              <TrendingUp className="w-3.5 h-3.5" /> (+) Earning
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewCompType('deduction')}
                              className={`flex-1 h-8 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                                newCompType === 'deduction'
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
                              className={`flex-1 h-8 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                                newCompCalcType === 'fixed'
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-background text-slate-600 border-border hover:border-indigo-400'
                              }`}
                            >
                              ₹ Fixed
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewCompCalcType('percentage')}
                              className={`flex-1 h-8 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                                newCompCalcType === 'percentage'
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
                            className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition ${
                              !isEnabled
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
                                <Badge className={`text-[9px] px-1 py-0 font-bold ${
                                  !isEnabled ? 'bg-slate-200 text-slate-500' : isEarning ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'
                                }`}>
                                  {isEnabled ? (isEarning ? '+' : '−') : 'Off'}
                                </Badge>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {comp.calcType === 'percentage' ? `${comp.value}% of Basic` : `₹${comp.value.toLocaleString('en-IN')} flat`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-extrabold ${
                                !isEnabled ? 'text-slate-400 line-through' : isEarning ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
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




          <Card className="border border-border/80 shadow-xs bg-card">
            <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Present Salary Structures & CTC Allocations
                </CardTitle>
                <CardDescription className="text-xs">Manage active CTC allocations and monthly component breakdowns for real employees.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                  {structuresList.length} Active Structures
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                    <tr>
                      <th className="px-4 py-2.5 min-w-[200px]">Structure Template Name</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Pay Grade Code</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Effective From</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Assigned Employee</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Annual CTC</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Gross Monthly</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Net Take-Home</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Breakdown</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {structuresList.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-bold text-foreground text-xs leading-snug">
                            {item.structureName}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                            <Badge variant="outline" className="font-bold bg-primary/10 text-primary border-primary/20 uppercase text-[10px] px-2 py-0.5">
                              {item.gradeCode || 'GRADE-STD'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">
                            {item.effectiveFrom || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
                            {item.assignedEmpName ? (
                              <div className="flex items-center gap-1 text-foreground font-bold">
                                <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{item.assignedEmpName}</span>
                                {item.assignedEmpCode ? <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{item.assignedEmpCode}</span> : null}
                              </div>
                            ) : (
                              <span className="text-muted-foreground font-normal italic">Unassigned</span>
                            )}
                          </td>

                          <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">
                            ₹{(item.annualCtc / 100000).toFixed(2)} Lakhs / yr
                          </td>
                          <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">
                            ₹{item.grossMonthly.toLocaleString('en-IN')}/mo
                          </td>
                          <td className="px-4 py-3 font-black text-emerald-600 whitespace-nowrap">
                            ₹{item.netTakeHome.toLocaleString('en-IN')}/mo
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
                              Active Template
                            </Badge>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                              className="h-7 text-[10px] font-bold px-2.5 gap-1"
                            >
                              {expandedId === item.id ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />}
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
                                  <span>Edit Structure</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickTaxEdit(item)} className="text-xs font-bold gap-2 cursor-pointer">
                                  <Percent className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Tax Edit</span>
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
                                    <span className="text-muted-foreground font-semibold block text-[10px]">Basic Pay (50%)</span>
                                    <div className="font-extrabold text-foreground mt-0.5 text-xs">₹{item.basicMonthly.toLocaleString('en-IN')}</div>
                                  </div>
                                  <div className="bg-card p-2 rounded-lg border border-border/60">
                                    <span className="text-muted-foreground font-semibold block text-[10px]">HRA (40%)</span>
                                    <div className="font-extrabold text-foreground mt-0.5 text-xs">₹{item.hraMonthly.toLocaleString('en-IN')}</div>
                                  </div>
                                  <div className="bg-card p-2 rounded-lg border border-border/60">
                                    <span className="text-muted-foreground font-semibold block text-[10px]">Special Allowance</span>
                                    <div className="font-extrabold text-foreground mt-0.5 text-xs">₹{item.specialAllowanceMonthly.toLocaleString('en-IN')}</div>
                                  </div>
                                  <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/50 dark:border-rose-900/40">
                                    <span className="text-rose-600 font-semibold block text-[10px]">Provident Fund (PF 12%)</span>
                                    <div className="font-extrabold text-rose-600 mt-0.5 text-xs">−₹{item.pfDeduction.toLocaleString('en-IN')}</div>
                                  </div>
                                  <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/50 dark:border-rose-900/40">
                                    <span className="text-rose-600 font-semibold block text-[10px]">ESI Contribution</span>
                                    <div className="font-extrabold text-rose-600 mt-0.5 text-xs">
                                      {item.esiDeduction > 0 ? `−₹${item.esiDeduction.toLocaleString('en-IN')}` : 'Exempt (Above 21K)'}
                                    </div>
                                  </div>
                                  <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/50 dark:border-rose-900/40">
                                    <span className="text-rose-600 font-semibold block text-[10px]">Estimated TDS Tax</span>
                                    <div className="font-extrabold text-rose-600 mt-0.5 text-xs">−₹{item.tdsDeduction.toLocaleString('en-IN')}</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SalaryStructureManagement;





