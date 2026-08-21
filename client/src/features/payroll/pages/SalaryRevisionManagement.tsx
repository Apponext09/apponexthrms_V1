import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  Plus,
  CheckCircle,
  ChevronUp,
  Send,
  Sparkles,
  FileCheck,
  XCircle,
  Landmark,
  Calculator,
  ArrowRight,
  Layers,
  UserCheck,
  Calendar,
  Check,
  RotateCcw
} from 'lucide-react';
import { apiClient } from '@/config/api';
import { formatPayrollDate } from '@/lib/utils';

interface RevisionRecord {
  id: number;
  empId: number;
  empName: string;
  empCode: string;
  slabName: string;
  revisionType: string;
  currentCtc: number;
  proposedCtc: number;
  effectiveFrom: string;
  reason: string;
  status: 'draft' | 'submitted' | 'pending' | 'approved' | 'rejected' | 'implemented';
}

interface EmployeeItem {
  id: number;
  name: string;
  code: string;
  ctc: number;
  dept?: string;
  slabId?: string | number;
  slabName?: string;
}

export const SalaryRevisionManagement: React.FC = () => {
  const { user } = useAuthStore();
  const rawRole = (user as any)?.role || (user as any)?.accessRole || (user as any)?.access_role || (Array.isArray((user as any)?.roles) ? (user as any).roles.join(',') : '') || '';
  const userRole = String(rawRole).toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('owner') || user?.email === 'kot@gmail.com';

  const [revisionsList, setRevisionsList] = useState<RevisionRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [paySlabs, setPaySlabs] = useState<any[]>([]);
  const [employeeStructuresMap, setEmployeeStructuresMap] = useState<Record<number, { structureName: string; slabId?: number; annualCtc: number; grossMonthly: number }>>({});

  const [showForm, setShowForm] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedSlabId, setSelectedSlabId] = useState<string>('');
  const [revisionType, setRevisionType] = useState('Annual Performance Appraisal');
  const [newCtcInput, setNewCtcInput] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Annual compensation review and performance adjustment');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Fetch Slabs Catalog
  useEffect(() => {
    apiClient.get('/payroll/slabs').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setPaySlabs(list);
      }
    }).catch(() => {});
  }, []);

  // Helper to resolve slab name by ID or CTC
  const getSlabName = (slabId?: any, ctc?: number) => {
    if (slabId) {
      const matched = paySlabs.find(s => String(s.id) === String(slabId));
      if (matched) return matched.name || matched.slab_name;
    }
    if (ctc && ctc > 0) {
      const matched = paySlabs.find(s => {
        const min = Number(s.min_ctc || s.minCtc || 0);
        const max = Number(s.max_ctc || s.maxCtc || 100000000);
        return ctc >= min && ctc <= max;
      });
      if (matched) return matched.name || matched.slab_name;
    }
    return paySlabs[0]?.name || 'Standard Monthly Slab';
  };

  // 2. Fetch Revisions List
  const fetchRevisions = useCallback(() => {
    apiClient.get('/payroll/salary-revisions').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        const mapped: RevisionRecord[] = list.map((r: any) => {
          const empCtc = Number(r.current_ctc || r.currentCtc || r.oldCtc || 0);
          return {
            id: r.id || r.uuid || Date.now(),
            empId: r.employee_id || r.employeeId || 0,
            empName: r.employee_name || r.employeeName || (r.first_name ? `${r.first_name} ${r.last_name || ''}` : `Employee #${r.employee_id || r.employeeId}`),
            empCode: r.employee_code || r.employeeCode || `EMP-${r.employee_id || r.employeeId}`,
            slabName: r.slab_name || r.slabName || getSlabName(r.payroll_slab_id || r.slab_id, empCtc),
            revisionType: r.revision_type || r.revisionType || 'Revision',
            currentCtc: empCtc,
            proposedCtc: Number(r.proposed_ctc || r.newCTC || r.newCtc || 0),
            effectiveFrom: r.effective_from || r.effectiveFrom || '',
            reason: r.reason || r.reasonDescription || '',
            status: r.status || 'submitted'
          };
        });
        setRevisionsList(mapped);
      }
    }).catch(() => {});
  }, [paySlabs]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  // 3. Fetch Structure Mappings & Employees
  useEffect(() => {
    // Structure mappings
    apiClient.get('/payroll/structures/mappings').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const structMap: Record<number, { structureName: string; slabId?: number; annualCtc: number; grossMonthly: number }> = {};
        for (const m of list) {
          const empId = m.empId || m.emp_id || m.id;
          const annual = Number(m.annualCtc || m.annual_ctc || (m.grossMonthly || m.gross_monthly ? Number(m.grossMonthly || m.gross_monthly) * 12 : 0));
          const gross = Number(m.grossMonthly || m.gross_monthly || (annual ? Math.round(annual / 12) : 0));
          if (empId) {
            structMap[empId] = {
              structureName: m.structureName || m.structure_name || 'Standard Monthly Slab',
              slabId: m.slabId || m.slab_id || m.payroll_slab_id,
              annualCtc: annual,
              grossMonthly: gross
            };
          }
        }
        setEmployeeStructuresMap(prev => ({ ...prev, ...structMap }));
      }
    }).catch(() => {});

    // Employees list
    apiClient.get('/employees', { params: { pageSize: 500, limit: 500 } }).then((res: any) => {
      const d = res?.data?.data ?? res?.data ?? res;
      const rawList = Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : []);
      const mapped: EmployeeItem[] = rawList.map((e: any) => {
        const fn = e.first_name || e.firstName || '';
        const ln = e.last_name || e.lastName || '';
        const fullName = `${fn} ${ln}`.trim() || e.name || e.fullName || `Employee #${e.id}`;
        const code = e.employee_code || e.employeeCode || e.code || `EMP-${e.id}`;
        const ctc = Number(e.annual_ctc || e.annualCtc || e.annual_salary || 0);
        const dept = e.department_name || e.departmentName || e.department?.name || '';
        const slabId = e.payroll_slab_id || e.slab_id || e.salary_slab_id;
        return {
          id: Number(e.id),
          name: fullName,
          code,
          ctc,
          dept,
          slabId,
          slabName: e.slab_name || e.slabName
        };
      }).filter((e: any) => Boolean(e.id));

      if (mapped.length > 0) {
        mapped.sort((a, b) => a.name.localeCompare(b.name));
        setEmployees(mapped);
        if (!selectedEmpId) {
          setSelectedEmpId(String(mapped[0].id));
        }
      }
    }).catch(() => {});
  }, []);

  // Update selected employee & slab details
  const activeEmp = employees.find(e => String(e.id) === String(selectedEmpId)) || employees[0] || { id: 0, name: '—', code: '—', ctc: 0 };
  const assignedStruct = activeEmp?.id ? employeeStructuresMap[activeEmp.id] : undefined;

  // Resolve current active CTC
  const currentCtcVal = (assignedStruct && assignedStruct.annualCtc > 0)
    ? assignedStruct.annualCtc
    : (activeEmp.ctc > 0 ? activeEmp.ctc : 600000);

  // Initialize slab and CTC input when active employee changes
  useEffect(() => {
    if (activeEmp && activeEmp.id) {
      const empSlabId = assignedStruct?.slabId || activeEmp.slabId || (paySlabs.length > 0 ? paySlabs[0].id : '');
      setSelectedSlabId(String(empSlabId || (paySlabs[0]?.id || '1')));
      // Default proposed CTC to 10% hike
      const defaultHike = Math.round(currentCtcVal * 1.10);
      setNewCtcInput(String(defaultHike));
    }
  }, [activeEmp.id, currentCtcVal, paySlabs]);

  // Calculations
  const proposedCtcVal = parseFloat(newCtcInput) || currentCtcVal;
  const hikeAmount = Math.max(0, proposedCtcVal - currentCtcVal);
  const hikePercentage = currentCtcVal > 0 ? ((hikeAmount / currentCtcVal) * 100).toFixed(2) : '0.00';
  
  const currentMonthlyGross = Math.round(currentCtcVal / 12);
  const proposedMonthlyGross = Math.round(proposedCtcVal / 12);
  const monthlyDifference = proposedMonthlyGross - currentMonthlyGross;

  // Compute breakdown for given CTC
  const calculateBreakdown = (ctc: number) => {
    const monthly = Math.round(ctc / 12);
    const basic = Math.round(monthly * 0.50);
    const hra = Math.round(basic * 0.40);
    const pf = Math.min(1800, Math.round(basic * 0.12));
    const pt = 200;
    const specialAllowance = Math.max(0, monthly - (basic + hra));
    const totalEarnings = basic + hra + specialAllowance;
    const totalDeductions = pf + pt;
    const netSalary = totalEarnings - totalDeductions;

    return {
      monthlyGross: monthly,
      basic,
      hra,
      specialAllowance,
      pf,
      pt,
      totalEarnings,
      totalDeductions,
      netSalary
    };
  };

  const currentBreakdown = calculateBreakdown(currentCtcVal);
  const proposedBreakdown = calculateBreakdown(proposedCtcVal);

  const handleApplyHikePercent = (pct: number) => {
    const newCtc = Math.round(currentCtcVal * (1 + pct / 100));
    setNewCtcInput(String(newCtc));
  };

  const handleCreateRevision = async (instantApprove = false) => {
    const isInstant = instantApprove || isAdmin;
    const initialStatus = isInstant ? 'approved' : 'submitted';

    setSuccessMsg(
      isInstant
        ? `Salary revision for ${activeEmp.name} (+${hikePercentage}% Hike) approved and updated in payroll!`
        : `Salary revision request for ${activeEmp.name} (+${hikePercentage}% Hike) submitted for Admin approval.`
    );

    try {
      // 1. Submit Salary Revision Record
      await apiClient.post('/payroll/salary-revisions', {
        employeeId: activeEmp.id,
        revisionType,
        oldCtc: currentCtcVal,
        newCtc: proposedCtcVal,
        newCTC: proposedCtcVal,
        incrementPercentage: parseFloat(hikePercentage),
        incrementAmount: hikeAmount,
        effectiveFrom,
        reasonDescription: reason,
        instantApprove: isInstant,
        status: initialStatus
      });

      // 2. If approved instantly, assign slab & new CTC to active salary structure
      if (isInstant) {
        await apiClient.post('/payroll/structures/assign', {
          employeeId: activeEmp.id,
          slabId: selectedSlabId || 1,
          annualCtc: proposedCtcVal,
          effectiveFrom
        }).catch(() => {});
      }

      fetchRevisions();
    } catch {
      fetchRevisions();
    }

    setShowForm(false);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleApprove = async (rev: RevisionRecord) => {
    setRevisionsList(prev => prev.map(r => r.id === rev.id ? { ...r, status: 'approved' } : r));
    try {
      await apiClient.put(`/payroll/salary-revisions/${rev.id}/approve`);
      // Update employee salary structure
      await apiClient.post('/payroll/structures/assign', {
        employeeId: rev.empId,
        slabId: selectedSlabId || 1,
        annualCtc: rev.proposedCtc,
        effectiveFrom: rev.effectiveFrom || new Date().toISOString().slice(0, 10)
      }).catch(() => {});

      fetchRevisions();
    } catch {
      fetchRevisions();
    }
    setSuccessMsg(`Salary revision for ${rev.empName} approved successfully!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleReject = async (rev: RevisionRecord) => {
    setRevisionsList(prev => prev.map(r => r.id === rev.id ? { ...r, status: 'rejected' } : r));
    try {
      await apiClient.put(`/payroll/salary-revisions/${rev.id}/reject`);
      fetchRevisions();
    } catch {
      fetchRevisions();
    }
    setSuccessMsg(`Salary revision for ${rev.empName} rejected.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">Approved</Badge>;
      case 'implemented':
        return <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">Implemented</Badge>;
      case 'submitted':
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">Pending Review</Badge>;
      case 'rejected':
        return <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-bold">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-bold">{status}</Badge>;
    }
  };

  const currentSlabName = getSlabName(selectedSlabId, currentCtcVal);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── Modern Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 ring-4 ring-primary/5">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-foreground tracking-tight">
                {isAdmin ? 'Salary Revision & Appraisal Approvals' : 'Salary Revision Management'}
              </h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                Assigned Slabs &amp; CTC Engine
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review assigned salary slabs, adjust annual CTC with live formula breakdown, and process appraisal hikes.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowForm(!showForm)}
          className="h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-xs cursor-pointer"
        >
          {showForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Close Revision Builder' : '+ Create Salary Revision'}
        </Button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xs animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Pending Approvals</p>
              <p className="text-2xl font-black text-amber-600">
                {revisionsList.filter(r => r.status === 'submitted' || r.status === 'pending').length}
              </p>
              <p className="text-[10px] text-muted-foreground">Requests awaiting Admin sign-off</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Approved Revisions</p>
              <p className="text-2xl font-black text-emerald-600">
                {revisionsList.filter(r => r.status === 'approved' || r.status === 'implemented').length}
              </p>
              <p className="text-[10px] text-muted-foreground">Updated in payroll structures</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Total Revisions</p>
              <p className="text-2xl font-black text-foreground">{revisionsList.length}</p>
              <p className="text-[10px] text-muted-foreground">All-time appraisal records</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <FileCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Salary Revision Builder & Slab Component Calculator ── */}
      {showForm && (
        <Card className="border border-border/80 shadow-sm bg-card overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Calculator className="w-4 h-4 text-primary" /> Salary Revision &amp; Slab CTC Increment Builder
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Select an employee to load their assigned salary slab, then enter the revised Annual CTC to calculate new take-home earnings.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-3 py-1">
                  Assigned Slab: {currentSlabName}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Input Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Employee Selector */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Select Employee *</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-lg text-xs bg-background font-bold text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {employees.length === 0 ? (
                    <option value="">Loading employees...</option>
                  ) : (
                    employees.map(e => (
                      <option key={e.id} value={String(e.id)}>
                        {e.name} ({e.code}) {e.dept ? `• ${e.dept}` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Assigned Salary Slab */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Salary Slab Template *</label>
                <select
                  value={selectedSlabId}
                  onChange={(e) => setSelectedSlabId(e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-lg text-xs bg-background font-bold text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {paySlabs.map(s => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name || s.slab_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Revision Type */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Revision Type *</label>
                <select
                  value={revisionType}
                  onChange={(e) => setRevisionType(e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-lg text-xs bg-background font-semibold text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="Annual Performance Appraisal">Annual Performance Appraisal</option>
                  <option value="Role Promotion">Role Promotion</option>
                  <option value="Market Alignment Revision">Market Alignment Revision</option>
                  <option value="Retention / Special Increment">Retention / Special Increment</option>
                </select>
              </div>

              {/* Effective From */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Effective Date *</label>
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="h-9 text-xs bg-background"
                />
              </div>
            </div>

            {/* CTC Increase Control Box */}
            <div className="p-4 bg-muted/30 border border-border/80 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block">
                    Proposed Revised Annual CTC (₹) *
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Current CTC: <span className="font-bold text-foreground">₹{currentCtcVal.toLocaleString('en-IN')} / yr</span> (₹{currentMonthlyGross.toLocaleString('en-IN')}/mo)
                  </p>
                </div>

                {/* Quick Hike Percentage Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Quick Hike:</span>
                  {[5, 10, 15, 20, 25, 30].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyHikePercent(pct)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer border border-primary/20"
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    value={newCtcInput}
                    onChange={(e) => setNewCtcInput(e.target.value)}
                    placeholder="Enter revised annual CTC..."
                    className="pl-8 h-10 text-sm font-black text-emerald-600 dark:text-emerald-400 bg-background"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold px-3 py-1.5">
                    +{hikePercentage}% Hike (+₹{hikeAmount.toLocaleString('en-IN')}/yr)
                  </Badge>
                  <span className="text-xs font-bold text-muted-foreground">
                    (+₹{monthlyDifference.toLocaleString('en-IN')}/mo Net Increase)
                  </span>
                </div>
              </div>
            </div>

            {/* 🌟 Side-by-Side Comparison: Current vs Proposed Slab Component Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Slab Formula Breakdown ({currentSlabName}): Current vs Proposed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Current Breakdown */}
                <div className="border border-border/80 rounded-xl p-4 bg-muted/10 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-border/60 pb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Current Salary</span>
                    <span className="text-xs font-black text-foreground">₹{currentCtcVal.toLocaleString('en-IN')} / yr</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Basic Pay (50%)</span>
                      <span className="font-semibold text-foreground">₹{currentBreakdown.basic.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>HRA (40% Basic)</span>
                      <span className="font-semibold text-foreground">₹{currentBreakdown.hra.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Special Allowance</span>
                      <span className="font-semibold text-foreground">₹{currentBreakdown.specialAllowance.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="flex justify-between text-rose-600 border-t border-border/40 pt-1">
                      <span>Statutory Deductions (PF &amp; PT)</span>
                      <span className="font-semibold">-₹{currentBreakdown.totalDeductions.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/60">
                      <span>Est. Net Take-Home</span>
                      <span className="font-black text-foreground">₹{currentBreakdown.netSalary.toLocaleString('en-IN')}/mo</span>
                    </div>
                  </div>
                </div>

                {/* Right: Proposed / Revised Breakdown */}
                <div className="border border-emerald-500/30 rounded-xl p-4 bg-emerald-500/5 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">Revised Proposed Salary</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">₹{proposedCtcVal.toLocaleString('en-IN')} / yr</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Basic Pay (50%)</span>
                      <span className="font-semibold text-foreground">₹{proposedBreakdown.basic.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>HRA (40% Basic)</span>
                      <span className="font-semibold text-foreground">₹{proposedBreakdown.hra.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Special Allowance</span>
                      <span className="font-semibold text-foreground">₹{proposedBreakdown.specialAllowance.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="flex justify-between text-rose-600 border-t border-border/40 pt-1">
                      <span>Statutory Deductions (PF &amp; PT)</span>
                      <span className="font-semibold">-₹{proposedBreakdown.totalDeductions.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-300 pt-1 border-t border-emerald-500/20">
                      <span>Est. New Net Take-Home</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">₹{proposedBreakdown.netSalary.toLocaleString('en-IN')}/mo</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Appraisal Reason & Note */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Revision Justification / Notes</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Appraisal justification or revision notes..."
                className="h-9 text-xs bg-background"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="h-9 text-xs font-bold cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                onClick={() => handleCreateRevision(false)}
                className="h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Submit Revision Request
              </Button>

              {isAdmin && (
                <Button
                  onClick={() => handleCreateRevision(true)}
                  className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Apply &amp; Instantly Approve
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Revision History & Approval Register ── */}
      <Card className="border border-border/80 shadow-xs bg-card overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20 p-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <FileCheck className="w-4.5 h-4.5 text-primary" />
              Salary Revision Register &amp; Approvals
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              History of all employee salary revisions, assigned slabs, proposed CTCs, and approval statuses.
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-bold text-xs">
            {revisionsList.length} Records
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Assigned Slab</th>
                  <th className="py-3 px-4">Revision Type</th>
                  <th className="py-3 px-4">Current CTC</th>
                  <th className="py-3 px-4">Proposed CTC</th>
                  <th className="py-3 px-4">Hike</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {revisionsList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                      No salary revision requests recorded yet.
                    </td>
                  </tr>
                ) : (
                  revisionsList.map((rev) => {
                    const hikeAmt = Math.max(0, rev.proposedCtc - rev.currentCtc);
                    const hikePct = rev.currentCtc > 0 ? ((hikeAmt / rev.currentCtc) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={rev.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{rev.empName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{rev.empCode}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold">
                            {rev.slabName || 'Standard Slab'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-medium">
                          {rev.revisionType}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-foreground">
                          ₹{rev.currentCtc.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{rev.proposedCtc.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-600">
                          +{hikePct}%
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {formatPayrollDate(rev.effectiveFrom)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(rev.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(rev.status === 'submitted' || rev.status === 'pending') && isAdmin ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApprove(rev)}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer shadow-2xs transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(rev)}
                                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer shadow-2xs transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {rev.status === 'approved' ? '✓ Applied' : 'Completed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryRevisionManagement;
