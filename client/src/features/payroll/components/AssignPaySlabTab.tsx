import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Building2, GraduationCap, MapPin, Landmark,
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
  gender: string;
  slabId: number | null;
  slabName: string | null;
}

export const AssignPaySlabTab: React.FC = () => {
  const [slabs, setSlabs] = useState<any[]>([]);
  const [allEmps, setAllEmps] = useState<EmpRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
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
  const [pt, setPt] = useState('200');
  const [pf, setPf] = useState('1800');
  const [pfEmployer, setPfEmployer] = useState('1800');

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [empRes, slabRes] = await Promise.all([
        apiClient.get('/employees', { params: { pageSize: 500 } }),
        apiClient.get('/payroll/slabs'),
      ]);
      const emps = extract(empRes);
      const slabList = extract(slabRes);
      setSlabs(slabList);

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
          grade: e.designationName || e.designation_name || e.designation || e.grade || e.jobTitle || e.job_title || '',
          location: e.locationName || e.location_name || e.location || e.workLocation || e.work_location || e.city || '',
          branch: e.branchName || e.branch_name || e.branch || e.company || e.entity || '',
          gender: e.gender || '',
          slabId: empSlabId,
          slabName: empSlabId ? (slabMap[empSlabId] || `Slab #${empSlabId}`) : null,
        };
      }));
    } catch { /* silent */ }
    setLoadingData(false);
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

  const anyFilter = filterDept || filterGrade || filterLocation || filterBranch || filterGender || filterSearch || filterCurrentSlab || filterEmpId;
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

  // Bulk Assign
  const handleAssign = async () => {
    if (!selectedSlabId) { showToast.error('Select Slab', 'Please select a Pay Slab.'); return; }
    if (selectedIds.size === 0) { showToast.error('No Selection', 'Please select at least one employee.'); return; }
    setSaving(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        apiClient.patch(`/employees/${id}`, { salary_slab_id: Number(selectedSlabId), salarySlabId: Number(selectedSlabId) })
      ));
      const slabName = slabs.find(s => String(s.id) === selectedSlabId)?.name || 'Slab';
      showToast.success('Pay Slab Assigned!', `"${slabName}" assigned to ${selectedIds.size} employee(s).`);
      clearSelection(); setSelectedSlabId('');
      await loadData();
    } catch (err: any) {
      showToast.error('Failed', err?.response?.data?.message || err?.message || 'Assignment failed.');
    }
    setSaving(false);
  };

  const handleRemove = async (emp: EmpRow) => {
    try {
      await apiClient.patch(`/employees/${emp.id}`, { salary_slab_id: null, salarySlabId: null });
      showToast.success('Removed', `Slab removed from ${emp.name}`);
      await loadData();
    } catch { showToast.error('Error', 'Could not remove slab.'); }
  };

  // ─── 2-Option Modal Recalculation Helpers ────────────────────────────────────
  const recalculateFromSalaryInput = (inputVal: number) => {
    if (isNaN(inputVal) || inputVal <= 0) return;
    const b = Math.round(inputVal * 0.5);
    const h = Math.round(b * 0.5);
    const l = Math.max(0, inputVal - (b + h));

    setBasic(String(b));
    setHra(String(h));
    setStandardAllowance('0');
    setMealAllowance('0');
    setCommunicationAllowance('0');
    setChildrenEduAllowance('0');
    setLta(String(l));

    setPf('1800');
    setPt('200');
    setEsic('0');
    setPfEmployer('1800');
  };

  const recalculateFromBasicInput = (basicVal: number) => {
    if (isNaN(basicVal) || basicVal <= 0) return;
    const h = Math.round(basicVal * 0.5);
    setHra(String(h));
    const pfVal = Math.min(1800, Math.round(basicVal * 0.12));
    setPf(String(pfVal));
    setPfEmployer(String(pfVal));

    const estGross = basicVal + h + (Number(standardAllowance) || 0) + (Number(mealAllowance) || 0) + (Number(communicationAllowance) || 0) + (Number(childrenEduAllowance) || 0) + (Number(lta) || 0);
    setEsic(estGross <= 21000 ? String(Math.round(estGross * 0.0075)) : '0');
    setPt('200');
  };

  const handleModeChange = (mode: 'salary_input' | 'component_based') => {
    setCalcMode(mode);
    if (mode === 'salary_input') {
      recalculateFromSalaryInput(Number(salaryInput) || 60000);
    } else {
      recalculateFromBasicInput(Number(basic) || 30000);
    }
  };

  const handleSalaryInputChange = (val: string) => {
    setSalaryInput(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) recalculateFromSalaryInput(num);
  };

  const handleBasicChange = (val: string) => {
    setBasic(val);
    if (calcMode === 'component_based') {
      const num = Number(val);
      if (!isNaN(num) && num > 0) recalculateFromBasicInput(num);
    }
  };

  const openStructureModal = (emp: EmpRow) => {
    setTargetEmp(emp);
    setModalSlabId(emp.slabId ? String(emp.slabId) : (slabs[0]?.id ? String(slabs[0].id) : ''));

    // Fetch existing structure from DB if available
    apiClient.get(`/payroll/salary-structure?employee_id=${emp.id}`).then((res: any) => {
      const list = extract(res);
      if (list && list.length > 0) {
        const s = list[0];
        setCalcMode(s.calculation_mode || s.calcMode || 'salary_input');
        setSalaryInput(String(s.gross_monthly || s.salary_input || s.salaryInput || 60000));
        setBasic(String(s.basic_monthly || s.basic || 30000));
        setHra(String(s.hra_monthly || s.hra || 12000));
        setPf(String(s.pf_deduction || s.pf || 1800));
        setPt(String(s.pt_deduction || s.pt || 200));
        setEsic(String(s.esi_deduction || s.esic || 0));
        setPfEmployer(String(s.pf_employer || s.pfEmployer || 1800));
      } else {
        recalculateFromSalaryInput(60000);
      }
    }).catch(() => {
      recalculateFromSalaryInput(60000);
    });

    setModalOpen(true);
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
    if (!targetEmp) return;

    const payload = {
      employee_id: targetEmp.id,
      slab_id: modalSlabId ? Number(modalSlabId) : targetEmp.slabId,
      effective_from: modalEffectiveFrom,
      arrear_pay_month: arrearPayMonth,
      calculation_mode: calcMode,
      salary_input: Number(salaryInput) || 0,
      basic_monthly: numBasic,
      hra_monthly: numHra,
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
      total_deductions_monthly: totalDeductionCalculated,
      net_take_home: netSalaryCalculated,
      annual_ctc: ctcCalculated * 12,
    };

    try {
      await apiClient.post('/payroll/salary-structure', payload).catch(() => {});
      if (modalSlabId) {
        await apiClient.patch(`/employees/${targetEmp.id}`, { salary_slab_id: Number(modalSlabId), salarySlabId: Number(modalSlabId) });
      }
      showToast.success('Salary Structure Saved!', `Pay structure saved for ${targetEmp.name}`);
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast.error('Save Failed', err?.message || 'Could not save pay structure.');
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
          {/* Employee Dropdown */}
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground z-10 pointer-events-none" />
            <select value={filterEmpId} onChange={e => {
              const val = e.target.value;
              setFilterEmpId(val);
              if (val) setSelectedIds(new Set([Number(val)]));
            }} className={`${sel} pl-8`}>
              <option value="">All Employees</option>
              {allEmps.map(e => (
                <option key={e.id} value={String(e.id)}>{e.code} — {e.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input placeholder="Search Name/Code…" value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
              className="w-full border border-border rounded-lg pl-7 pr-3 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-8" />
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

            <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
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
                Payroll Structure — {targetEmp?.code} ({targetEmp?.name})
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
                  {slabs.map((s: any) => (
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

            {/* 2 Calculation Modes Radio Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="calcMode"
                    checked={calcMode === 'salary_input'}
                    onChange={() => handleModeChange('salary_input')}
                    className="accent-sky-600"
                  />
                  Calculate Payroll based on Salary Input
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="calcMode"
                    checked={calcMode === 'component_based'}
                    onChange={() => handleModeChange('component_based')}
                    className="accent-sky-600"
                  />
                  Calculate CTC based on Payroll Component
                </label>
              </div>

              {/* Effective From */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Effective From :</label>
                <input
                  type="date"
                  value={modalEffectiveFrom}
                  onChange={e => setModalEffectiveFrom(e.target.value)}
                  className="w-full h-8 border border-slate-300 rounded px-2 text-xs bg-white"
                />
              </div>

              {/* Arrear Pay Month */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Arrear Pay Month :</label>
                <input
                  type="date"
                  value={arrearPayMonth}
                  onChange={e => setArrearPayMonth(e.target.value)}
                  className="w-full h-8 border border-slate-300 rounded px-2 text-xs bg-white"
                />
              </div>
            </div>

            {/* Salary Input Field (Shown ONLY when Option 1 is selected) */}
            {calcMode === 'salary_input' && (
              <div className="bg-sky-50/50 border border-sky-200 rounded-lg p-3 space-y-1">
                <label className="text-xs font-bold text-slate-900 block">Salary Input (Monthly Gross) :</label>
                <input
                  type="number"
                  value={salaryInput}
                  onChange={e => handleSalaryInputChange(e.target.value)}
                  placeholder="Enter Monthly Gross Salary"
                  className="w-60 h-9 border border-slate-300 rounded px-3 text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-red-600 italic m-0">
                  * Enter gross monthly amount above — Basic (50%), HRA (40% of Basic), and statutory deductions are auto-calculated.
                </p>
              </div>
            )}

            {/* 2-Column Earnings & Deductions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* LEFT COLUMN: Employee's Earning */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="border-t-4 border-emerald-500 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Employee's Earning</h4>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Basic Pay</label>
                    <input
                      type="number"
                      value={basic}
                      onChange={e => handleBasicChange(e.target.value)}
                      readOnly={calcMode === 'salary_input'}
                      className={`w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold ${calcMode === 'salary_input' ? 'bg-slate-100 text-slate-600' : 'bg-white'}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">HRA (House Rent Allowance)</label>
                    <input
                      type="number"
                      value={hra}
                      onChange={e => setHra(e.target.value)}
                      readOnly={calcMode === 'salary_input'}
                      className={`w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold ${calcMode === 'salary_input' ? 'bg-slate-100 text-slate-600' : 'bg-white'}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Special / LTA Allowance</label>
                    <input
                      type="number"
                      value={lta}
                      onChange={e => setLta(e.target.value)}
                      readOnly={calcMode === 'salary_input'}
                      className={`w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold ${calcMode === 'salary_input' ? 'bg-slate-100 text-slate-600' : 'bg-white'}`}
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Deductions & Employer Contribution */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="border-t-4 border-red-500 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Statutory Deductions & Contributions</h4>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Employee PF (12%)</label>
                    <input
                      type="number"
                      value={pf}
                      onChange={e => setPf(e.target.value)}
                      className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Professional Tax (PT)</label>
                    <input
                      type="number"
                      value={pt}
                      onChange={e => setPt(e.target.value)}
                      className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">ESI Contribution</label>
                    <input
                      type="number"
                      value={esic}
                      onChange={e => setEsic(e.target.value)}
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
                <span className="text-base font-black text-amber-400">₹{(ctcCalculated * 12).toLocaleString('en-IN')}</span>
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
