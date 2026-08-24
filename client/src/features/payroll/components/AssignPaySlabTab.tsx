import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Building, Building2, GraduationCap, MapPin, Landmark,
  CheckSquare, CheckCircle2, RefreshCw, ChevronDown,
  X, Users, Search, Layers, FileText, Settings, Sliders,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';

const extract = (res: any): any[] => {
  const p = res?.data?.data ?? res?.data;
  if (Array.isArray(p)) return p;
  if (p && typeof p === 'object') {
    if (Array.isArray(p.items)) return p.items;
    if (Array.isArray(p.data)) return p.data;
  }
  return [];
};

interface EmpRow {
  id: number;
  name: string;
  code: string;
  department: string;
  grade: string;
  location: string;
  branch: string;
  companyId?: number | null;
  companyName?: string;
  gender: string;
  slabId: number | null;
  slabName: string | null;
  cycleId?: number | null;
  annualCtc?: number;
}

import { useCompanies } from '@/features/settings/hooks/useCompanies';

export const AssignPaySlabTab: React.FC = () => {
  const { data: companies = [] } = useCompanies();
  const [slabs, setSlabs] = useState<any[]>([]);
  const [allEmps, setAllEmps] = useState<EmpRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCurrentSlab, setFilterCurrentSlab] = useState('');
  const [filterEmpId, setFilterEmpId] = useState('');

  // Bulk assignment
  const [selectedSlabId, setSelectedSlabId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── 2-Option Structure Modal State ──────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [targetEmp, setTargetEmp] = useState<EmpRow | null>(null);
  const [calcMode, setCalcMode] = useState<'salary_input' | 'component_based'>('salary_input');
  const [modalSlabId, setModalSlabId] = useState('');
  const [salaryInput, setSalaryInput] = useState('60000');
  const [modalEffectiveFrom, setModalEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [arrearPayMonth, setArrearPayMonth] = useState(new Date().toISOString().slice(0, 10));

  // Earnings
  const [basic, setBasic] = useState('30000');
  const [hra, setHra] = useState('12000');
  const [standardAllowance, setStandardAllowance] = useState('0');
  const [mealAllowance, setMealAllowance] = useState('0');
  const [communicationAllowance, setCommunicationAllowance] = useState('0');
  const [childrenEduAllowance, setChildrenEduAllowance] = useState('0');
  const [lta, setLta] = useState('18000');

  // Deductions
  const [esic, setEsic] = useState('0');
  const [pt, setPt] = useState('0');
  const [pf, setPf] = useState('0');
  const [pfEmployer, setPfEmployer] = useState('0');
  const [componentDefs, setComponentDefs] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [empRes, slabRes, compRes, defsRes] = await Promise.all([
        apiClient.get('/employees', { params: { pageSize: 500 } }),
        apiClient.get('/payroll/slabs'),
        apiClient.get('/settings/companies').catch(() => null),
        apiClient.get('/payroll/component-definitions').catch(() => ({ data: [] })),
      ]);
      const emps = extract(empRes);
      const slabList = extract(slabRes);
      const defsList = extract(defsRes);

      setSlabs(slabList);
      setComponentDefs(defsList);

      const slabMap: Record<number, string> = {};
      slabList.forEach((s: any) => { slabMap[s.id] = s.name || s.slab_name || `Slab #${s.id}`; });

      setAllEmps(emps.map((e: any): EmpRow => {
        const fn = e.firstName || e.first_name || '';
        const ln = e.lastName || e.last_name || '';
        const full = `${fn} ${ln}`.trim();
        const empSlabId = e.salarySlabId || e.salary_slab_id || null;

        return {
          id: e.id,
          name: full || e.name || e.fullName || e.full_name || e.email || `EMP #${e.id}`,
          code: e.employeeCode || e.employee_code || `EMP-${e.id}`,
          department: e.departmentName || e.department_name || e.department || e.dept || '',
          grade: e.gradeName || e.grade_name || e.grade || e.pay_grade || e.pay_grade_name || e.designationName || e.designation_name || e.designation || e.jobTitle || e.job_title || '',
          location: e.locationName || e.location_name || e.location || e.workLocation || e.work_location || e.city || '',
          branch: e.company_name || e.companyName || e.company || e.branchName || e.branch_name || e.branch || e.entity || '',
          companyId: e.company_id || e.companyId || null,
          companyName: e.company_name || e.companyName || e.company || '',
          gender: e.gender || '',
          slabId: empSlabId,
          slabName: empSlabId ? (slabMap[empSlabId] || `Slab #${empSlabId}`) : null,
          cycleId: e.payrollCycleId || e.payroll_cycle_id || null,
          annualCtc: e.annualCtc || e.annual_ctc || (e.gross_salary ? e.gross_salary * 12 : 0) || 0,
        };
      }));
    } catch {
      showToast.error('Load Failed', 'Could not load employees or slabs.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived filter options
  const unique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort() as string[];
  const depts = unique(allEmps.map(e => e.department));
  const grades = unique(allEmps.map(e => e.grade));
  const locations = unique(allEmps.map(e => e.location));
  const branches = unique(allEmps.map(e => e.branch));

  const filtered = allEmps.filter(e => {
    if (filterEmpId && String(e.id) !== filterEmpId) return false;
    if (filterCompany) {
      const matchId = String(e.companyId) === filterCompany;
      const matchName = e.companyName?.toLowerCase() === filterCompany.toLowerCase();
      const matchBranch = e.branch?.toLowerCase() === filterCompany.toLowerCase();
      if (!matchId && !matchName && !matchBranch) return false;
    }
    if (filterDept && e.department !== filterDept) return false;
    if (filterGrade && e.grade !== filterGrade) return false;
    if (filterLocation && e.location !== filterLocation) return false;
    if (filterBranch && e.branch !== filterBranch) return false;
    if (filterGender && e.gender.toLowerCase() !== filterGender.toLowerCase()) return false;
    if (filterCurrentSlab) {
      if (filterCurrentSlab === '__none__') { if (e.slabId) return false; }
      else if (String(e.slabId) !== filterCurrentSlab) return false;
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (!e.name.toLowerCase().includes(q) && !e.code.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const anyFilter = Boolean(filterCompany || filterDept || filterGrade || filterLocation || filterBranch || filterGender || filterSearch || filterCurrentSlab || filterEmpId);
  const allFilteredSelected = filtered.length > 0 && filtered.every(e => selectedIds.has(e.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach(e => next.delete(e.id));
      else filtered.forEach(e => next.add(e.id));
      return next;
    });
  };
  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const clearFilters = () => {
    setFilterDept(''); setFilterGrade(''); setFilterLocation('');
    setFilterBranch(''); setFilterGender(''); setFilterSearch('');
    setFilterCurrentSlab(''); setFilterEmpId('');
  };

  const handleRemove = async (emp: EmpRow) => {
    try {
      await apiClient.patch(`/employees/${emp.id}`, { salary_slab_id: null, salarySlabId: null });
      showToast.success('Removed', `Slab removed from ${emp.name}`);
      await loadData();
    } catch { showToast.error('Error', 'Could not remove slab.'); }
  };

  // ─── 2-Option Modal Recalculation Helpers ────────────────────────────────────
  const [inputFrequency, setInputFrequency] = useState<'annual' | 'monthly'>('annual');

  const recalculateFromSalaryInput = (inputVal: number, freq?: 'annual' | 'monthly') => {
    if (isNaN(inputVal) || inputVal <= 0) return;
    const activeFreq = freq || inputFrequency;
    const monthlyVal = activeFreq === 'annual' ? Math.round(inputVal / 12) : inputVal;
    const b = Math.round(monthlyVal * 0.5);
    const h = Math.round(b * 0.4);
    const conv = monthlyVal > 25000 ? 1600 : 0;
    const med = monthlyVal > 25000 ? 1250 : 0;
    const l = Math.max(0, monthlyVal - (b + h + conv + med));

    setBasic(String(b));
    setHra(String(h));
    setStandardAllowance(String(conv));
    setMealAllowance(String(med));
    setCommunicationAllowance('0');
    setChildrenEduAllowance('0');
    setLta(String(l));

    const pfVal = Math.min(1800, Math.round(b * 0.12));
    const ptVal = monthlyVal > 15000 ? 200 : 0;
    const esiVal = monthlyVal <= 21000 ? Math.round(monthlyVal * 0.0075) : 0;

    setPf(String(pfVal));
    setPt(String(ptVal));
    setEsic(String(esiVal));
    setPfEmployer(String(pfVal));
  };

  const recalculateFromBasicInput = (basicVal: number) => {
    if (isNaN(basicVal) || basicVal <= 0) return;
    const h = Math.round(basicVal * 0.4);
    setHra(String(h));
    const pfVal = Math.min(1800, Math.round(basicVal * 0.12));
    setPf(String(pfVal));
    setPfEmployer(String(pfVal));

    const estGross = basicVal + h + (Number(standardAllowance) || 0) + (Number(mealAllowance) || 0) + (Number(communicationAllowance) || 0) + (Number(childrenEduAllowance) || 0) + (Number(lta) || 0);
    setEsic(estGross <= 21000 ? String(Math.round(estGross * 0.0075)) : '0');
    setPt(estGross > 15000 ? '200' : '0');
  };

  const handleModeChange = (mode: 'salary_input' | 'component_based') => {
    setCalcMode(mode);
    if (mode === 'salary_input') {
      recalculateFromSalaryInput(Number(salaryInput) || 600000, inputFrequency);
    } else {
      recalculateFromBasicInput(Number(basic) || 25000);
    }
  };

  const handleSalaryInputChange = (val: string, freq?: 'annual' | 'monthly') => {
    setSalaryInput(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) recalculateFromSalaryInput(num, freq || inputFrequency);
  };

  const handleFrequencyChange = (newFreq: 'annual' | 'monthly') => {
    setInputFrequency(newFreq);
    const num = Number(salaryInput) || 0;
    if (num > 0) {
      const converted = newFreq === 'monthly' ? Math.round(num / 12) : num * 12;
      setSalaryInput(String(converted));
      recalculateFromSalaryInput(converted, newFreq);
    }
  };

  const handleBasicChange = (val: string) => {
    setBasic(val);
    if (calcMode === 'component_based') {
      const num = Number(val);
      if (!isNaN(num) && num > 0) recalculateFromBasicInput(num);
    }
  };

  const [targetEmps, setTargetEmps] = useState<EmpRow[]>([]);

  const openStructureModalForSelection = (empList?: EmpRow[]) => {
    let listToAssign: EmpRow[] = [];
    if (empList && empList.length > 0) {
      listToAssign = empList;
    } else if (selectedIds.size > 0) {
      listToAssign = allEmps.filter(e => selectedIds.has(e.id));
    } else if (targetEmp) {
      listToAssign = [targetEmp];
    }

    if (listToAssign.length === 0) {
      showToast.error('No Employee Selected', 'Please select at least one employee to configure payroll structure.');
      return;
    }

    setTargetEmps(listToAssign);
    const firstEmp = listToAssign[0];
    setTargetEmp(firstEmp);

    const activeSlabId = selectedSlabId || (firstEmp.slabId ? String(firstEmp.slabId) : (slabs[0]?.id ? String(slabs[0].id) : ''));
    setModalSlabId(activeSlabId);

    // Fetch existing structure from DB if single employee selected
    if (listToAssign.length === 1) {
      apiClient.get(`/payroll/salary-structure?employee_id=${firstEmp.id}`).then((res: any) => {
        const list = extract(res);
        if (list && list.length > 0) {
          const s = list[0];
          setCalcMode(s.calculation_mode || s.calcMode || 'salary_input');
          setSalaryInput(String(s.gross_monthly || s.salary_input || s.salaryInput || 120000));
          setBasic(String(s.basic_monthly || s.basic || 60000));
          setHra(String(s.hra_monthly || s.hra || 24000));
          setPf(String(s.pf_deduction || s.pf || 1800));
          setPt(String(s.pt_deduction || s.pt || 200));
          setEsic(String(s.esi_deduction || s.esic || 0));
          setPfEmployer(String(s.pf_employer || s.pfEmployer || 1800));
        } else {
          recalculateFromSalaryInput(120000);
        }
      }).catch(() => {
        recalculateFromSalaryInput(120000);
      });
    } else {
      recalculateFromSalaryInput(120000);
    }

    setModalOpen(true);
  };

  const openStructureModal = (emp: EmpRow) => {
    openStructureModalForSelection([emp]);
  };

  const handleAssign = () => {
    if (selectedIds.size === 0) {
      showToast.error('No Selection', 'Please select at least one employee.');
      return;
    }
    openStructureModalForSelection();
  };

  // Calculated totals
  const numBasic = Number(basic) || 0;
  const numHra = Number(hra) || 0;
  const numSa = Number(standardAllowance) || 0;
  const numMa = Number(mealAllowance) || 0;
  const numCa = Number(communicationAllowance) || 0;
  const numCea = Number(childrenEduAllowance) || 0;
  const numLta = Number(lta) || 0;
  const grossCalculated = calcMode === 'salary_input' ? (Number(salaryInput) || 0) : (numBasic + numHra + numSa + numMa + numCa + numCea + numLta);

  const numEsic = Number(esic) || 0;
  const numPt = Number(pt) || 0;
  const numPf = Number(pf) || 0;
  const numPfEmployer = Number(pfEmployer) || 0;
  const totalDeductionCalculated = numEsic + numPt + numPf;

  const netSalaryCalculated = grossCalculated - totalDeductionCalculated;
  const ctcCalculated = grossCalculated + numPfEmployer;

  const handleSaveStructureModal = async () => {
    if (targetEmps.length === 0 && !targetEmp) return;
    const listToSave = targetEmps.length > 0 ? targetEmps : (targetEmp ? [targetEmp] : []);

    setSaving(true);
    try {
      await Promise.all(listToSave.map(async emp => {
        const modalSlabObj = slabs.find(s => String(s.id) === modalSlabId);
        
        const earningsBreakup = [
          { component_id: 1, code: 'BASIC', name: 'Basic Salary', type: 'Formula', amount: numBasic },
          { component_id: 2, code: 'HRA', name: 'House Rent Allowance (HRA)', type: 'Formula', amount: numHra },
          ...(numSa > 0 ? [{ component_id: 4, code: 'STANDARD_ALLOWANCE', name: 'Standard Allowance', type: 'Value', amount: numSa }] : []),
          ...(numMa > 0 ? [{ component_id: 5, code: 'MEAL_ALLOWANCE', name: 'Meal Allowance', type: 'Value', amount: numMa }] : []),
          ...(numCa > 0 ? [{ component_id: 6, code: 'COMMUNICATION_ALLOWANCE', name: 'Communication Allowance', type: 'Value', amount: numCa }] : []),
          ...(numCea > 0 ? [{ component_id: 7, code: 'CHILDREN_EDU_ALLOWANCE', name: 'Children Education Allowance', type: 'Value', amount: numCea }] : []),
          ...(numLta > 0 ? [{ component_id: 8, code: 'LTA', name: 'Leave Travel Allowance (LTA)', type: 'Value', amount: numLta }] : []),
        ];

        const specialAllowanceVal = Math.max(0, grossCalculated - earningsBreakup.reduce((acc, cur) => acc + cur.amount, 0));
        if (specialAllowanceVal > 0) {
          earningsBreakup.push({ component_id: 3, code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance', type: 'Derived', amount: specialAllowanceVal });
        }

        const deductionsBreakup = [
          ...(numPf > 0 ? [{ component_id: 9, code: 'PF', name: 'Employee Provident Fund (EPF)', type: 'Formula', amount: numPf }] : []),
          ...(numPt > 0 ? [{ component_id: 11, code: 'PT', name: 'Professional Tax', type: 'Value', amount: numPt }] : []),
          ...(numEsic > 0 ? [{ component_id: 10, code: 'ESIC', name: 'Employee State Insurance (ESIC)', type: 'Formula', amount: numEsic }] : []),
        ];

        const payload = {
          employee_id: emp.id,
          company_id: emp.companyId || null,
          companyId: emp.companyId || null,
          slab_id: modalSlabId ? Number(modalSlabId) : emp.slabId,
          cycle_id: modalSlabObj?.cycle_id || null,
          cycleId: modalSlabObj?.cycle_id || null,
          effective_from: modalEffectiveFrom,
          arrear_pay_month: arrearPayMonth,
          calculation_mode: calcMode,
          salary_input: Number(salaryInput) || 0,
          basic_monthly: numBasic,
          hra_monthly: numHra,
          special_allowance_monthly: specialAllowanceVal,
          standard_allowance_monthly: numSa,
          meal_allowance_monthly: numMa,
          communication_allowance_monthly: numCa,
          children_edu_allowance_monthly: numCea,
          lta_monthly: numLta,
          esi_deduction: numEsic,
          pt_deduction: numPt,
          pf_deduction: numPf,
          pf_employer: numPfEmployer,
          gross_monthly: grossCalculated,
          total_deductions: totalDeductionCalculated,
          total_deductions_monthly: totalDeductionCalculated,
          net_take_home: netSalaryCalculated,
          annual_ctc: ctcCalculated * 12,
          earnings_breakup: earningsBreakup,
          deductions_breakup: deductionsBreakup
        };

        await apiClient.post('/payroll/salary-structure', payload).catch(() => {});
        if (modalSlabId) {
          await apiClient.patch(`/employees/${emp.id}`, { salary_slab_id: Number(modalSlabId), salarySlabId: Number(modalSlabId) });
        }
      }));

      const slabName = modalSlabObj?.name || 'Selected Slab';
      showToast.success('Payroll Structure & Slab Saved!', `Structure and "${slabName}" assigned to ${listToSave.length} employee(s).`);
      setModalOpen(false);
      clearSelection();
      setSelectedSlabId('');
      await loadData();
    } catch (err: any) {
      showToast.error('Save Failed', err?.message || 'Could not save pay structure.');
    } finally {
      setSaving(false);
    }
  };

  const selectedSlab = slabs.find(s => String(s.id) === selectedSlabId);
  const modalSlabObj = slabs.find(s => String(s.id) === modalSlabId);
  const sel = 'w-full appearance-none border border-border rounded-lg px-3 py-1.5 pr-8 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-8';

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-black text-foreground">Assign Pay Slab & Configure Components</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bulk assign slabs OR click ⚙️ Structure on any employee row for full 2-Option Payroll Breakup (Salary Input vs Component Based).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-[10px] font-bold border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            {allEmps.filter(e => e.slabId).length} / {allEmps.length} Assigned
          </span>
          <button onClick={loadData} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted/30 transition-all cursor-pointer">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="border border-border/60 rounded-xl bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Search className="w-3 h-3" /> Filter Employees
          </p>
          {anyFilter && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-500 transition-colors cursor-pointer">
              <X className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2">
          {/* Employee Dropdown Filter */}
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10 pointer-events-none" />
            <select
              value={filterEmpId}
              onChange={e => {
                const val = e.target.value;
                setFilterEmpId(val);
              }}
              className={`${sel} pl-8 font-semibold`}
            >
              <option value="">All Employees</option>
              {allEmps.map(e => (
                <option key={e.id} value={String(e.id)}>{e.code} — {e.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {/* Company Filter Dropdown */}
          <div className="relative">
            <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10 pointer-events-none" />
            <select
              value={filterCompany}
              onChange={e => setFilterCompany(e.target.value)}
              className={`${sel} pl-8 font-semibold`}
            >
              <option value="">All Companies</option>
              {companies.map((c: any) => {
                const cName = c.company_name || c.name || c.companyName || `Company #${c.company_id || c.id}`;
                const cVal = String(c.company_id || c.id || cName);
                return <option key={cVal} value={cVal}>{cName}</option>;
              })}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {/* Search Name/Code */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input placeholder="Search Name/Code…" value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
              className="w-full border border-border rounded-lg pl-7 pr-3 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-8 font-semibold" />
          </div>
          {/* Department */}
          <div className="relative">
            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10 pointer-events-none" />
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className={`${sel} pl-8`}>
              <option value="">All Departments</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {/* Grade */}
          <div className="relative">
            <GraduationCap className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10 pointer-events-none" />
            <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className={`${sel} pl-8`}>
              <option value="">All Grades</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {/* Location */}
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10 pointer-events-none" />
            <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className={`${sel} pl-8`}>
              <option value="">All Locations</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {/* Branch */}
          <div className="relative">
            <Landmark className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10 pointer-events-none" />
            <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className={`${sel} pl-8`}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {/* Gender */}
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10 pointer-events-none" />
            <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className={`${sel} pl-8`}>
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {/* Current Assigned Slab filter */}
          <div className="relative">
            <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10 pointer-events-none" />
            <select value={filterCurrentSlab} onChange={e => setFilterCurrentSlab(e.target.value)} className={`${sel} pl-8`}>
              <option value="">All Slabs</option>
              <option value="__none__">⚠ Not Assigned</option>
              {slabs.map((s: any) => (
                <option key={s.id} value={String(s.id)}>{s.name || s.slab_name || `Slab #${s.id}`}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bulk Assign Bar — shows when employees selected */}
      {someSelected && (
        <div className="flex items-center gap-3 flex-wrap border border-primary/30 bg-primary/5 rounded-xl p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-xs font-bold text-primary whitespace-nowrap">
            <Users className="w-4 h-4" />
            {selectedIds.size} employee{selectedIds.size !== 1 ? 's' : ''} selected
          </span>

          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <div className="relative min-w-[220px]">
              <CheckSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10 pointer-events-none" />
              <select value={selectedSlabId} onChange={e => setSelectedSlabId(e.target.value)}
                className="w-full appearance-none border border-border rounded-lg pl-8 pr-8 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-9">
                <option value="">— Select Pay Slab —</option>
                {slabs.map((s: any) => (
                  <option key={s.id} value={String(s.id)}>{s.name || s.slab_name || `Slab #${s.id}`}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>

            <input type="date" value={effectiveFrom ? String(effectiveFrom).slice(0, 10) : ''} onChange={e => setEffectiveFrom(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-9" />

            {selectedSlab && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 whitespace-nowrap">
                → {selectedSlab.name}
              </span>
            )}
          </div>

          <button onClick={handleAssign} disabled={saving || !selectedSlabId}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-bold px-5 py-2.5 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-sm">
            <CheckSquare className="w-3.5 h-3.5" />
            {saving ? 'Assigning…' : 'Assign Pay Slab'}
          </button>
          <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-red-500 transition-colors cursor-pointer flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}

      {/* Employee Table */}
      <div className="rounded-xl border border-border/60 overflow-x-auto bg-card shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="p-3 w-10 text-center">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="w-3.5 h-3.5 accent-primary cursor-pointer" />
              </th>
              <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wide">Code</th>
              <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wide">Employee Name</th>
              <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wide">Department</th>
              <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wide">Grade</th>
              <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wide">Location</th>
              <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wide">Branch</th>
              <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wide">Assigned Slab</th>
              <th className="text-left p-3 font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loadingData ? (
              <tr><td colSpan={9} className="p-10 text-center">
                <div className="flex flex-col items-center gap-2 opacity-50 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin" /> Loading…
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="p-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Users className="w-8 h-8 opacity-20" />
                  <p>No employees match filters.</p>
                  {anyFilter && <button onClick={clearFilters} className="text-primary text-xs underline cursor-pointer">Clear filters</button>}
                </div>
              </td></tr>
            ) : (
              filtered.map(emp => {
                const isSel = selectedIds.has(emp.id);
                return (
                  <tr key={emp.id} onClick={() => toggleOne(emp.id)}
                    className={`cursor-pointer transition-colors ${isSel ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/20'}`}>
                    <td className="p-3 text-center" onClick={ev => ev.stopPropagation()}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleOne(emp.id)} className="w-3.5 h-3.5 accent-primary cursor-pointer" />
                    </td>
                    <td className="p-3 font-mono font-bold text-primary">{emp.code}</td>
                    <td className="p-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        {emp.name}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{emp.department || '—'}</td>
                    <td className="p-3 text-muted-foreground">{emp.grade || '—'}</td>
                    <td className="p-3 text-muted-foreground">{emp.location || '—'}</td>
                    <td className="p-3 text-muted-foreground">{emp.branch || '—'}</td>
                    <td className="p-3" onClick={ev => ev.stopPropagation()}>
                      {emp.slabName ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5" /> {emp.slabName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-600 px-2.5 py-0.5 text-[10px] font-bold border border-amber-200">
                          ⚠ Not Assigned
                        </span>
                      )}
                    </td>
                    <td className="p-3" onClick={ev => ev.stopPropagation()}>
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => openStructureModal(emp)}
                          className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-bold transition-all cursor-pointer"
                          title="Configure 2-Option Pay Breakup & Components"
                        >
                          <Settings className="w-3 h-3" /> 2-Options Breakup
                        </button>
                        <button onClick={() => { setSelectedIds(new Set([emp.id])); if (emp.slabId) setSelectedSlabId(String(emp.slabId)); }}
                          className="text-[11px] text-primary font-semibold hover:underline cursor-pointer">Change Slab</button>
                        {emp.slabId && (
                          <button onClick={() => handleRemove(emp)}
                            className="text-[11px] text-red-500 font-semibold hover:underline cursor-pointer">Remove</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {!loadingData && filtered.length > 0 && (
          <div className="border-t border-border/60 px-4 py-2.5 bg-muted/10 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Showing <strong>{filtered.length}</strong> employee{filtered.length !== 1 ? 's' : ''}{anyFilter ? ` (filtered from ${allEmps.length})` : ''}</span>
            {someSelected && <span className="text-primary font-bold">{selectedIds.size} selected</span>}
          </div>
        )}
      </div>

      {/* ─── 2-OPTION PAYROLL BREAKUP MODAL (EXACT SAME AS PROFILE) ─── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-white text-slate-900 border-none shadow-2xl rounded-lg">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Payroll Structure — {targetEmps.length > 1 ? `Bulk Allocation (${targetEmps.length} Employees Selected)` : `${targetEmp?.code || ''} (${targetEmp?.name || ''})`}
              </span>
            </div>
            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer">✕</button>
          </div>

          <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
            {/* Title Banner */}
            <div className="border-b-2 border-teal-600 pb-2">
              <h3 className="text-sm font-bold text-red-900 m-0">
                Payroll Breakup <span className="text-red-700">[Monthly Salary Structure & Component Breakdown]</span>
              </h3>
            </div>

            {/* Slab Info Bar */}
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 flex items-center gap-4 flex-wrap text-xs">
              <span className="font-bold text-sky-900">🏷️ Pay Slab:</span>
              <div className="relative min-w-[200px]">
                <select
                  value={modalSlabId}
                  onChange={e => setModalSlabId(e.target.value)}
                  className="w-full border border-sky-300 rounded px-2 py-1 text-xs font-bold bg-white text-sky-950 focus:outline-none"
                >
                  <option value="">-- Select Slab --</option>
                  {(targetEmp?.companyId
                    ? slabs.filter((s: any) => !(s.companyId ?? s.company_id) || String(s.companyId ?? s.company_id) === String(targetEmp.companyId))
                    : slabs
                  ).map((s: any) => (
                    <option key={s.id} value={String(s.id)}>{s.name || s.slab_name || `Slab #${s.id}`}</option>
                  ))}
                </select>
              </div>
              {modalSlabObj && (
                <span className="text-[11px] font-semibold text-sky-800 bg-sky-100 px-2 py-0.5 rounded border border-sky-300">
                  Frequency: {modalSlabObj.cycle_name || modalSlabObj.frequency || 'Monthly'}
                </span>
              )}
            </div>

            {/* CTC / Salary Input & Dates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-sky-50/70 p-4 rounded-lg border border-sky-200">
              {/* Salary Input with Frequency Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">Salary Input :</label>
                  <div className="inline-flex rounded p-0.5 bg-sky-200/60 border border-sky-300">
                    <button
                      type="button"
                      onClick={() => handleFrequencyChange('annual')}
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer ${
                        inputFrequency === 'annual'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-sky-900 hover:text-slate-900'
                      }`}
                    >
                      Annual CTC (₹/yr)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFrequencyChange('monthly')}
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer ${
                        inputFrequency === 'monthly'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-sky-900 hover:text-slate-900'
                      }`}
                    >
                      Monthly Gross (₹/mo)
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={salaryInput}
                  onChange={e => handleSalaryInputChange(e.target.value)}
                  placeholder={inputFrequency === 'annual' ? 'e.g. 600000' : 'e.g. 50000'}
                  className="w-full h-8 border border-slate-300 rounded px-2 text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[10px] text-sky-800 font-semibold mt-1 mb-0">
                  {inputFrequency === 'annual'
                    ? `Monthly Gross: ₹${Math.round((Number(salaryInput) || 0) / 12).toLocaleString('en-IN')}/mo`
                    : `Annual CTC: ₹${((Number(salaryInput) || 0) * 12).toLocaleString('en-IN')}/yr`}
                </p>
              </div>

              {/* Effective From */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Effective From :</label>
                <input
                  type="date"
                  value={modalEffectiveFrom ? String(modalEffectiveFrom).slice(0, 10) : ''}
                  onChange={e => setModalEffectiveFrom(e.target.value)}
                  className="w-full h-8 border border-slate-300 rounded px-2 text-xs bg-white"
                />
              </div>

              {/* Arrear Pay Month */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Arrear Pay Month :</label>
                <input
                  type="date"
                  value={arrearPayMonth ? String(arrearPayMonth).slice(0, 10) : ''}
                  onChange={e => setArrearPayMonth(e.target.value)}
                  className="w-full h-8 border border-slate-300 rounded px-2 text-xs bg-white"
                />
              </div>
            </div>

            {/* 2-Column Earnings & Deductions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* LEFT COLUMN: Employee's Earning */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="border-t-4 border-emerald-500 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Employee's Earning (Calculated as per Pay Slab)</h4>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Basic</label>
                    <input
                      type="number"
                      value={basic}
                      onChange={e => handleBasicChange(e.target.value)}
                      className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">HRA</label>
                    <input
                      type="number"
                      value={hra}
                      onChange={e => setHra(e.target.value)}
                      className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Standard Allowance</label>
                    <input
                      type="number"
                      value={standardAllowance}
                      onChange={e => setStandardAllowance(e.target.value)}
                      className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Meal Allowance</label>
                    <input
                      type="number"
                      value={mealAllowance}
                      onChange={e => setMealAllowance(e.target.value)}
                      className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Communication Allowance</label>
                    <input
                      type="number"
                      value={communicationAllowance}
                      onChange={e => setCommunicationAllowance(e.target.value)}
                      className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Children Education Allowance / LTA</label>
                    <input
                      type="number"
                      value={lta}
                      onChange={e => setLta(e.target.value)}
                      className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Deductions & Employer Contribution */}
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="border-t-4 border-red-500 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                    <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">Employee's Deduction</h4>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">ESIC</label>
                      <input
                        type="number"
                        value={esic}
                        onChange={e => setEsic(e.target.value)}
                        className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">PT</label>
                      <input
                        type="number"
                        value={pt}
                        onChange={e => setPt(e.target.value)}
                        className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">PF</label>
                      <input
                        type="number"
                        value={pf}
                        onChange={e => setPf(e.target.value)}
                        className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-amber-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="border-t-4 border-amber-500 px-4 py-2.5 border-b border-amber-100 bg-amber-50/50">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Employer's Contribution</h4>
                  </div>
                  <div className="p-4">
                    <label className="text-xs font-bold text-slate-700 block mb-1">PF Employer</label>
                    <input
                      type="number"
                      value={pfEmployer}
                      onChange={e => setPfEmployer(e.target.value)}
                      className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Totals Summary Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900 text-white rounded-lg p-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Gross Monthly</span>
                <span className="text-base font-black text-emerald-400">₹{grossCalculated.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Deductions</span>
                <span className="text-base font-black text-red-400">₹{totalDeductionCalculated.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Net Salary Monthly</span>
                <span className="text-base font-black text-sky-400">₹{netSalaryCalculated.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Annual CTC</span>
                <span className="text-base font-black text-amber-400">
                  ₹{((salaryInput && Number(salaryInput) > 0)
                    ? (inputFrequency === 'annual' ? Number(salaryInput) : Number(salaryInput) * 12)
                    : grossCalculated * 12
                  ).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStructureModal}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5" /> Save Pay Structure & Slab
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignPaySlabTab;
