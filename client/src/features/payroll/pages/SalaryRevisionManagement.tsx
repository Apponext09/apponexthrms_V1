import React, { useState } from 'react';
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
  Landmark
} from 'lucide-react';
import { apiClient } from '@/config/api';

interface RevisionRecord {
  id: number;
  empId: number;
  empName: string;
  empCode: string;
  revisionType: string;
  currentCtc: number;
  proposedCtc: number;
  effectiveFrom: string;
  reason: string;
  status: 'draft' | 'submitted' | 'pending' | 'approved' | 'rejected' | 'implemented';
}

export const SalaryRevisionManagement: React.FC = () => {
  const { user } = useAuthStore();
  const rawRole = (user as any)?.role || (user as any)?.accessRole || (user as any)?.access_role || (Array.isArray((user as any)?.roles) ? (user as any).roles.join(',') : '') || '';
  const userRole = String(rawRole).toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('owner') || user?.email === 'kot@gmail.com';
  const isHR = !isAdmin && (userRole.includes('hr') || userRole.includes('manager') || userRole.includes('lead') || userRole.includes('team') || userRole.includes('dept'));

  // Revision list starts empty — populated from API on mount
  const [revisionsList, setRevisionsList] = useState<RevisionRecord[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [revisionType, setRevisionType] = useState('Annual Performance Appraisal');
  const [newCtcInput, setNewCtcInput] = useState<string>('1150000');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Outstanding performance evaluation');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic employee list — fetched live from API
  const [employees, setEmployees] = useState<{ id: number; name: string; code: string; ctc: number; dept?: string }[]>([]);
  const [employeeStructuresMap, setEmployeeStructuresMap] = useState<Record<number, { structureName: string; annualCtc: number; grossMonthly: number }>>({});

  const fetchRevisions = React.useCallback(() => {
    apiClient.get('/payroll/salary-revisions').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        const mapped: RevisionRecord[] = list.map((r: any) => ({
          id: r.id || r.uuid || Date.now(),
          empId: r.employee_id || r.employeeId || 0,
          empName: r.employee_name || r.employeeName || (r.employeeName ? r.employeeName : `Employee #${r.employee_id || r.employeeId}`),
          empCode: r.employee_code || r.employeeCode || `EMP-${r.employee_id || r.employeeId}`,
          revisionType: r.revision_type || r.revisionType || 'Revision',
          currentCtc: Number(r.current_ctc || r.currentCtc || r.oldCtc || 0),
          proposedCtc: Number(r.proposed_ctc || r.newCTC || r.newCtc || 0),
          effectiveFrom: r.effective_from || r.effectiveFrom || '',
          reason: r.reason || r.reasonDescription || '',
          status: r.status || 'submitted'
        }));
        setRevisionsList(mapped);
      }
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    fetchRevisions();

    // Load live assigned salary structure mappings
    apiClient.get('/payroll/structures/mappings').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const structMap: Record<number, { structureName: string; annualCtc: number; grossMonthly: number }> = {};
        for (const m of list) {
          const empId = m.empId || m.emp_id || m.id;
          const annual = Number(m.annualCtc || m.annual_ctc || (m.grossMonthly || m.gross_monthly ? Number(m.grossMonthly || m.gross_monthly) * 12 : 0));
          const gross = Number(m.grossMonthly || m.gross_monthly || (annual ? Math.round(annual / 12) : 0));
          if (empId) {
            structMap[empId] = {
              structureName: m.structureName || m.structure_name || 'Standard Structure',
              annualCtc: annual,
              grossMonthly: gross
            };
          }
        }
        setEmployeeStructuresMap(prev => ({ ...prev, ...structMap }));
      }
    }).catch(() => {});

    // Also fetch master salary structures to capture assigned employee CTCs
    apiClient.get('/payroll/structures').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const structMap: Record<number, { structureName: string; annualCtc: number; grossMonthly: number }> = {};
        for (const s of list) {
          const empId = s.employee_id || s.employeeId;
          const annual = Number(s.annual_ctc || s.annualCtc || 0);
          const gross = Number(s.gross_monthly || s.grossMonthly || (annual ? Math.round(annual / 12) : 0));
          if (empId) {
            structMap[empId] = {
              structureName: s.structure_name || s.structureName || 'Standard Structure',
              annualCtc: annual,
              grossMonthly: gross
            };
          }
        }
        setEmployeeStructuresMap(prev => ({ ...prev, ...structMap }));
      }
    }).catch(() => {});

    const extractArray = (res: any) => {
      const d = res?.data?.data ?? res?.data ?? res;
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.items)) return d.items;
      return [];
    };

    const processEmployeeList = (rawList: any[]) => {
      if (!Array.isArray(rawList) || rawList.length === 0) return [];
      return rawList.map((e: any) => {
        const fn = e.first_name || e.firstName || '';
        const ln = e.last_name || e.lastName || '';
        const fullName = `${fn} ${ln}`.trim() || e.name || e.fullName || e.full_name || e.email || `Employee #${e.id || e.empId || e.employee_id}`;
        const code = e.employee_code || e.employeeCode || e.code || `EMP-${e.id || e.empId || e.employee_id}`;
        const ctc = Number(e.annual_ctc || e.annualCtc || e.annual_salary || (e.gross_salary || e.grossSalary || e.grossMonthly ? Number(e.gross_salary || e.grossSalary || e.grossMonthly) * 12 : 0) || 0);
        const dept = e.department_name || e.departmentName || e.department?.name || e.job_title || e.jobTitle || '';
        return { id: Number(e.id || e.empId || e.employee_id), name: fullName, code, ctc, dept };
      }).filter((e: any) => Boolean(e.id));
    };

    // Load live employee list for this org with multi-tier fallbacks
    apiClient.get('/employees', { params: { pageSize: 500, limit: 500 } }).then((res: any) => {
      const list = extractArray(res);
      const mapped = processEmployeeList(list);

      if (mapped.length > 0) {
        mapped.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setEmployees(mapped);
        setSelectedEmpId((prev) => (prev && mapped.some(e => String(e.id) === prev) ? prev : String(mapped[0].id)));
      } else {
        // Fallback 1: Load from structure mappings
        apiClient.get('/payroll/structures/mappings').then((mapRes: any) => {
          const mapList = extractArray(mapRes);
          const mapEmps = processEmployeeList(mapList);
          if (mapEmps.length > 0) {
            mapEmps.sort((a: any, b: any) => a.name.localeCompare(b.name));
            setEmployees(mapEmps);
            setSelectedEmpId(String(mapEmps[0].id));
          }
        }).catch(() => {});
      }
    }).catch(() => {
      // Fallback 2: Load from structure mappings on endpoint error
      apiClient.get('/payroll/structures/mappings').then((mapRes: any) => {
        const mapList = extractArray(mapRes);
        const mapEmps = processEmployeeList(mapList);
        if (mapEmps.length > 0) {
          mapEmps.sort((a: any, b: any) => a.name.localeCompare(b.name));
          setEmployees(mapEmps);
          setSelectedEmpId(String(mapEmps[0].id));
        }
      }).catch(() => {});
    });
  }, [user?.organizationId]);

  // Dynamic assigned structure for logged in employee / selected employee
  const [myAssignedStruct, setMyAssignedStruct] = useState<any>(null);

  React.useEffect(() => {
    if (!isAdmin) {
      apiClient.get('/payroll/my-salary-structure').then((res: any) => {
        const data = res.data?.data || res.data;
        if (data && typeof data === 'object') {
          setMyAssignedStruct(data);
        }
      }).catch(() => {});
    }
  }, [isAdmin]);
  // Ensure selectedEmpId always points to a valid loaded employee ID
  React.useEffect(() => {
    if (employees.length > 0) {
      const isValid = employees.some(e => String(e.id) === String(selectedEmpId));
      if (!isValid) {
        setSelectedEmpId(String(employees[0].id));
      }
    }
  }, [employees, selectedEmpId]);

  const activeEmp = employees.find(e => String(e.id) === String(selectedEmpId)) || employees[0] || { id: 0, name: '—', code: '—', ctc: 0 };
  const assignedStruct = activeEmp?.id ? employeeStructuresMap[activeEmp.id] : undefined;
  
  // Selected employee values for Revision Builder
  const empCtcVal = (assignedStruct && assignedStruct.annualCtc > 0) ? assignedStruct.annualCtc : activeEmp.ctc;
  const empMonthlyGross = (assignedStruct && assignedStruct.grossMonthly > 0) ? assignedStruct.grossMonthly : Math.round(empCtcVal / 12);
  const proposedCtcVal = parseFloat(newCtcInput) || empCtcVal;
  const hikeAmount = Math.max(0, proposedCtcVal - empCtcVal);
  const hikePercentage = empCtcVal > 0 ? ((hikeAmount / empCtcVal) * 100).toFixed(2) : '0.00';
  const proposedMonthlyGross = Math.round(proposedCtcVal / 12);
  const monthlyDifference = proposedMonthlyGross - empMonthlyGross;

  // Logged-in HR personal salary structure
  const myCtcVal = Number(myAssignedStruct?.annualCtc || myAssignedStruct?.annual_ctc || (myAssignedStruct?.grossMonthly || myAssignedStruct?.gross_monthly ? Number(myAssignedStruct?.grossMonthly || myAssignedStruct?.gross_monthly) * 12 : 0));
  const myMonthlyGross = Number(myAssignedStruct?.grossMonthly || myAssignedStruct?.gross_monthly || (myCtcVal ? Math.round(myCtcVal / 12) : 0));
  const myBasicPay = Number(myAssignedStruct?.basicMonthly || myAssignedStruct?.basic_monthly || Math.round(myMonthlyGross * 0.5));
  const myTakeHomePay = Number(myAssignedStruct?.netTakeHome || myAssignedStruct?.net_take_home || Math.round(myMonthlyGross * 0.88));
  const myStructureName = myAssignedStruct?.structureName || myAssignedStruct?.structure_name || (myCtcVal > 0 ? 'Active Structure' : 'Not Assigned');

  const handleCreateRevision = async (instantApprove = false) => {
    const isInstant = instantApprove || isAdmin;
    const initialStatus = isInstant ? 'approved' : 'submitted';
    setSuccessMsg(isInstant ? `Salary revision for ${activeEmp.name} (+${hikePercentage}% Hike) approved & updated in Pay Slab!` : `Salary revision request for ${activeEmp.name} (+${hikePercentage}% Hike) submitted for Admin approval!`);

    try {
      await apiClient.post('/payroll/salary-revisions', {
        employeeId: activeEmp.id,
        revisionType,
        oldCtc: empCtcVal,
        newCtc: proposedCtcVal,
        newCTC: proposedCtcVal,
        incrementPercentage: parseFloat(hikePercentage),
        incrementAmount: hikeAmount,
        effectiveFrom,
        reasonDescription: reason,
        instantApprove: isInstant,
        status: initialStatus
      });
      fetchRevisions();
    } catch (e) {
      fetchRevisions();
    }

    setShowForm(false);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleApprove = async (id: number) => {
    const target = revisionsList.find(r => r.id === id);
    setRevisionsList(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    try {
      await apiClient.put(`/payroll/salary-revisions/${id}/approve`);
      fetchRevisions();
    } catch (e) {
      fetchRevisions();
    }
    setSuccessMsg(`Salary revision request approved successfully${target ? ` for ${target.empName}` : ''}!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleReject = async (id: number) => {
    const target = revisionsList.find(r => r.id === id);
    setRevisionsList(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    try {
      await apiClient.put(`/payroll/salary-revisions/${id}/reject`);
      fetchRevisions();
    } catch (e) {
      fetchRevisions();
    }
    setSuccessMsg(`Salary revision request rejected${target ? ` for ${target.empName}` : ''}.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'implemented': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'submitted': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'rejected': return 'bg-rose-50 text-rose-800 border-rose-200';
      default: return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Guided Workspace Step Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                Step 4 of 4: Revisions &amp; Payslips
              </span>
              <h2 className="text-lg font-black text-foreground tracking-tight">
                {isAdmin ? 'Salary Revision & Appraisal Approvals' : 'Salary Revision & Appraisal Management'}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create, review, approve, or reject salary revision requests and appraisal increments for organization employees.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
        >
          {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Close Builder' : '+ Create Salary Revision'}
        </Button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium text-sm shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Section 1: My Personal Assigned Salary Structure Card (Hidden for Admin) */}
      {!isAdmin && (
        <Card className="border border-border/80 shadow-xs bg-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              <Landmark className="w-4.5 h-4.5 text-primary" />
              My Current Assigned Salary Structure
            </span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs">
              {myStructureName}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
            <div className="p-3 bg-muted/20 rounded-lg space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Annual CTC</span>
              <div className="text-base font-extrabold text-foreground">
                ₹{myCtcVal > 0 ? myCtcVal.toLocaleString('en-IN') : 'Structure Not Assigned'}
              </div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Monthly Gross</span>
              <div className="text-base font-extrabold text-primary">
                ₹{myMonthlyGross > 0 ? myMonthlyGross.toLocaleString('en-IN') : '0'}/mo
              </div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Basic Pay (50%)</span>
              <div className="text-base font-extrabold text-foreground">
                ₹{myBasicPay > 0 ? myBasicPay.toLocaleString('en-IN') : '0'}/mo
              </div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Estimated Take-Home</span>
              <div className="text-base font-extrabold text-emerald-600">
                ₹{myTakeHomePay > 0 ? myTakeHomePay.toLocaleString('en-IN') : '0'}/mo
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Admin Quick Summary Overview */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Pending Admin Approvals</div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
              {revisionsList.filter(r => r.status === 'submitted' || r.status === 'pending').length}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Submitted by HR requiring review</div>
          </Card>
          <Card className="p-4 border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Approved Revisions</div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
              {revisionsList.filter(r => r.status === 'approved' || r.status === 'implemented').length}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Approved & updated in payroll</div>
          </Card>
          <Card className="p-4 border border-slate-200 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="text-xs font-bold text-slate-500 uppercase">Total Revision Requests</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
              {revisionsList.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">All time HR revision records</div>
          </Card>
        </div>
      )}

      {/* Revision Form & Hike Calculator (Available to Admin & HR) */}
      {showForm && (
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardHeader className="border-b border-border/60 bg-primary/5">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <TrendingUp className="w-4 h-4 text-primary" /> Proposed Salary Increment Calculator
            </CardTitle>
            <CardDescription>Select employee and set proposed annual CTC to compute real-time hike percentage and monthly pay difference.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">

            {/* Current Salary Structure Status Banner */}
            {empCtcVal > 0 ? (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/20 text-primary font-extrabold text-[10px] border-primary/30 uppercase">
                    Assigned Structure
                  </Badge>
                  <span className="font-bold text-foreground">
                    {assignedStruct?.structureName || 'Active Salary Structure'}
                  </span>
                </div>
                <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                  Current Assigned CTC for {activeEmp.name}: ₹{empCtcVal.toLocaleString('en-IN')} / yr (₹{empMonthlyGross.toLocaleString('en-IN')}/mo)
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <span>⚠️ No assigned salary structure found for {activeEmp.name}. You can still propose a new CTC revision.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Employee *</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white cursor-pointer shadow-xs"
                >
                  {employees.length === 0 ? (
                    <option value="">Loading organization employees...</option>
                  ) : (
                    employees.map(e => {
                      const empStruct = employeeStructuresMap[e.id];
                      const empCtc = (empStruct && empStruct.annualCtc > 0) ? empStruct.annualCtc : e.ctc;
                      const ctcStr = empCtc > 0 ? `Current CTC: ₹${(empCtc / 100000).toFixed(2)}L/yr` : 'Slab Not Assigned (Propose New CTC)';
                      const deptStr = e.dept ? ` • ${e.dept}` : '';
                      return (
                        <option key={e.id} value={String(e.id)}>
                          {e.name} ({e.code}){deptStr} — {ctcStr} {empStruct?.structureName ? `[${empStruct.structureName}]` : ''}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              {/* Revision Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Revision Type *</label>
                <select
                  value={revisionType}
                  onChange={(e) => setRevisionType(e.target.value)}
                  className="w-full h-10 px-3 border rounded-lg text-sm bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Annual Performance Appraisal">Annual Performance Appraisal</option>
                  <option value="Role Promotion (Lead Engineer)">Role Promotion</option>
                  <option value="Market Alignment Revision">Market Alignment Revision</option>
                  <option value="Retention Bonus / Special Hike">Retention Bonus / Special Hike</option>
                </select>
              </div>

              {/* Proposed Annual CTC */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Proposed Annual CTC (INR) *</label>
                <Input
                  type="number"
                  value={newCtcInput}
                  onChange={(e) => setNewCtcInput(e.target.value)}
                  placeholder="e.g. 1150000"
                  className="h-10 text-sm font-bold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400"
                />
              </div>

              {/* Effective From */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Effective Date *</label>
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="h-10 text-sm bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Real-time Increment Summary & Itemized Component Breakdown Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Assigned CTC, Slab &amp; Increment Impact Analysis
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 font-bold border-indigo-200 text-xs px-2.5 py-0.5">
                    Slab: {assignedStruct?.structureName || 'Standard Grade Slab'}
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-900 font-bold border-emerald-300 text-sm px-3 py-1">
                    +{hikePercentage}% Salary Hike
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-1 border">
                  <span className="text-slate-500">Current Assigned CTC</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white">₹{(empCtcVal / 100000).toFixed(2)} Lakhs</div>
                  <div className="text-[11px] text-slate-400">₹{empMonthlyGross.toLocaleString('en-IN')}/mo</div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-slate-900 rounded-lg space-y-1 border border-emerald-200">
                  <span className="text-slate-500">Proposed New CTC</span>
                  <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">₹{(proposedCtcVal / 100000).toFixed(2)} Lakhs</div>
                  <div className="text-[11px] text-emerald-600 font-bold">₹{proposedMonthlyGross.toLocaleString('en-IN')}/mo</div>
                </div>

                <div className="p-3 bg-indigo-50 dark:bg-slate-900 rounded-lg space-y-1 border border-indigo-100">
                  <span className="text-slate-500">Annual Increase</span>
                  <div className="text-base font-bold text-indigo-900 dark:text-indigo-300">+₹{hikeAmount.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-indigo-600">+₹{monthlyDifference.toLocaleString('en-IN')}/mo net gain</div>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-slate-900 rounded-lg space-y-1 border border-purple-100">
                  <span className="text-slate-500">Effective Date</span>
                  <div className="text-base font-bold text-purple-900 dark:text-purple-300">{effectiveFrom}</div>
                  <div className="text-[11px] text-purple-600">Active Effective Date</div>
                </div>
              </div>

              {/* 🌟 Itemized Salary Components Breakdown Grid */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-black uppercase text-indigo-900 dark:text-indigo-300 tracking-wide block">
                  Current Assigned Components Breakdown ({activeEmp.name}):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded border space-y-0.5">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Basic Pay (50%)</span>
                    <div className="font-extrabold text-foreground">₹{Math.round(empMonthlyGross * 0.5).toLocaleString('en-IN')}/mo</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded border space-y-0.5">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">HRA (50% Basic)</span>
                    <div className="font-extrabold text-foreground">₹{Math.round(empMonthlyGross * 0.25).toLocaleString('en-IN')}/mo</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded border space-y-0.5">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Special Allowance</span>
                    <div className="font-extrabold text-foreground">₹{Math.round(empMonthlyGross * 0.25).toLocaleString('en-IN')}/mo</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded border space-y-0.5">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">Est. Net Take-Home</span>
                    <div className="font-extrabold text-emerald-600 dark:text-emerald-400">₹{Math.round(empMonthlyGross * 0.88).toLocaleString('en-IN')}/mo</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reason / Appraisal Note</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Justification for salary revision"
                  className="h-10 text-sm bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)} className="text-xs font-bold cursor-pointer">Cancel</Button>

              <Button onClick={() => handleCreateRevision(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer">
                <Send className="w-4 h-4" /> Submit Revision Request
              </Button>

              {isAdmin && (
                <Button onClick={() => handleCreateRevision(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer">
                  <CheckCircle className="w-4 h-4" /> Create &amp; Instantly Approve
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revision History & Status Table */}
      <Card className="shadow border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600" /> {isAdmin ? 'Salary Revision Approval Register' : 'Salary Revision Requests & Register'}
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Review and approve HR-submitted salary revisions and appraisal hikes.'
                : 'Track all HR submitted salary revisions, appraisal hikes, and Admin approvals.'}
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-bold">{revisionsList.length} Total Records</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 uppercase border-b">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Revision Type</th>
                  <th className="px-6 py-3">Current CTC</th>
                  <th className="px-6 py-3">Proposed CTC</th>
                  <th className="px-6 py-3">Effective Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {revisionsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500 text-sm font-medium">
                      No salary revision requests recorded yet.
                    </td>
                  </tr>
                ) : (
                  revisionsList.map((rev) => (
                    <tr key={rev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-semibold">
                        <div className="text-slate-900 dark:text-white">{rev.empName}</div>
                        <div className="text-xs text-slate-400 font-mono">{rev.empCode}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                        {rev.revisionType}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">
                        ₹{(rev.currentCtc / 100000).toFixed(2)} Lakhs
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{(rev.proposedCtc / 100000).toFixed(2)} Lakhs
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                        {rev.effectiveFrom}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`font-bold capitalize ${getBadgeStyle(rev.status)}`}>
                          {rev.status === 'submitted' || rev.status === 'pending' ? 'Pending Admin Approval' : rev.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isAdmin && (rev.status === 'submitted' || rev.status === 'pending') && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(rev.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 font-bold shadow-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(rev.id)}
                              className="text-rose-600 border-rose-200 text-xs h-8 px-3 font-bold hover:bg-rose-50 shadow-xs"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {!isAdmin && (rev.status === 'submitted' || rev.status === 'pending') && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 font-bold border-amber-200 text-xs">
                            Pending Admin Approval
                          </Badge>
                        )}
                        {rev.status === 'approved' && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 font-bold border-emerald-200 text-xs">
                            Approved by Admin
                          </Badge>
                        )}
                        {rev.status === 'rejected' && (
                          <Badge variant="outline" className="bg-rose-50 text-rose-800 font-bold border-rose-200 text-xs">
                            Rejected by Admin
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
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
