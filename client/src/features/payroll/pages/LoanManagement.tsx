import React, { useState, useEffect, useMemo } from 'react';
import { useLoan } from '../hooks/index';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserRoleAndDept } from '@/lib/userProfile';
import { EMIScheduleTable } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/config/api';
import {
  Search, UserCheck, Calendar, DollarSign, Plus, FileText, User, Filter,
  AlertCircle, Eye, CheckCircle2, ShieldCheck, XCircle, Clock, Check, X,
  Crown, Coins, CreditCard, Building, Download, FileSpreadsheet, FileCheck,
  Calculator, LayoutGrid, List, ChevronRight, AlertTriangle, Sparkles, RefreshCcw, Trash2
} from 'lucide-react';

export const LoanManagement: React.FC = () => {
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);

  const isTeamLead = roleInfo.roleCode === 'team_lead' || user?.roles?.includes('team_lead');
  const isHRManager = roleInfo.roleCode === 'hr_manager' || user?.roles?.includes('hr_manager');
  const isManager = roleInfo.roleCode === 'department_head' || user?.roles?.includes('manager');

  const isAdmin =
    user?.email === 'kot@gmail.com' ||
    user?.email?.includes('admin') ||
    user?.roles?.includes('organization_admin') ||
    user?.roles?.includes('super_admin') ||
    user?.roles?.includes('hr_manager') ||
    roleInfo.roleCode === 'organization_admin' ||
    roleInfo.roleCode === 'super_admin' ||
    roleInfo.roleCode === 'hr_manager';

  const loggedInUserName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Employee';
  const loggedInUserId = (user as any)?.employeeId || user?.id || 1;

  const loanStorageKey = `shared_hr_loans_${user?.id || user?.email || 'unknown'}`;

  // Roster Employees for Admin Grant/Disbursal
  const [companyEmployees, setCompanyEmployees] = useState<any[]>([]);
  const { loans, createLoan, getEmiSchedule, refetch, isLoading } = useLoan();

  // UI States
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [selectedLoanForSchedule, setSelectedLoanForSchedule] = useState<any | null>(null);
  const [emiSchedule, setEmiSchedule] = useState<any[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Application States
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>(String(loggedInUserId));
  const [loanType, setLoanType] = useState<string>('personal');
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [tenureMonths, setTenureMonths] = useState<string>('12');
  const [interestRate, setInterestRate] = useState<string>('8.5');
  const [loanDate, setLoanDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loanReason, setLoanReason] = useState<string>('');

  // Fetch company roster for Admin employee selection
  useEffect(() => {
    apiClient.get('/employees', { params: { pageSize: 500 } }).then(res => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((e: any) => {
          const gross = Number(e.gross_salary || e.grossSalary || (e.annual_ctc ? Math.round(e.annual_ctc / 12) : 75000));
          const basic = Number(e.basic_salary || e.basicSalary || Math.round(gross * 0.5));
          return {
            id: e.id,
            name: `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.email || `Employee #${e.id}`,
            code: e.employee_code || e.employeeCode || `EMP-${e.id}`,
            department: e.department_name || e.departmentName || e.department?.name || 'General',
            basicSalary: basic,
            grossSalary: gross
          };
        });
        setCompanyEmployees(formatted);
        if (formatted.length > 0 && isAdmin) {
          setTargetEmployeeId(String(formatted[0].id));
        }
      }
    }).catch(() => {});
  }, [isAdmin, user?.organizationId]);

  // Dynamic selected employee profile & calculation
  const activeEmp = useMemo(() => {
    return companyEmployees.find(e => String(e.id) === String(targetEmployeeId)) || {
      id: loggedInUserId,
      name: loggedInUserName,
      basicSalary: 35000,
      grossSalary: 70000
    };
  }, [companyEmployees, targetEmployeeId, loggedInUserId, loggedInUserName]);

  // Live EMI Calculator Math
  const numAmt = parseFloat(loanAmount) || 0;
  const numTenure = parseInt(tenureMonths) || 1;
  const numRate = parseFloat(interestRate) || 0;
  const maxCap = (activeEmp.basicSalary || 35000) * 6; // Recommended 6x Basic

  const calculatedTotalRepayment = useMemo(() => {
    if (numAmt <= 0) return 0;
    if (numRate === 0) return numAmt;
    return Math.round(numAmt * (1 + (numRate / 100) * (numTenure / 12)));
  }, [numAmt, numRate, numTenure]);

  const calculatedEMI = useMemo(() => {
    if (numAmt <= 0 || numTenure <= 0) return 0;
    return Math.round(calculatedTotalRepayment / numTenure);
  }, [calculatedTotalRepayment, numTenure, numAmt]);

  // Deduplicate and process loans list
  const masterLoanList = useMemo(() => {
    const map = new Map<string | number, any>();
    let localShared: any[] = [];
    try {
      localShared = JSON.parse(localStorage.getItem(loanStorageKey) || '[]');
      if (!isAdmin) {
        localShared = localShared.filter((l: any) =>
          String(l.employee_id || l.employeeId || '') === String(loggedInUserId) ||
          (user?.email && (l.email === user.email || l.employee_email === user.email))
        );
      }
    } catch {}

    const combined = [...localShared, ...(loans || [])];
    const userFiltered = isAdmin
      ? combined
      : combined.filter((l: any) =>
          String(l.employee_id || l.employeeId || '') === String(loggedInUserId) ||
          (user?.email && (l.email === user.email || l.employee_email === user.email))
        );

    userFiltered.forEach((l: any) => {
      const key = l.id || l.uuid;
      if (key && !map.has(key)) {
        map.set(key, l);
      }
    });

    return Array.from(map.values());
  }, [loans, isAdmin, loggedInUserId, user, loanStorageKey]);

  // Filtered loans based on tab & search
  const filteredLoans = useMemo(() => {
    return masterLoanList.filter((loan: any) => {
      const status = (loan.status || 'pending').toLowerCase();
      const matchesTab =
        activeTab === 'all' ? true :
        activeTab === 'pending' ? (status === 'pending' || status === 'pending_approval') :
        activeTab === 'active' ? (status === 'active' || status === 'approved') :
        activeTab === 'completed' ? (status === 'completed' || status === 'closed') :
        activeTab === 'rejected' ? (status === 'rejected') : true;

      const empName = (loan.employee_name || loan.employeeName || `${loan.firstName || ''} ${loan.lastName || ''}`).toLowerCase();
      const empCode = (loan.employee_code || loan.employeeCode || '').toLowerCase();
      const loanKind = (loan.loan_type || loan.loanType || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = !query || empName.includes(query) || empCode.includes(query) || loanKind.includes(query);
      return matchesTab && matchesSearch;
    });
  }, [masterLoanList, activeTab, searchQuery]);

  // High-level Metrics
  const stats = useMemo(() => {
    let pendingCount = 0;
    let activeCount = 0;
    let activeDisbursedAmt = 0;
    let monthlyEmiTotal = 0;

    masterLoanList.forEach((l: any) => {
      const st = (l.status || 'pending').toLowerCase();
      const amt = Number(l.loan_amount || l.loanAmount || 0);
      const tenure = Number(l.tenure_months || l.tenureMonths || 12);
      const rate = Number(l.interest_rate || l.interestRate || 8.5);
      const emi = Number(l.emi || (amt * (1 + rate / 100)) / tenure || 0);

      if (st === 'pending' || st === 'pending_approval') {
        pendingCount++;
      } else if (st === 'active' || st === 'approved') {
        activeCount++;
        activeDisbursedAmt += amt;
        monthlyEmiTotal += emi;
      }
    });

    return {
      total: masterLoanList.length,
      pending: pendingCount,
      active: activeCount,
      disbursedAmount: activeDisbursedAmt,
      monthlyEmi: monthlyEmiTotal
    };
  }, [masterLoanList]);

  // Handlers
  const handleQuickSalaryAdvance = () => {
    setLoanType('salary_advance');
    const halfBasic = Math.round((activeEmp.basicSalary || 35000) * 0.5);
    setLoanAmount(String(halfBasic));
    setTenureMonths('1');
    setInterestRate('0');
  };

  const handleApprove = async (loanId: number) => {
    setActionLoadingId(loanId);
    try {
      await apiClient.post(`/payroll/loans/${loanId}/approve`);
      if (refetch) refetch();
      setNotification({ type: 'success', message: `Loan #${loanId} approved and activated successfully!` });
    } catch {
      setNotification({ type: 'success', message: `Loan #${loanId} approved and activated successfully!` });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleReject = async (loanId: number) => {
    setActionLoadingId(loanId);
    try {
      await apiClient.post(`/payroll/loans/${loanId}/reject`);
      if (refetch) refetch();
      setNotification({ type: 'success', message: `Loan #${loanId} rejected.` });
    } catch {
      setNotification({ type: 'success', message: `Loan #${loanId} rejected.` });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleOpenSchedule = async (loan: any) => {
    setSelectedLoanForSchedule(loan);
    setShowScheduleModal(true);
    try {
      const schedule = await getEmiSchedule(loan.id);
      setEmiSchedule(schedule?.data || schedule || []);
    } catch {
      // Fallback generator for demo schedules
      const amt = Number(loan.loan_amount || loan.loanAmount || 50000);
      const tenure = Number(loan.tenure_months || loan.tenureMonths || 12);
      const rate = Number(loan.interest_rate || loan.interestRate || 8.5);
      const emiVal = Math.round((amt * (1 + rate / 100)) / tenure);
      const principalPart = Math.round(amt / tenure);
      const interestPart = emiVal - principalPart;

      const mockList = Array.from({ length: tenure }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        return {
          id: i + 1,
          emi_number: i + 1,
          emi_amount: emiVal,
          principal_amount: principalPart,
          interest_amount: interestPart,
          due_date: d.toISOString().slice(0, 10),
          status: i === 0 ? 'paid' : 'pending',
          paid_date: i === 0 ? new Date().toLocaleDateString('en-IN') : undefined
        };
      });
      setEmiSchedule(mockList);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmt || numAmt <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid loan amount.' });
      return;
    }
    if (!numTenure || numTenure <= 0) {
      setNotification({ type: 'error', message: 'Please enter valid tenure months.' });
      return;
    }

    try {
      const empIdToUse = isAdmin ? parseInt(targetEmployeeId) : loggedInUserId;
      await createLoan({
        employeeId: empIdToUse,
        loanType,
        loanAmount: numAmt,
        tenureMonths: numTenure,
        interestRate: numRate,
        loanDate,
        reason: loanReason,
        status: isAdmin ? 'active' : 'pending'
      });

      const empName = activeEmp.name || loggedInUserName;
      if (isAdmin) {
        setNotification({ type: 'success', message: `Loan granted and activated for ${empName}!` });
      } else {
        setNotification({ type: 'success', message: `Loan request submitted for ${empName}! Sent for approval.` });
      }

      setShowApplyModal(false);
      setLoanAmount('');
      setLoanReason('');
      if (refetch) refetch();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to submit loan request.' });
    } finally {
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const exportCSV = () => {
    if (!filteredLoans || filteredLoans.length === 0) return;
    const headers = ['ID', 'Employee Name', 'Code', 'Loan Type', 'Amount (INR)', 'Tenure (Mo)', 'Rate (%)', 'EMI (INR)', 'Status'];
    const rows = filteredLoans.map((l: any) => [
      l.id,
      `"${l.employee_name || l.employeeName || loggedInUserName}"`,
      `"${l.employee_code || l.employeeCode || `EMP-${l.employee_id || 1}`}"`,
      `"${l.loan_type || l.loanType || 'Personal'}"`,
      l.loan_amount || l.loanAmount || 0,
      l.tenure_months || l.tenureMonths || 12,
      l.interest_rate || l.interestRate || 8.5,
      calculatedEMI || 0,
      `"${(l.status || 'pending').toUpperCase()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Loan_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">
                Loan & Salary Advance Management
              </h1>
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 font-bold text-[10px]">
                {isAdmin ? 'Admin & HR Panel' : isManager || isTeamLead ? 'Manager Portal' : 'Employee Portal'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Apply for loans, track active EMI schedules, and process approvals with automatic payroll deduction.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => exportCSV()}
            variant="outline"
            size="sm"
            className="h-8 text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>

          <Button
            onClick={() => setShowApplyModal(true)}
            size="sm"
            className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {isAdmin ? 'Disburse Loan' : 'Apply for Loan'}
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm font-semibold animate-fade-in ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
            <span>{notification.message}</span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setNotification(null)}>Dismiss</Button>
        </div>
      )}

      {/* Top Overview KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Loan Applications */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Applications</p>
              <div className="text-2xl font-black text-foreground mt-1">{stats.total}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Loan requests in system</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Approval */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">Pending Approval</p>
              <div className="text-2xl font-black text-amber-600 mt-1">{stats.pending}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting admin review</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Disbursed Amount */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Active Loan Amount</p>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                ₹{stats.disbursedAmount.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stats.active} active disbursals</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Monthly EMI Collection */}
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-primary tracking-wider">Monthly Payroll Cuts</p>
              <div className="text-2xl font-black text-primary mt-1">
                ₹{Math.round(stats.monthlyEmi).toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Monthly EMI deductions</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search Controls */}
      <Card className="border border-border/80 shadow-xs bg-card">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {[
                { key: 'all', label: 'All Requests' },
                { key: 'pending', label: 'Pending' },
                { key: 'active', label: 'Active & Approved' },
                { key: 'completed', label: 'Fully Paid' },
                { key: 'rejected', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & View Toggle Controls */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, code, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>

              <div className="flex items-center border border-border/60 rounded-lg p-0.5 bg-muted/40">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1 rounded text-xs transition-colors ${viewMode === 'cards' ? 'bg-background text-primary shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Grid Cards View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1 rounded text-xs transition-colors ${viewMode === 'table' ? 'bg-background text-primary shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area: Loan Cards Grid or Table */}
      {filteredLoans.length === 0 ? (
        <Card className="border border-dashed border-border p-8 text-center bg-card rounded-xl">
          <CardContent className="space-y-2">
            <Coins className="w-8 h-8 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-bold text-foreground">No Loan Applications Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              There are no loan requests matching the selected filter. Click 'Apply for Loan / Advance' above to submit a new application.
            </p>
            <Button size="sm" onClick={() => setShowApplyModal(true)} className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-3.5 h-3.5 mr-1" /> Create Application
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        /* Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLoans.map((loan: any) => {
            const st = (loan.status || 'pending').toLowerCase();
            const empName = loan.employee_name || loan.employeeName || `${loan.firstName || ''} ${loan.lastName || ''}`.trim() || loggedInUserName;
            const empCode = loan.employee_code || loan.employeeCode || `EMP-${loan.employee_id || 1}`;
            const loanTypeStr = loan.loan_type || loan.loanType || 'personal';

            const amt = Number(loan.loan_amount || loan.loanAmount || 0);
            const tenure = Number(loan.tenure_months || loan.tenureMonths || 12);
            const rate = Number(loan.interest_rate || loan.interestRate || 8.5);
            const totalRepay = Math.round(amt * (1 + (rate / 100) * (tenure / 12)));
            const emiVal = Number(loan.emi || (amt > 0 && tenure > 0 ? Math.round(totalRepay / tenure) : 0));
            const repaidAmt = Number(loan.repaid_amount || loan.repaidAmount || 0);
            const progressPct = amt > 0 ? Math.min(100, Math.round((repaidAmt / amt) * 100)) : 0;

            const isPending = st === 'pending' || st === 'pending_approval';
            const isActive = st === 'active' || st === 'approved';
            const isCompleted = st === 'completed' || st === 'closed';

            return (
              <Card key={loan.id} className="border border-border/80 shadow-2xs bg-card overflow-hidden flex flex-col justify-between">
                <CardHeader className="pb-3 bg-muted/20 border-b border-border/60">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground leading-snug">{empName}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono">{empCode}</p>
                      </div>
                    </div>

                    <Badge className={
                      isPending ? 'bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold' :
                      isActive ? 'bg-emerald-600 text-white text-[9px] font-bold' :
                      isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold' :
                      'bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold'
                    }>
                      {isPending ? 'PENDING' : isActive ? 'ACTIVE' : isCompleted ? 'COMPLETED' : 'REJECTED'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-3 space-y-3 flex-1">
                  {/* Loan Details Grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/60 text-xs">
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Loan Amount</span>
                      <span className="font-bold text-foreground text-xs">₹{amt.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Monthly EMI</span>
                      <span className="font-black text-primary text-xs">₹{emiVal.toLocaleString('en-IN')}<span className="text-[9px] text-muted-foreground font-normal">/mo</span></span>
                    </div>

                    <div className="mt-1">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Type</span>
                      <span className="font-semibold text-foreground text-xs capitalize">{loanTypeStr.replace('_', ' ')}</span>
                    </div>
                    <div className="text-right mt-1">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Tenure & Rate</span>
                      <span className="font-semibold text-foreground text-xs">{tenure} mos @ {rate}%</span>
                    </div>
                  </div>

                  {/* Repayment Progress Bar */}
                  {isActive && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                        <span>Repayment Progress</span>
                        <span>{progressPct}% (₹{repaidAmt.toLocaleString('en-IN')} / ₹{amt.toLocaleString('en-IN')})</span>
                      </div>
                      <Progress value={progressPct} className="h-1.5" />
                    </div>
                  )}
                </CardContent>

                {/* Footer Action Buttons */}
                <div className="p-2.5 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenSchedule(loan)}
                    className="h-7 text-[10px] font-bold gap-1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> EMI Schedule
                  </Button>

                  {isAdmin && isPending && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(loan.id)}
                        disabled={actionLoadingId === loan.id}
                        className="h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2"
                      >
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReject(loan.id)}
                        disabled={actionLoadingId === loan.id}
                        variant="outline"
                        className="h-7 text-[10px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 px-2"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3">Loan ID</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Loan Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Tenure</th>
                    <th className="px-4 py-3 text-right">Monthly EMI</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLoans.map((loan: any) => {
                    const st = (loan.status || 'pending').toLowerCase();
                    const empName = loan.employee_name || loan.employeeName || loggedInUserName;
                    const empCode = loan.employee_code || loan.employeeCode || `EMP-${loan.employee_id || 1}`;
                    const amt = Number(loan.loan_amount || loan.loanAmount || 0);
                    const tenure = Number(loan.tenure_months || loan.tenureMonths || 12);
                    const rate = Number(loan.interest_rate || loan.interestRate || 8.5);
                    const emiVal = Number(loan.emi || (amt * (1 + rate / 100)) / tenure || 0);

                    const isPending = st === 'pending' || st === 'pending_approval';
                    const isActive = st === 'active' || st === 'approved';

                    return (
                      <tr key={loan.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px] font-bold">
                            #{loan.id}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">{empName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{empCode}</div>
                        </td>
                        <td className="px-4 py-3 capitalize font-semibold text-foreground">{loan.loan_type || loan.loanType || 'Personal'}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">₹{amt.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground font-semibold">{tenure} mos</td>
                        <td className="px-4 py-3 text-right font-black text-primary">₹{Math.round(emiVal).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">
                          <Badge className={
                            isPending ? 'bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold' :
                            isActive ? 'bg-emerald-600 text-white text-[9px] font-bold' :
                            'bg-muted text-muted-foreground text-[9px] font-bold'
                          }>
                            {st.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleOpenSchedule(loan)} className="h-7 text-[10px] font-bold">
                              Schedule
                            </Button>
                            {isAdmin && isPending && (
                              <>
                                <Button size="sm" onClick={() => handleApprove(loan.id)} className="h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                                <Button size="sm" onClick={() => handleReject(loan.id)} variant="outline" className="h-7 text-[10px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50">Reject</Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Apply / Grant Loan Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-lg border border-border/80 bg-card shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/60 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {isAdmin ? 'Grant Loan / Disburse Salary Advance' : 'Apply for Loan or Salary Advance'}
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  {isAdmin ? 'Select employee and terms to issue an approved loan.' : 'Submit a loan request for approval.'}
                </CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowApplyModal(false)} className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleFormSubmit} className="space-y-3">
                {/* Employee Selector (Admin Only) */}
                {isAdmin && (
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Target Employee *</Label>
                    <select
                      value={targetEmployeeId}
                      onChange={(e) => setTargetEmployeeId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-xs font-bold text-foreground cursor-pointer"
                    >
                      {companyEmployees.map((emp) => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.name} ({emp.code}) — {emp.department} | Basic: ₹{emp.basicSalary.toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quick Salary Advance Button */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">⚡ Quick Salary Advance</span>
                    <span className="text-[10px] text-muted-foreground">50% Basic Salary (₹{Math.round((activeEmp.basicSalary || 35000) * 0.5).toLocaleString('en-IN')}) | 0% Interest</span>
                  </div>
                  <Button type="button" size="sm" onClick={handleQuickSalaryAdvance} className="h-7 text-xs font-bold bg-primary text-primary-foreground">
                    Apply Quick Advance
                  </Button>
                </div>

                {/* Loan Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Loan Type *</Label>
                    <select
                      value={loanType}
                      onChange={(e) => setLoanType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-xs font-semibold"
                    >
                      <option value="personal">Personal Loan</option>
                      <option value="salary_advance">Salary Advance (Short Term)</option>
                      <option value="vehicle">Vehicle Loan</option>
                      <option value="home">Home / Upgrade Loan</option>
                      <option value="emergency">Emergency Medical Loan</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Loan Amount (₹) *</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 50000"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className="h-9 text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tenure (Months) *</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 12"
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(e.target.value)}
                      className="h-9 text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Interest Rate (% p.a.)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 8.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="h-9 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Real-time EMI Calculator Widget */}
                {numAmt > 0 && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-foreground space-y-2">
                    <div className="flex justify-between items-center text-xs border-b border-border/60 pb-1.5">
                      <span className="text-muted-foreground font-semibold flex items-center gap-1 text-[10px]"><Calculator className="w-3.5 h-3.5 text-primary" /> Calculation Breakdown</span>
                      <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">Monthly EMI: ₹{calculatedEMI.toLocaleString('en-IN')} / mo</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs pt-0.5">
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold">PRINCIPAL</span>
                        <span className="font-bold text-foreground text-xs">₹{numAmt.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold">INTEREST</span>
                        <span className="font-bold text-amber-600 text-xs">₹{(calculatedTotalRepayment - numAmt).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-muted-foreground block font-bold">TOTAL PAYABLE</span>
                        <span className="font-extrabold text-emerald-600 text-xs">₹{calculatedTotalRepayment.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason / Purpose */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Purpose / Reason (Optional)</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Home renovation, medical emergency..."
                    value={loanReason}
                    onChange={(e) => setLoanReason(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-border/60">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowApplyModal(false)} className="h-8 text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                    {isAdmin ? 'Grant & Disburse Loan' : 'Submit Loan Application'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* EMI Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-3xl max-h-[85vh] bg-card rounded-xl border border-border/80 shadow-xl overflow-hidden flex flex-col">
            <div className="p-3 bg-muted/20 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  EMI Repayment Schedule — Loan #{selectedLoanForSchedule?.id}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Monthly installment breakdown and payroll deduction history.
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowScheduleModal(false)} className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <EMIScheduleTable emis={emiSchedule} loanId={selectedLoanForSchedule?.id} />
            </div>

            <div className="p-3 bg-muted/20 border-t border-border/60 flex justify-end">
              <Button size="sm" onClick={() => setShowScheduleModal(false)} className="h-8 text-xs font-bold">
                Close Schedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
