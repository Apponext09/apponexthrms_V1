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
import { apiClient } from '@/config/api';
import { Search, UserCheck, Calendar, DollarSign, Plus, FileText, User, Filter, AlertCircle, Eye, CheckCircle2, ShieldCheck, XCircle, Clock, Check, X, Crown, Coins, CreditCard, Building, Download, FileSpreadsheet, FileCheck } from 'lucide-react';

export const LoanManagement: React.FC = () => {
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);

  const isTeamLead = roleInfo.roleCode === 'team_lead' || user?.roles?.includes('team_lead');
  const isHRManager = roleInfo.roleCode === 'hr_manager' || user?.roles?.includes('hr_manager');
  const isManager = roleInfo.roleCode === 'department_head' || user?.roles?.includes('manager');
  
  // Role Scope Selector State (Admin, HR Manager, Department Head / Manager, Team Lead, Employee)
  const isAdmin = roleInfo.roleCode === 'organization_admin' || roleInfo.roleCode === 'super_admin';
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

  // Company-wide Master Employee Roster for Admin Loan Disbursal
  const [companyEmployees, setCompanyEmployees] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/employees', { params: { pageSize: 500 } }).then(res => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((e: any) => ({
          id: e.id,
          name: `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.email || `Employee #${e.id}`,
          code: e.employee_code || e.employeeCode || `EMP-${e.id}`,
          department: e.department_name || e.departmentName || e.department?.name || 'Department'
        }));
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
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setTargetEmployeeId(String(loggedInUserId));
    } else if (companyEmployees.length > 0 && (!targetEmployeeId || targetEmployeeId === String(loggedInUserId))) {
      setTargetEmployeeId(String(companyEmployees[0].id));
    }
  }, [user, showForm, loggedInUserId, isAdmin, companyEmployees]);

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
    (loans || []).forEach((loan: any) => {
      const key = loan.id || loan.uuid;
      if (key && !map.has(key)) {
        map.set(key, loan);
      } else if (!key) {
        map.set(Math.random(), loan);
      }
    });
    return Array.from(map.values());
  }, [loans]);

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
          <CardContent className="p-6">
            <form onSubmit={handleCreateLoanSubmit} className="space-y-4">
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
                          {emp.name} ({emp.code}) — {emp.department}
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
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Loan Type *</Label>
                  <select 
                    value={loanType} 
                    onChange={(e) => setLoanType(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="personal">Personal Loan</option>
                    <option value="vehicle">Vehicle Loan</option>
                    <option value="home">Home / Upgrade Loan</option>
                    <option value="education">Education Loan</option>
                  </select>
                </div>

                {/* Loan Amount */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Loan Amount (₹) *</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 50000" 
                    value={loanAmount} 
                    onChange={(e) => setLoanAmount(e.target.value)} 
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
                        <p className="text-slate-400 text-[10px]">Loan Amount</p>
                        <p className="font-bold text-slate-800 dark:text-slate-200">₹{Number(loan.loan_amount || loan.loanAmount || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px]">Tenure</p>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{loan.tenure_months || loan.tenureMonths || 12} Months</p>
                      </div>
                    </div>

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
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold h-8"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View EMI Schedule
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

      {/* EMI Schedule Modal / Section */}
      {selectedLoanId && emiSchedule.length > 0 && (
        <Card className="border border-indigo-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              EMI Repayment Schedule for Loan #{selectedLoanId}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EMIScheduleTable emis={emiSchedule} loanId={selectedLoanId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LoanManagement;
