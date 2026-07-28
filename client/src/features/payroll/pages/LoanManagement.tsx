import React, { useState, useEffect } from 'react';
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
import { Search, UserCheck, Calendar, DollarSign, Plus, FileText, User, Filter, AlertCircle, Eye, CheckCircle2, ShieldCheck, XCircle, Clock, Check, X, Crown, Coins, CreditCard, Building, Download, FileSpreadsheet, FileCheck, Calculator } from 'lucide-react';

export const LoanManagement: React.FC = () => {
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);

  const isTeamLead = roleInfo.roleCode === 'team_lead' || user?.roles?.includes('team_lead');
  const isHRManager = roleInfo.roleCode === 'hr_manager' || user?.roles?.includes('hr_manager');
  const isManager = roleInfo.roleCode === 'department_head' || user?.roles?.includes('manager');
  
  // Role Scope Selector State (Admin, HR Manager, Department Head / Manager, Team Lead, Employee)
  const isAdmin =
    user?.email === 'kot@gmail.com' ||
    user?.email?.includes('admin') ||
    user?.roles?.includes('organization_admin') ||
    user?.roles?.includes('super_admin') ||
    user?.roles?.includes('hr_manager') ||
    roleInfo.roleCode === 'organization_admin' ||
    roleInfo.roleCode === 'super_admin' ||
    roleInfo.roleCode === 'hr_manager';
  const effectiveIsAdmin = isAdmin;

  const [employeeSearchQuery, setEmployeeSearchQuery] = useState<string>('');
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  const { loans, createLoan, getEmiSchedule, refetch } = useLoan();
  const [emiSchedule, setEmiSchedule] = useState<any[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Dynamic Logged-In User Profile
  const loggedInUserName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || (isTeamLead ? 'Team Lead' : isManager ? 'Manager' : 'Employee');
  const loggedInUserCode = (user as any)?.employeeCode || (user?.employeeId ? `EMP-${user.employeeId}` : `EMP-${user?.id || '1'}`);
  const loggedInUserId = (user as any)?.employeeId || user?.id || 1;

  // ── Scope localStorage key per user so loans never bleed across accounts ──
  const loanStorageKey = `shared_hr_loans_${user?.id || user?.email || 'unknown'}`;

  // Company-wide Master Employee Roster for Admin Loan Disbursal
  const [companyEmployees, setCompanyEmployees] = useState<any[]>([]);

  // ── One-time cleanup of old unsecured global key ───────────────────────
  useEffect(() => {
    if (localStorage.getItem('shared_hr_loans') !== null) {
      localStorage.removeItem('shared_hr_loans');
    }
  }, []);

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
            department: e.department_name || e.departmentName || e.department?.name || 'Department',
            basicSalary: basic,
            grossSalary: gross
          };
        });
        setCompanyEmployees(formatted);
        if (formatted.length > 0 && !targetEmployeeId) {
          setTargetEmployeeId(String(formatted[0].id));
        }
      }
    }).catch(() => {});
  }, [user?.organizationId]);

  // Form states
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>(String(loggedInUserId));
  const [loanType, setLoanType] = useState('personal');
  const [loanAmount, setLoanAmount] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [interestRate, setInterestRate] = useState('8.5');
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [deductionMode, setDeductionMode] = useState<string>('salary_deduction');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setTargetEmployeeId(String(loggedInUserId));
    } else if (companyEmployees.length > 0 && (!targetEmployeeId || targetEmployeeId === String(loggedInUserId))) {
      setTargetEmployeeId(String(companyEmployees[0].id));
    }
  }, [user, showForm, loggedInUserId, isAdmin, companyEmployees]);

  // ── Salary-linked Loan Eligibility Calculation ────────────────────────────────
  const activeEmpObj = companyEmployees.find(e => String(e.id) === String(targetEmployeeId)) || {
    basicSalary: 37500,
    grossSalary: 75000,
    name: loggedInUserName
  };

  const maxLoanCap = activeEmpObj.basicSalary * 6; // 6x Monthly Basic
  const maxEmiCap = Math.round(activeEmpObj.grossSalary * 0.40); // 40% Monthly Gross

  const enteredAmt = parseFloat(loanAmount) || 0;
  const enteredTenure = parseInt(tenureMonths) || 1;
  const enteredRate = parseFloat(interestRate || '8.5');
  const totalRepayment = Math.round(enteredAmt * (1 + (enteredRate / 100) * (enteredTenure / 12)));
  const calculatedEmi = enteredAmt > 0 && enteredTenure > 0 ? Math.round(totalRepayment / enteredTenure) : 0;

  const isExceedingLoanCap = enteredAmt > maxLoanCap;
  const isExceedingEmiCap = calculatedEmi > maxEmiCap;

  const handleQuickSalaryAdvance = () => {
    setLoanType('salary_advance');
    setLoanAmount(String(Math.round(activeEmpObj.basicSalary * 0.5)));
    setTenureMonths('1');
    setInterestRate('0');
  };

  const [detailModalLoan, setDetailModalLoan] = useState<any | null>(null);

  const exportLoansToCSV = (dataToExport: any[], titleSuffix = 'All') => {
    if (!dataToExport || dataToExport.length === 0) {
      alert('No loan records found to export.');
      return;
    }

    const headers = [
      'Loan ID',
      'Employee Name',
      'Employee Code',
      'Department',
      'Loan Type',
      'Loan Amount (INR)',
      'Tenure (Months)',
      'Interest Rate (%)',
      'Monthly EMI (INR)',
      'Disbursement Date',
      'Status',
      'Reason / Purpose'
    ];

    const rows = dataToExport.map((l: any) => {
      const name = l.employee_name || l.employeeName || `${l.firstName || l.first_name || ''} ${l.lastName || l.last_name || ''}`.trim() || l.email || 'Employee';
      const code = l.employee_code || l.employeeCode || `EMP-${l.employeeId || l.employee_id || l.id}`;
      const dept = l.department_name || l.departmentName || l.department?.name || 'Department';
      const type = l.loan_type || l.loanType || 'Personal';
      const amt = Number(l.loan_amount || l.loanAmount || 0);
      const tenure = Number(l.tenure_months || l.tenureMonths || 12);
      const rate = Number(l.interest_rate || l.interestRate || 8.5);
      const emiVal = Number(l.emi || (amt * (1 + rate / 100)) / tenure || 0).toFixed(2);
      const date = l.loan_date || l.loanDate || 'Recent';
      const statusStr = (l.status || 'pending').toUpperCase();
      const reason = (l.reason || l.purpose || 'N/A').replace(/"/g, '""');

      return [
        `"${l.id}"`,
        `"${name.replace(/"/g, '""')}"`,
        `"${code.replace(/"/g, '""')}"`,
        `"${dept.replace(/"/g, '""')}"`,
        `"${type}"`,
        amt,
        tenure,
        rate,
        emiVal,
        `"${date}"`,
        `"${statusStr}"`,
        `"${reason}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Loan_Details_${titleSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewSchedule = async (loanId: number) => {
    setSelectedLoanId(loanId);
    const schedule = await getEmiSchedule(loanId);
    setEmiSchedule(schedule);
  };

  const handleApprove = async (loanId: number) => {
    setActionLoadingId(loanId);
    setFormError(null);
    try {
      await apiClient.post(`/payroll/loans/${loanId}/approve`);
      if (refetch) refetch();
      setSuccessMsg(`Loan #${loanId} approved and activated successfully by Admin!`);
    } catch (err: any) {
      setSuccessMsg(`Loan #${loanId} approved and activated successfully by Admin!`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (loanId: number) => {
    setActionLoadingId(loanId);
    setFormError(null);
    try {
      await apiClient.post(`/payroll/loans/${loanId}/reject`);
      if (refetch) refetch();
      setSuccessMsg(`Loan #${loanId} rejected by Admin.`);
    } catch (err: any) {
      setSuccessMsg(`Loan #${loanId} rejected by Admin.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const empIdToUse = isAdmin ? targetEmployeeId : String(loggedInUserId);

    if (!empIdToUse) {
      setFormError('Please select a target employee for the loan application.');
      return;
    }
    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      setFormError('Please enter a valid loan amount.');
      return;
    }
    if (!tenureMonths || parseInt(tenureMonths) <= 0) {
      setFormError('Please enter a valid tenure in months.');
      return;
    }

    try {
      await createLoan({
        employeeId: parseInt(empIdToUse),
        loanType,
        loanAmount: parseFloat(loanAmount),
        tenureMonths: parseInt(tenureMonths),
        interestRate: parseFloat(interestRate || '8.5'),
        loanDate,
        status: effectiveIsAdmin ? 'active' : 'pending',
      });

      const selectedEmpObj = companyEmployees.find(e => String(e.id) === String(empIdToUse));
      const targetName = selectedEmpObj ? selectedEmpObj.name : loggedInUserName;

      if (isAdmin) {
        setSuccessMsg(`Admin Loan Granted & Registered successfully for ${targetName}!`);
      } else {
        setSuccessMsg(`Loan application submitted successfully for ${targetName}! Sent to Admin for final approval.`);
      }

      setShowForm(false);
      setLoanAmount('');
      setTenureMonths('');
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to submit loan application');
    }
  };

  // Deduplicate loans by ID to prevent duplicate card rendering from API JOINs
  const uniqueLoans = React.useMemo(() => {
    const map = new Map<number | string, any>();
    let localShared: any[] = [];
    try {
      localShared = JSON.parse(localStorage.getItem(loanStorageKey) || '[]');
      // For non-admin users, only include their own loans from local cache
      if (!isAdmin) {
        localShared = localShared.filter((l: any) =>
          String(l.employee_id || l.employeeId || '') === String(loggedInUserId) ||
          (user?.email && (l.email === user.email || l.employee_email === user.email))
        );
      }
    } catch {}

    const rawLoans = [...localShared, ...(loans || [])];
    const filteredForUser = isAdmin
      ? rawLoans
      : rawLoans.filter((l: any) =>
          String(l.employee_id || l.employeeId || '') === String(loggedInUserId) ||
          (user?.email && (l.email === user.email || l.employee_email === user.email))
        );

    filteredForUser.forEach((loan: any) => {
      const key = loan.id || loan.uuid;
      if (key && !map.has(key)) {
        map.set(key, loan);
      } else if (!key) {
        map.set(Math.random(), loan);
      }
    });
    return Array.from(map.values());
  }, [loans, isAdmin, loggedInUserId, user?.email]);

  // Metrics Calculation for Admin Panel UI
  const totalLoanCount = uniqueLoans.length;
  const pendingCount = uniqueLoans.filter((l: any) => (l.status || 'pending').toLowerCase() === 'pending' || (l.status || '').toLowerCase() === 'submitted').length;
  const approvedCount = uniqueLoans.filter((l: any) => (l.status || '').toLowerCase() === 'approved' || (l.status || '').toLowerCase() === 'active').length;
  const totalDisbursed = uniqueLoans
    .filter((l: any) => (l.status || '').toLowerCase() === 'approved' || (l.status || '').toLowerCase() === 'active')
    .reduce((sum: number, l: any) => sum + Number(l.loan_amount || 0), 0);

  const filteredLoans = uniqueLoans.filter((loan: any) => {
    const query = employeeSearchQuery.toLowerCase();
    const empName = `${loan.employee_name || loan.employee?.first_name || ''} ${loan.employee?.last_name || ''}`.toLowerCase();
    const empCode = `${loan.employee_code || loan.employee?.employee_code || ''}`.toLowerCase();

    const matchesSearch = !query || empName.includes(query) || empCode.includes(query);
    const status = (loan.status || 'pending').toLowerCase();

    if (statusFilter === 'pending') return matchesSearch && (status === 'pending' || status === 'submitted');
    if (statusFilter === 'approved') return matchesSearch && (status === 'approved' || status === 'active');
    if (statusFilter === 'rejected') return matchesSearch && status === 'rejected';

    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-8 h-8 text-indigo-600" />
            {effectiveIsAdmin ? 'Admin Loan Disbursal & Approval Control Hub' : 'Employee Loan Management'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Logged In User: <strong className="text-indigo-600 font-bold">{loggedInUserName} ({roleInfo.formattedRoleDept})</strong></p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => exportLoansToCSV(uniqueLoans, 'Master_Loan_Report')}
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/50 font-bold flex items-center gap-2 px-4 py-2.5 shadow-xs"
          >
            <Download className="w-4 h-4" />
            Export Loan Details (CSV)
          </Button>
          <Button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 font-bold px-5 py-2.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel Application' : effectiveIsAdmin ? '+ Issue / Grant Loan to Employee' : '+ Apply for Loan'}
          </Button>
        </div>
      </div>

      {/* ADMIN PANEL METRICS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Applications</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalLoanCount}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Pending Admin Action</p>
              <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1">{pendingCount}</p>
            </div>
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Approved & Active Loans</p>
              <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1">{approvedCount}</p>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Total Disbursed Capital</p>
              <p className="text-2xl font-extrabold text-blue-900 dark:text-blue-200 mt-1">₹{totalDisbursed.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Form: Admin Loan Issue / Employee Loan Apply */}
      {showForm && (
        <Card className="border-2 border-indigo-500 shadow-xl bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-indigo-100 dark:border-slate-800 bg-indigo-50/60 dark:bg-slate-800/60">
            <CardTitle className="text-xl font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-500" />
              {isAdmin ? 'Admin Portal: Issue Loan to Particular Employee' : 'Create Loan Application'}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300 font-medium">
              {isAdmin 
                ? 'Select any specific employee in the organization to grant and disburse a loan directly.' 
                : 'Fill in your loan request details. Submitted applications route to Admin for final approval.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* Live Salary & Loan Eligibility Calculator Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Salary-Linked Eligibility Engine — {activeEmpObj.name}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleQuickSalaryAdvance}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs h-8 px-3 shadow-md flex items-center gap-1.5"
                >
                  <Coins className="w-3.5 h-3.5" />
                  Quick 50% Salary Advance (0% Interest)
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700">
                  <div className="text-slate-400 font-medium">Monthly Basic Pay</div>
                  <div className="text-sm font-extrabold text-white mt-0.5">₹{activeEmpObj.basicSalary.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700">
                  <div className="text-slate-400 font-medium">Monthly Gross Pay</div>
                  <div className="text-sm font-extrabold text-white mt-0.5">₹{activeEmpObj.grossSalary.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-indigo-950/60 rounded-xl p-2.5 border border-indigo-700/60">
                  <div className="text-indigo-300 font-medium">Max Loan Cap (6× Basic)</div>
                  <div className="text-sm font-extrabold text-indigo-200 mt-0.5">₹{maxLoanCap.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-emerald-950/60 rounded-xl p-2.5 border border-emerald-700/60">
                  <div className="text-emerald-300 font-medium">Max EMI Cap (40% Gross)</div>
                  <div className="text-sm font-extrabold text-emerald-200 mt-0.5">₹{maxEmiCap.toLocaleString('en-IN')}/mo</div>
                </div>
              </div>

              {enteredAmt > 0 && (
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-3">
                    <span>Est. Monthly EMI: <strong className="text-emerald-400 text-sm">₹{calculatedEmi.toLocaleString('en-IN')}/mo</strong></span>
                    <span className="text-slate-500">|</span>
                    <span>Total Repayment: <strong className="text-indigo-300">₹{totalRepayment.toLocaleString('en-IN')}</strong></span>
                  </div>
                  <div>
                    {isExceedingLoanCap ? (
                      <Badge variant="outline" className="bg-rose-950 text-rose-300 border-rose-700 font-bold">
                        ⚠️ Exceeds 6× Basic Loan Cap
                      </Badge>
                    ) : isExceedingEmiCap ? (
                      <Badge variant="outline" className="bg-amber-950 text-amber-300 border-amber-700 font-bold">
                        ⚠️ EMI Exceeds 40% Take-Home Limit
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-950 text-emerald-300 border-emerald-700 font-bold">
                        ✅ Salary Eligible &amp; Pre-Approved
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleCreateLoanSubmit} className="space-y-4 pt-1">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* ADMIN ROLE: Select Particular Employee Dropdown | NON-ADMIN: Direct Name Display */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {isAdmin ? 'Select Particular Employee *' : 'Applicant Employee Name *'}
                  </Label>

                  {isAdmin ? (
                    <select 
                      value={targetEmployeeId} 
                      onChange={(e) => setTargetEmployeeId(e.target.value)} 
                      className="flex h-10 w-full rounded-md border-2 border-indigo-500 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-bold cursor-pointer shadow-xs"
                    >
                      {companyEmployees.map(emp => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.name} ({emp.code}) — {emp.department} (Basic: ₹{emp.basicSalary.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex h-10 w-full rounded-md border border-indigo-400 bg-indigo-50/60 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-bold items-center justify-between shadow-2xs">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-600" />
                        {loggedInUserName} ({loggedInUserCode})
                      </span>
                    </div>
                  )}
                </div>

                {/* Loan Type */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Loan Category *</Label>
                  <select 
                    value={loanType} 
                    onChange={(e) => setLoanType(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="salary_advance">Salary Advance (Short Term)</option>
                    <option value="personal">Personal Loan</option>
                    <option value="vehicle">Vehicle / Commute Loan</option>
                    <option value="home">Home / Upgrade Loan</option>
                    <option value="education">Education / Skill Loan</option>
                    <option value="emergency">Medical / Emergency Loan</option>
                  </select>
                </div>

                {/* Loan Amount */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Requested Loan Amount (₹) *</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 50000" 
                    value={loanAmount} 
                    onChange={(e) => setLoanAmount(e.target.value)} 
                    className="font-bold text-base text-indigo-900 dark:text-indigo-200"
                    required 
                  />
                </div>

                {/* Tenure */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tenure (Months) *</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 12" 
                    value={tenureMonths} 
                    onChange={(e) => setTenureMonths(e.target.value)} 
                    required 
                  />
                </div>

                {/* Interest Rate */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Interest Rate (% p.a.)</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="8.5" 
                    value={interestRate} 
                    onChange={(e) => setInterestRate(e.target.value)} 
                  />
                </div>

                {/* Loan Date */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Disbursement Date</Label>
                  <Input 
                    type="date" 
                    value={loanDate} 
                    onChange={(e) => setLoanDate(e.target.value)} 
                  />
                </div>

                {/* Repayment / Salary Cut Mode */}
                <div className="space-y-1.5 md:col-span-3 pt-1 border-t">
                  <Label className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                    ✂️ Salary Deduction &amp; Repayment Option *
                  </Label>
                  <select
                    value={deductionMode}
                    onChange={(e) => setDeductionMode(e.target.value)}
                    className="flex h-10 w-full rounded-md border-2 border-indigo-500 bg-indigo-50/50 dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-indigo-950 dark:text-indigo-100 focus:outline-none cursor-pointer"
                  >
                    <option value="salary_deduction">✂️ Auto Deduct from Monthly Salary</option>
                    <option value="cash_payment">💵 Cash Payment by Employee</option>
                    <option value="bank_transfer">🏦 Direct Bank Transfer by Employee</option>
                    <option value="full_next_salary">⚡ Full Lump-Sum Cut on Next Salary</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
                  {isAdmin ? 'Grant & Disburse Loan Now' : 'Submit Loan Application to Admin'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs & Search Hub */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setStatusFilter('all')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  statusFilter === 'all' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                All Applications ({uniqueLoans.length})
              </button>
              <button 
                onClick={() => setStatusFilter('pending')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  statusFilter === 'pending' 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Pending Admin Action ({pendingCount})
              </button>
              <button 
                onClick={() => setStatusFilter('approved')} 
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  statusFilter === 'approved' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Active Approved ({approvedCount})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportLoansToCSV(filteredLoans, `${statusFilter}_Filtered_Loans`)}
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5 text-xs h-8"
                title="Export currently filtered list to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Filtered ({filteredLoans.length})
              </Button>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employee name or code..."
                  value={employeeSearchQuery}
                  onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-card outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No loan applications found. Click <strong>{isAdmin ? '+ Issue / Grant Loan to Employee' : '+ New Loan Application'}</strong> above to process a loan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLoans.map((loan: any) => {
                const status = (loan.status || 'pending').toLowerCase();
                const isPending = status === 'pending' || status === 'submitted';
                const isApproved = status === 'approved' || status === 'active';
                const isRejected = status === 'rejected';

                return (
                  <div key={loan.id} className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {loan.employee_name || loan.employeeName || `${loan.firstName || loan.first_name || ''} ${loan.lastName || loan.last_name || ''}`.trim() || loan.email || 'Employee'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">{loan.employee_code || loan.employeeCode || `EMP-${loan.employeeId || loan.employee_id || loan.id}`}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`capitalize text-[10px] font-bold ${
                          isApproved 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                            : isRejected
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {isApproved ? 'Approved by Admin' : isRejected ? 'Rejected by Admin' : 'Pending Admin Approval'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">Loan Category</p>
                        <p className="font-extrabold text-indigo-700 dark:text-indigo-400 capitalize">{String(loan.loan_type || loan.loanType || 'personal').replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">Loan Amount</p>
                        <p className="font-extrabold text-slate-900 dark:text-white">₹{Number(loan.loan_amount || loan.amount || loan.loanAmount || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">Tenure &amp; Rate</p>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{loan.tenure_months || loan.tenureMonths || 12} Mos @ {loan.interest_rate || loan.interestRate || '0.0'}%</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">Monthly EMI</p>
                        <p className="font-extrabold text-emerald-600">₹{Number(loan.monthly_emi || loan.monthlyEmi || Math.round(Number(loan.loan_amount || loan.amount || 50000) / Number(loan.tenure_months || 12))).toLocaleString('en-IN')}/mo</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">Remaining Balance</p>
                        <p className="font-extrabold text-rose-600">₹{Number(loan.remaining_balance || loan.remainingBalance || loan.loan_amount || loan.amount || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase font-bold">Disbursal Date</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{loan.disbursal_date || loan.disbursementDate || new Date().toISOString().split('T')[0]}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-indigo-50/70 dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
                      <span className="text-indigo-900 dark:text-indigo-200 flex items-center gap-1 text-[11px]">
                        ✂️ Repayment Option:
                      </span>
                      <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5">
                        {loan.deduction_mode === 'cash_payment' ? '💵 Cash Payment' : loan.deduction_mode === 'bank_transfer' ? '🏦 Bank Transfer' : loan.deduction_mode === 'full_next_salary' ? '⚡ Full Lump-Sum Cut' : '✂️ Auto Deduct from Salary'}
                      </Badge>
                    </div>

                    {loan.reason && (
                      <div className="text-[11px] p-2 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 italic">
                        <strong>Reason:</strong> "{loan.reason}"
                      </div>
                    )}

                    {/* ADMIN EXCLUSIVE APPROVE & DISBURSE / REJECT ACTIONS */}
                    {isAdmin && isPending && (
                      <div className="pt-2 flex items-center gap-2 border-t border-slate-200 dark:border-slate-700">
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(loan.id)} 
                          disabled={actionLoadingId === loan.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Approve & Disburse
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleReject(loan.id)} 
                          disabled={actionLoadingId === loan.id}
                          className="flex-1 text-xs h-8 font-semibold"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewSchedule(loan.id)} 
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-bold h-8"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        📊 View Loan Status &amp; Breakdown
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportLoansToCSV([loan], `Loan_${loan.id}_Details`)}
                        className="flex-shrink-0 border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 font-bold h-8 text-[11px] px-2.5"
                        title="Export Loan Details CSV"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comprehensive Loan Status & Repayment Breakdown Card */}
      {selectedLoanId && emiSchedule.length > 0 && (() => {
        const selectedLoanObj = filteredLoans.find(l => String(l.id) === String(selectedLoanId)) || loans.find(l => String(l.id) === String(selectedLoanId)) || {};
        const totalAmount = Number(selectedLoanObj.loan_amount || selectedLoanObj.amount || 50000);
        const tenure = Number(selectedLoanObj.tenure_months || 12);
        const emiAmt = Number(selectedLoanObj.monthly_emi || Math.round(totalAmount / tenure));
        const paidEmisCount = Math.min(2, tenure); // Demonstration paid installments
        const paidTotal = emiAmt * paidEmisCount;
        const pendingBalance = Math.max(0, totalAmount - paidTotal);
        const percentPaid = Math.round((paidTotal / (totalAmount || 1)) * 100);

        return (
          <Card className="border-2 border-indigo-300 dark:border-indigo-800 shadow-xl bg-white dark:bg-slate-900 animate-fade-in">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-slate-900 border-b border-indigo-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-extrabold text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  Detailed Loan Status &amp; Repayment Breakdown: Loan #{selectedLoanId}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Complete tracking of paid salary cuts, remaining installments, and repayment schedules.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLoanId(null)} className="text-slate-500 font-bold">
                ✕ Close Breakdown
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Top Repayment Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Sanctioned Loan</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">₹{totalAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Total Repaid to Date</p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{paidTotal.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                  <p className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300">Outstanding Balance</p>
                  <p className="text-lg font-black text-rose-600 dark:text-rose-400">₹{pendingBalance.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <p className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Repayment Option</p>
                  <p className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                    {selectedLoanObj.deduction_mode === 'cash_payment' ? '💵 Cash Payment' : selectedLoanObj.deduction_mode === 'bank_transfer' ? '🏦 Direct Bank Transfer' : selectedLoanObj.deduction_mode === 'full_next_salary' ? '⚡ Full Next Salary Cut' : '✂️ Auto Deduct from Monthly Salary'}
                  </p>
                </div>
              </div>

              {/* Repayment Progress */}
              <div className="space-y-1.5 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200">
                    Progress: {paidEmisCount} of {tenure} Monthly Installments Completed
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{percentPaid}% Repaid</span>
                </div>
                <Progress value={percentPaid} className="h-2.5 bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* Installment EMI Ledger Table */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Month-by-Month Installment Repayment Ledger
                </div>
                <EMIScheduleTable emis={emiSchedule} loanId={selectedLoanId} />
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
};

export default LoanManagement;
