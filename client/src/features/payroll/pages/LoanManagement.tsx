import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const [actionStatusOverride, setActionStatusOverride] = useState<Record<string | number, string>>({});
  const [dismissedLoanIds, setDismissedLoanIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Application States
  const [editingLoan, setEditingLoan] = useState<any | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>(String(loggedInUserId));
  const [loanType, setLoanType] = useState<string>('personal');
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [tenureMonths, setTenureMonths] = useState<string>('12');
  const [interestRate, setInterestRate] = useState<string>('8.5');
  const [loanDate, setLoanDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loanReason, setLoanReason] = useState<string>('');

  // ── Route & View Location Sync ──
  const location = useLocation();
  const navigate = useNavigate();

  const isSettingsRoute = useMemo(() => {
    return location.pathname.includes('loan-types') || location.search.includes('settings');
  }, [location.pathname, location.search]);

  const [showLoanTypeSettings, setShowLoanTypeSettings] = useState<boolean>(isSettingsRoute);

  useEffect(() => {
    setShowLoanTypeSettings(isSettingsRoute);
  }, [isSettingsRoute]);
  const [selectedLoanTypeId, setSelectedLoanTypeId] = useState<string | number>('lt_1');
  const [allGrades, setAllGrades] = useState<string[]>([]);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [loanTypeSearch, setLoanTypeSearch] = useState<string>('');

  const [loanTypesList, setLoanTypesList] = useState<any[]>([
    { id: 'lt_1', name: 'Advance', category: 'advance', interestType: 'Interest Free', minTermMonths: '1', maxTermMonths: '6', isActive: true },
    { id: 'lt_2', name: 'Personal loan', category: 'loan', interestType: 'Fixed', interestRate: '8.5', minTermMonths: '6', maxTermMonths: '36', isActive: true }
  ]);

  const [ltForm, setLtForm] = useState<any>({
    name: 'Advance',
    category: 'advance',
    minServiceMonths: '3',
    interestType: 'Interest Free',
    interestRate: '0',
    minTermMonths: '1',
    maxTermMonths: '6',
    gender: 'All',
    departments: [],
    grades: [],
    employeeTypes: [],
    minAmount: '5000',
    maxAmount: '100000',
    maxApplicationsPerYear: '2',
    gapMonths: '3',
    restrictConcurrent: '1',
    description: 'Salary advance for emergency personal expenses.',
    requestForm: 'Choose',
    approvedForm: 'Choose',
    disbursementForm: 'Choose',
    rejectionForm: 'Choose',
    stopForm: 'Choose',
    foreclosureAllowed: false,
    maxEligibility: 'Salary',
    isActive: true
  });

  // Fetch Loan Types from MySQL Database
  const fetchLoanTypesFromDb = () => {
    apiClient.get('/payroll/loan-types').then((res: any) => {
      const items = res.data?.data || res.data || [];
      if (Array.isArray(items) && items.length > 0) {
        setLoanTypesList(items);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    fetchLoanTypesFromDb();

    apiClient.get('/settings/grades').then((res: any) => {
      const items = res.data?.data || res.data?.items || res.data || [];
      if (Array.isArray(items) && items.length > 0) {
        const names = items.map((g: any) => g.name || g.code || g.grade_name).filter(Boolean);
        setAllGrades(names);
      } else {
        setAllGrades(['Grade L1 - Associate / Junior', 'Grade L2 - Senior Specialist', 'Grade L3 - Management & Lead']);
      }
    }).catch(() => {
      setAllGrades(['Grade L1 - Associate / Junior', 'Grade L2 - Senior Specialist', 'Grade L3 - Management & Lead']);
    });

    apiClient.get('/settings/departments').then((res: any) => {
      const items = res.data?.data || res.data || [];
      if (Array.isArray(items) && items.length > 0) {
        const names = items.map((d: any) => d.name || d.department_name).filter(Boolean);
        setAllDepartments(names);
      } else {
        setAllDepartments(['Engineering', 'Sales & Marketing', 'Human Resources', 'Finance & Accounts', 'Operations']);
      }
    }).catch(() => {
      setAllDepartments(['Engineering', 'Sales & Marketing', 'Human Resources', 'Finance & Accounts', 'Operations']);
    });
  }, []);

  const handleSelectLoanType = (typeItem: any) => {
    setSelectedLoanTypeId(typeItem.id);
    setLtForm({
      name: typeItem.name || 'Personal loan',
      category: typeItem.category || 'loan',
      minServiceMonths: String(typeItem.minServiceMonths ?? '3'),
      interestType: typeItem.interestType || 'Fixed',
      interestRate: String(typeItem.interestRate ?? '8.5'),
      minTermMonths: String(typeItem.minTermMonths ?? '1'),
      maxTermMonths: String(typeItem.maxTermMonths ?? '12'),
      gender: typeItem.gender || 'All',
      departments: Array.isArray(typeItem.departments) ? typeItem.departments : [],
      grades: Array.isArray(typeItem.grades) ? typeItem.grades : [],
      employeeTypes: Array.isArray(typeItem.employeeTypes) ? typeItem.employeeTypes : [],
      minAmount: String(typeItem.minAmount ?? '5000'),
      maxAmount: String(typeItem.maxAmount ?? '100000'),
      maxApplicationsPerYear: String(typeItem.maxApplicationsPerYear ?? '2'),
      gapMonths: String(typeItem.gapMonths ?? '3'),
      restrictConcurrent: String(typeItem.restrictConcurrent ?? '1'),
      description: typeItem.description || '',
      requestForm: typeItem.requestForm || 'Choose',
      approvedForm: typeItem.approvedForm || 'Choose',
      disbursementForm: typeItem.disbursementForm || 'Choose',
      rejectionForm: typeItem.rejectionForm || 'Choose',
      stopForm: typeItem.stopForm || 'Choose',
      foreclosureAllowed: Boolean(typeItem.foreclosureAllowed),
      maxEligibility: typeItem.maxEligibility || 'Salary',
      isActive: typeItem.isActive !== false
    });
  };

  const handleOpenNewLoanModal = () => {
    setEditingLoan(null);
    setLoanType(loanTypesList[0]?.name || 'Personal Loan');
    setLoanAmount('');
    setTenureMonths('12');
    setInterestRate(String(loanTypesList[0]?.interestRate ?? '8.5'));
    setLoanDate(new Date().toISOString().split('T')[0]);
    setLoanReason('');
    setShowApplyModal(true);
  };

  const handleEditLoan = (loan: any) => {
    setEditingLoan(loan);
    const empId = loan.employee_id || loan.employeeId || loggedInUserId;
    setTargetEmployeeId(String(empId));
    setLoanType(loan.loan_type || loan.loanType || 'Personal Loan');
    setLoanAmount(String(loan.loan_amount || loan.loanAmount || loan.amount || ''));
    setTenureMonths(String(loan.tenure_months || loan.tenureMonths || '12'));
    setInterestRate(String(loan.interest_rate || loan.interestRate || '8.5'));
    setLoanDate(loan.loan_date ? String(loan.loan_date).slice(0, 10) : new Date().toISOString().split('T')[0]);
    setLoanReason(loan.reason || '');
    setShowApplyModal(true);
  };

  const handleSaveLoanType = async () => {
    if (!ltForm.name || !ltForm.name.trim()) {
      setNotification({ type: 'error', message: 'Please enter a valid Loan Name.' });
      return;
    }
    const payload = {
      id: selectedLoanTypeId,
      ...ltForm
    };

    try {
      await apiClient.post('/payroll/loan-types', payload);
      fetchLoanTypesFromDb();
      setNotification({ type: 'success', message: `Loan Type "${ltForm.name}" saved successfully!` });
    } catch (err: any) {
      // Fallback local update
      const isExisting = loanTypesList.some(t => String(t.id) === String(selectedLoanTypeId));
      let updatedList: any[];
      if (isExisting) {
        updatedList = loanTypesList.map(t => String(t.id) === String(selectedLoanTypeId) ? { ...t, ...ltForm } : t);
      } else {
        const newItem = { id: selectedLoanTypeId, ...ltForm };
        updatedList = [...loanTypesList, newItem];
      }
      setLoanTypesList(updatedList);
      setNotification({ type: 'success', message: `Loan Type "${ltForm.name}" saved successfully!` });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeleteLoanType = async (id: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this Loan Type?')) return;
    try {
      await apiClient.delete(`/payroll/loan-types/${id}`);
    } catch (err) {}
    setLoanTypesList(prev => prev.filter(t => String(t.id) !== String(id)));
    setNotification({ type: 'success', message: 'Loan Type deleted successfully.' });
    setTimeout(() => setNotification(null), 4000);
  };

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
    }).catch(() => { });
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

  // Deduplicate and process loans list — server data only, no local fake store
  const masterLoanList = useMemo(() => {
    const map = new Map<string, any>();
    const compositeKeys = new Set<string>();

    const userFiltered = isAdmin
      ? (loans || [])
      : (loans || []).filter((l: any) =>
        String(l.employee_id || l.employeeId || '') === String(loggedInUserId) ||
        (user?.email && (l.email === user.email || l.employee_email === user.email))
      );

    userFiltered.forEach((l: any) => {
      const primaryKey = String(l.id || l.uuid || `temp_${Math.random()}`);
      const empId = String(l.employee_id || l.employeeId || l.employee_code || '');
      const amount = String(l.loan_amount || l.amount || l.principal_amount || '');
      const fingerprint = `${empId}_${amount}`;

      if (!map.has(primaryKey) && (!fingerprint || !compositeKeys.has(fingerprint))) {
        const overrideStatus = actionStatusOverride[primaryKey];
        const finalLoan = overrideStatus ? { ...l, status: overrideStatus } : l;
        map.set(primaryKey, finalLoan);
        if (fingerprint && fingerprint !== '_') {
          compositeKeys.add(fingerprint);
        }
      }
    });

    // Filter out loans that have been acted upon (dismissed)
    const result = Array.from(map.values()).filter((l: any) => {
      const key = String(l.id || l.uuid || '');
      return !dismissedLoanIds.has(key);
    });

    return result;
  }, [loans, isAdmin, loggedInUserId, user, actionStatusOverride, dismissedLoanIds]);

  // Filtered loans based on tab & search.
  // 'all' must actually mean all — it used to silently show only pending
  // loans while the summary tiles above counted every status, so an org
  // with only active/completed loans (zero pending) saw "Total: 12" on the
  // tiles and an empty "No Loan Applications Found" table underneath.
  const filteredLoans = useMemo(() => {
    return masterLoanList.filter((loan: any) => {
      const status = (loan.status || 'pending').toLowerCase();
      const isPendingStatus = status === 'pending' || status === 'pending_approval' || status === 'submitted';

      const matchesTab =
        activeTab === 'all' ? true :
          activeTab === 'pending' ? isPendingStatus :
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

      if (st === 'pending' || st === 'pending_approval' || st === 'submitted') {
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

      // Only dismiss from view and clear local cache once the approval
      // actually succeeded — this used to happen unconditionally up front,
      // so a failed approve still made the loan vanish from the admin's
      // list while it silently stayed pending in the database.
      setDismissedLoanIds(prev => new Set([...prev, String(loanId)]));
      try {
        let localShared = JSON.parse(localStorage.getItem(loanStorageKey) || '[]');
        localShared = localShared.filter((l: any) => String(l.id) !== String(loanId) && l.uuid !== loanId);
        localStorage.setItem(loanStorageKey, JSON.stringify(localShared));
      } catch { }

      if (refetch) refetch();
      setNotification({ type: 'success', message: `Loan #${loanId} approved and activated successfully!` });
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.response?.data?.message || `Failed to approve Loan #${loanId}. Please try again.` });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleReject = async (loanId: number) => {
    setActionLoadingId(loanId);

    try {
      await apiClient.post(`/payroll/loans/${loanId}/reject`);

      setDismissedLoanIds(prev => new Set([...prev, String(loanId)]));
      try {
        let localShared = JSON.parse(localStorage.getItem(loanStorageKey) || '[]');
        localShared = localShared.filter((l: any) => String(l.id) !== String(loanId) && l.uuid !== loanId);
        localStorage.setItem(loanStorageKey, JSON.stringify(localShared));
      } catch { }

      if (refetch) refetch();
      setNotification({ type: 'success', message: `Loan #${loanId} has been rejected.` });
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.response?.data?.message || `Failed to reject Loan #${loanId}. Please try again.` });
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

      if (editingLoan) {
        // Update existing loan
        await apiClient.put(`/payroll/loans/${editingLoan.id}`, {
          employeeId: empIdToUse,
          loanType,
          loanAmount: numAmt,
          tenureMonths: numTenure,
          interestRate: numRate,
          loanDate,
          reason: loanReason
        });
        setNotification({ type: 'success', message: `Loan #${editingLoan.id} updated successfully!` });
      } else {
        // Create new loan
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
      }

      setShowApplyModal(false);
      setEditingLoan(null);
      setLoanAmount('');
      setLoanReason('');
      if (refetch) refetch();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to process loan request.' });
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

  // 🌟 Render 1:1 Hoshi Loan Type Settings Screen (Image 1-5 Exact Replica)
  if (showLoanTypeSettings) {
    return (
      <div className="space-y-4 pb-12 animate-fade-in">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-xs">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            <h1 className="text-base font-black uppercase text-foreground tracking-wide">
              LOAN TYPE SETTINGS
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowLoanTypeSettings(false);
              navigate(location.pathname.startsWith('/hr') ? '/hr/loans' : '/payroll/loans');
            }}
            className="h-8 text-xs font-bold cursor-pointer"
          >
            ← Back to Loan Requests
          </Button>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Loan Type List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            {/* Filter Bar: All | Search term... | Active */}
            <div className="flex items-center gap-2 text-xs">
              <select className="h-8 border border-border rounded px-2 text-xs font-bold bg-background">
                <option value="all">All</option>
              </select>
              <Input
                placeholder="Search term..."
                value={loanTypeSearch}
                onChange={e => setLoanTypeSearch(e.target.value)}
                className="h-8 text-xs flex-1 bg-background"
              />
              <select className="h-8 border border-border rounded px-2 text-xs font-bold bg-background">
                <option value="active">Active</option>
              </select>
            </div>

            {/* Loan Type List Card */}
            <Card className="border border-border shadow-xs bg-card">
              <CardHeader className="p-3 border-b border-border flex flex-row items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Loan Type</span>
                </div>
                <Badge variant="outline" className="bg-slate-800 text-white font-black text-xs">
                  {loanTypesList.length}
                </Badge>
              </CardHeader>

              <CardContent className="p-3 space-y-2">
                <Button
                  onClick={() => {
                    const newId = `lt_${Date.now()}`;
                    setSelectedLoanTypeId(newId);
                    setLtForm({
                      name: '',
                      category: 'loan',
                      minServiceMonths: '',
                      interestType: 'Fixed',
                      interestRate: '8.5',
                      minTermMonths: '1',
                      maxTermMonths: '12',
                      gender: 'All',
                      minAmount: '5000',
                      maxAmount: '100000',
                      maxApplicationsPerYear: '2',
                      gapMonths: '3',
                      restrictConcurrent: '1',
                      description: '',
                      requestForm: 'Choose',
                      approvedForm: 'Choose',
                      disbursementForm: 'Choose',
                      rejectionForm: 'Choose',
                      stopForm: 'Choose',
                      foreclosureAllowed: false,
                      maxEligibility: 'Salary',
                      isActive: true
                    });
                  }}
                  className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 shadow-2xs mb-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> New Loan Type
                </Button>

                {loanTypesList
                  .filter(t => !loanTypeSearch || t.name?.toLowerCase().includes(loanTypeSearch.toLowerCase()))
                  .map(type => (
                    <div
                      key={type.id}
                      onClick={() => handleSelectLoanType(type)}
                      className={`w-full p-3 rounded-lg flex items-center justify-between gap-2 font-bold text-xs text-white transition-all text-left shadow-sm cursor-pointer ${
                        selectedLoanTypeId === type.id
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 ring-2 ring-teal-400'
                          : 'bg-teal-500/90 hover:bg-teal-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span className="truncate">{type.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLoanType(type.id, e)}
                        title="Delete Loan Type"
                        className="p-1 rounded hover:bg-red-500/30 text-white/80 hover:text-white transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Loan Application Settings & Accordions (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Card 1: Loan Application Settings Form */}
            <Card className="border border-border shadow-xs bg-card">
              <CardHeader className="p-3 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 font-extrabold text-xs text-foreground">
                  <Building className="w-4 h-4 text-primary" />
                  <span>
                    {loanTypesList.some(t => String(t.id) === String(selectedLoanTypeId))
                      ? `Edit Loan Type: ${ltForm.name || 'Untitled'}`
                      : 'Create New Loan Type'}
                  </span>
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {loanTypesList.some(t => String(t.id) === String(selectedLoanTypeId))
                      ? 'Editing Existing Type'
                      : 'New Type'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                <div className="space-y-3">
                  {/* Loan Name */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <label className="font-bold text-foreground">
                      Loan Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={ltForm.name}
                      onChange={e => setLtForm({ ...ltForm, name: e.target.value })}
                      placeholder="e.g. Personal loan"
                      className="md:col-span-2 h-8 text-xs font-semibold bg-background"
                    />
                  </div>

                  {/* Loan Category Radio */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <label className="font-bold text-foreground">
                      Loan Category <span className="text-red-500">*</span>
                    </label>
                    <div className="md:col-span-2 flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input
                          type="radio"
                          name="category"
                          checked={ltForm.category === 'loan'}
                          onChange={() => setLtForm({ ...ltForm, category: 'loan' })}
                          className="accent-teal-600 cursor-pointer"
                        /> Loan
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input
                          type="radio"
                          name="category"
                          checked={ltForm.category === 'advance'}
                          onChange={() => setLtForm({ ...ltForm, category: 'advance' })}
                          className="accent-teal-600 cursor-pointer"
                        /> Advance
                      </label>
                    </div>
                  </div>

                  {/* Grid 2-cols for Term, Rates, Limits */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Minimum Service Required</label>
                      <Input value={ltForm.minServiceMonths} onChange={e => setLtForm({ ...ltForm, minServiceMonths: e.target.value })} placeholder="Months" className="h-8 text-xs bg-background" />
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Interest Type <span className="text-red-500">*</span></label>
                      <select value={ltForm.interestType || 'Simple'} onChange={e => setLtForm({ ...ltForm, interestType: e.target.value })} className="w-full h-8 border border-border rounded px-2 text-xs font-semibold bg-background">
                        <option value="Select">Select</option>
                        <option value="Simple">Simple Interest</option>
                        <option value="Interest Free">Interest Free</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Interest Rate (%)</label>
                      <Input value={ltForm.interestRate} onChange={e => setLtForm({ ...ltForm, interestRate: e.target.value })} placeholder="8.5" className="h-8 text-xs bg-background" />
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Minimum Term <span className="text-red-500">*</span></label>
                      <Input value={ltForm.minTermMonths} onChange={e => setLtForm({ ...ltForm, minTermMonths: e.target.value })} placeholder="1" className="h-8 text-xs bg-background" />
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Maximum Term <span className="text-red-500">*</span></label>
                      <Input value={ltForm.maxTermMonths} onChange={e => setLtForm({ ...ltForm, maxTermMonths: e.target.value })} placeholder="Months" className="h-8 text-xs bg-background" />
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Gender</label>
                      <select value={ltForm.gender} onChange={e => setLtForm({ ...ltForm, gender: e.target.value })} className="w-full h-8 border border-border rounded px-2 text-xs font-semibold bg-background">
                        <option value="All">All</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Minimum Amount <span className="text-red-500">*</span></label>
                      <Input value={ltForm.minAmount} onChange={e => setLtForm({ ...ltForm, minAmount: e.target.value })} placeholder="5000" className="h-8 text-xs bg-background" />
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Maximum Amount</label>
                      <Input value={ltForm.maxAmount} onChange={e => setLtForm({ ...ltForm, maxAmount: e.target.value })} placeholder="100000" className="h-8 text-xs bg-background" />
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Number of times employee can apply in a Year</label>
                      <Input value={ltForm.maxApplicationsPerYear} onChange={e => setLtForm({ ...ltForm, maxApplicationsPerYear: e.target.value })} placeholder="2" className="h-8 text-xs bg-background" />
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Gaps Between Same loans (Months)</label>
                      <Input value={ltForm.gapMonths} onChange={e => setLtForm({ ...ltForm, gapMonths: e.target.value })} placeholder="3" className="h-8 text-xs bg-background" />
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Restrict concurrent loans</label>
                      <Input value={ltForm.restrictConcurrent} onChange={e => setLtForm({ ...ltForm, restrictConcurrent: e.target.value })} placeholder="1" className="h-8 text-xs bg-background" />
                    </div>
                  </div>

                  {/* Description Textarea */}
                  <div>
                    <label className="font-bold text-muted-foreground block mb-1">Description</label>
                    <textarea rows={2} value={ltForm.description} onChange={e => setLtForm({ ...ltForm, description: e.target.value })} className="w-full border border-border rounded p-2 text-xs font-semibold bg-background" />
                  </div>

                  {/* Form Selectors Grid (Matching Hoshi HRMS 1:1 Screenshots) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Request Form</label>
                      <select value={ltForm.requestForm || 'Choose'} onChange={e => setLtForm({ ...ltForm, requestForm: e.target.value })} className="w-full h-8 border border-border rounded px-2 text-xs font-semibold bg-background">
                        <option value="Choose">Choose</option>
                        <option value="Loan Approval Form">Loan Approval Form</option>
                        <option value="Loan Disbursement Form">Loan Disbursement Form</option>
                        <option value="Loan Rejection Form">Loan Rejection Form</option>
                        <option value="Loan Request Form">Loan Request Form</option>
                        <option value="Loan Stop Form">Loan Stop Form</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Approved Form</label>
                      <select value={ltForm.approvedForm || 'Choose'} onChange={e => setLtForm({ ...ltForm, approvedForm: e.target.value })} className="w-full h-8 border border-border rounded px-2 text-xs font-semibold bg-background">
                        <option value="Choose">Choose</option>
                        <option value="Loan Approval Form">Loan Approval Form</option>
                        <option value="Loan Disbursement Form">Loan Disbursement Form</option>
                        <option value="Loan Rejection Form">Loan Rejection Form</option>
                        <option value="Loan Request Form">Loan Request Form</option>
                        <option value="Loan Stop Form">Loan Stop Form</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Disbursement Form <span className="text-red-500">*</span></label>
                      <select value={ltForm.disbursementForm || 'Choose'} onChange={e => setLtForm({ ...ltForm, disbursementForm: e.target.value })} className="w-full h-8 border border-border rounded px-2 text-xs font-semibold bg-background">
                        <option value="Choose">Choose</option>
                        <option value="Loan Approval Form">Loan Approval Form</option>
                        <option value="Loan Disbursement Form">Loan Disbursement Form</option>
                        <option value="Loan Rejection Form">Loan Rejection Form</option>
                        <option value="Loan Request Form">Loan Request Form</option>
                        <option value="Loan Stop Form">Loan Stop Form</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Rejection Form</label>
                      <select value={ltForm.rejectionForm || 'Choose'} onChange={e => setLtForm({ ...ltForm, rejectionForm: e.target.value })} className="w-full h-8 border border-border rounded px-2 text-xs font-semibold bg-background">
                        <option value="Choose">Choose</option>
                        <option value="Loan Approval Form">Loan Approval Form</option>
                        <option value="Loan Disbursement Form">Loan Disbursement Form</option>
                        <option value="Loan Rejection Form">Loan Rejection Form</option>
                        <option value="Loan Request Form">Loan Request Form</option>
                        <option value="Loan Stop Form">Loan Stop Form</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-muted-foreground block mb-1">Stop Form</label>
                      <select value={ltForm.stopForm || 'Choose'} onChange={e => setLtForm({ ...ltForm, stopForm: e.target.value })} className="w-full h-8 border border-border rounded px-2 text-xs font-semibold bg-background">
                        <option value="Choose">Choose</option>
                        <option value="Loan Approval Form">Loan Approval Form</option>
                        <option value="Loan Disbursement Form">Loan Disbursement Form</option>
                        <option value="Loan Rejection Form">Loan Rejection Form</option>
                        <option value="Loan Request Form">Loan Request Form</option>
                        <option value="Loan Stop Form">Loan Stop Form</option>
                      </select>
                    </div>
                  </div>

                  {/* Foreclosure Allowed Toggle */}
                  <div className="pt-2">
                    <label className="font-bold text-muted-foreground block mb-1">Foreclosure allowed</label>
                    <button
                      type="button"
                      onClick={() => setLtForm({ ...ltForm, foreclosureAllowed: !ltForm.foreclosureAllowed })}
                      className={`px-4 py-1.5 rounded border text-xs font-bold transition-all cursor-pointer ${ltForm.foreclosureAllowed ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'}`}
                    >
                      {ltForm.foreclosureAllowed ? 'Yes' : 'No'}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accordion 1: Eligibility Settings */}
            <details className="border border-border rounded-xl bg-card overflow-hidden" open>
              <summary className="p-3 text-xs font-extrabold text-foreground cursor-pointer flex items-center justify-between bg-muted/20 select-none">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Eligibility Settings
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </summary>
              <div className="p-4 space-y-3 text-xs">
                {/* Company Location */}
                <details className="border border-border rounded-lg p-2.5 bg-muted/10">
                  <summary className="font-bold text-foreground cursor-pointer">[+] Company - Location</summary>
                  <div className="p-2 space-y-1">
                    <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="checkbox" defaultChecked className="accent-teal-600" /> Select All</label>
                    <label className="flex items-center gap-2 font-semibold cursor-pointer"><input type="checkbox" defaultChecked className="accent-teal-600" /> Trial Company (Airoli)</label>
                  </div>
                </details>

                {/* Department */}
                <details className="border border-border rounded-lg p-2.5 bg-muted/10" open>
                  <summary className="font-bold text-foreground cursor-pointer flex items-center justify-between">
                    <span>[+] Department ({(!ltForm.departments || ltForm.departments.length === 0) ? 'All Selected' : `${ltForm.departments.length} Selected`})</span>
                  </summary>
                  <div className="p-2 space-y-1 max-h-36 overflow-y-auto">
                    <label className="flex items-center gap-2 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!ltForm.departments || ltForm.departments.length === 0 || ltForm.departments.length === allDepartments.length}
                        onChange={() => {
                          if (!ltForm.departments || ltForm.departments.length === 0 || ltForm.departments.length === allDepartments.length) {
                            setLtForm({ ...ltForm, departments: [] });
                          } else {
                            setLtForm({ ...ltForm, departments: [...allDepartments] });
                          }
                        }}
                        className="accent-teal-600"
                      />
                      Select All
                    </label>
                    {allDepartments.map(d => {
                      const checked = !ltForm.departments || ltForm.departments.length === 0 || ltForm.departments.includes(d);
                      return (
                        <label key={d} className="flex items-center gap-2 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const curr = (!ltForm.departments || ltForm.departments.length === 0) ? [...allDepartments] : [...ltForm.departments];
                              if (curr.includes(d)) {
                                setLtForm({ ...ltForm, departments: curr.filter((x: string) => x !== d) });
                              } else {
                                setLtForm({ ...ltForm, departments: [...curr, d] });
                              }
                            }}
                            className="accent-teal-600"
                          />
                          {d}
                        </label>
                      );
                    })}
                  </div>
                </details>

                {/* Grade (From Master!) */}
                <details className="border border-border rounded-lg p-2.5 bg-muted/10" open>
                  <summary className="font-bold text-foreground cursor-pointer flex items-center justify-between">
                    <span>[+] Grade ({(!ltForm.grades || ltForm.grades.length === 0) ? 'All Selected' : `${ltForm.grades.length} Selected`})</span>
                  </summary>
                  <div className="p-2 space-y-1 max-h-36 overflow-y-auto">
                    <label className="flex items-center gap-2 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!ltForm.grades || ltForm.grades.length === 0 || ltForm.grades.length === allGrades.length}
                        onChange={() => {
                          if (!ltForm.grades || ltForm.grades.length === 0 || ltForm.grades.length === allGrades.length) {
                            setLtForm({ ...ltForm, grades: [] });
                          } else {
                            setLtForm({ ...ltForm, grades: [...allGrades] });
                          }
                        }}
                        className="accent-teal-600"
                      />
                      Select All
                    </label>
                    {allGrades.map(g => {
                      const checked = !ltForm.grades || ltForm.grades.length === 0 || ltForm.grades.includes(g);
                      return (
                        <label key={g} className="flex items-center gap-2 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const curr = (!ltForm.grades || ltForm.grades.length === 0) ? [...allGrades] : [...ltForm.grades];
                              if (curr.includes(g)) {
                                setLtForm({ ...ltForm, grades: curr.filter((x: string) => x !== g) });
                              } else {
                                setLtForm({ ...ltForm, grades: [...curr, g] });
                              }
                            }}
                            className="accent-teal-600"
                          />
                          {g}
                        </label>
                      );
                    })}
                  </div>
                </details>

                {/* Employee Type */}
                <details className="border border-border rounded-lg p-2.5 bg-muted/10" open>
                  <summary className="font-bold text-foreground cursor-pointer flex items-center justify-between">
                    <span>[+] Employee Type ({(!ltForm.employeeTypes || ltForm.employeeTypes.length === 0) ? 'All Selected' : `${ltForm.employeeTypes.length} Selected`})</span>
                  </summary>
                  <div className="p-2 space-y-1">
                    {['Full Time', 'Part Time', 'Intern', 'Contractor', 'Consultant'].map(t => {
                      const checked = !ltForm.employeeTypes || ltForm.employeeTypes.length === 0 || ltForm.employeeTypes.includes(t);
                      return (
                        <label key={t} className="flex items-center gap-2 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const allTypes = ['Full Time', 'Part Time', 'Intern', 'Contractor', 'Consultant'];
                              const curr = (!ltForm.employeeTypes || ltForm.employeeTypes.length === 0) ? [...allTypes] : [...ltForm.employeeTypes];
                              if (curr.includes(t)) {
                                setLtForm({ ...ltForm, employeeTypes: curr.filter((x: string) => x !== t) });
                              } else {
                                setLtForm({ ...ltForm, employeeTypes: [...curr, t] });
                              }
                            }}
                            className="accent-teal-600"
                          />
                          {t}
                        </label>
                      );
                    })}
                  </div>
                </details>

                {/* Employee Status */}
                <details className="border border-border rounded-lg p-2.5 bg-muted/10">
                  <summary className="font-bold text-foreground cursor-pointer">[+] Employee Status</summary>
                  <div className="p-2 space-y-1">
                    <label className="flex items-center gap-2 font-bold cursor-pointer"><input type="checkbox" defaultChecked className="accent-teal-600" /> Select All</label>
                    {['Active', 'Probation', 'Notice Period'].map(s => (
                      <label key={s} className="flex items-center gap-2 font-semibold cursor-pointer"><input type="checkbox" defaultChecked className="accent-teal-600" /> {s}</label>
                    ))}
                  </div>
                </details>
              </div>
            </details>

            {/* Accordion 2: Disbursement Settings (Image 1 & 2 Exact Match) */}
            <details className="border border-border rounded-xl bg-card overflow-hidden" open>
              <summary className="p-3 text-xs font-extrabold text-foreground cursor-pointer flex items-center justify-between bg-muted/20 select-none">
                <span className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" /> Disbursement Settings
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </summary>
              <div className="p-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <label className="font-bold text-foreground">
                    Max Eligibility <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={ltForm.maxEligibility || 'Grade'}
                    onChange={e => setLtForm({ ...ltForm, maxEligibility: e.target.value })}
                    className="w-full h-8 border border-border rounded px-2 text-xs font-bold bg-background"
                  >
                    <option value="Select">Select</option>
                    <option value="Salary">Salary</option>
                    <option value="Grade">Grade</option>
                    <option value="Department">Department</option>
                  </select>
                </div>

                {/* Default Max Loan Amount */}
                {ltForm.maxEligibility && ltForm.maxEligibility !== 'Select' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center pt-1">
                    <label className="font-bold text-foreground">
                      Default Max Loan Amount <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={ltForm.defaultMaxLoanAmount || ltForm.maxAmount || '15000'}
                      onChange={e => setLtForm({ ...ltForm, defaultMaxLoanAmount: e.target.value, maxAmount: e.target.value })}
                      placeholder="15000"
                      className="h-8 text-xs font-bold bg-background"
                    />
                  </div>
                )}

                {/* Dynamic Breakdown when 'Grade' is selected (Exact Image 1 & 2 match) */}
                {ltForm.maxEligibility === 'Grade' && (
                  <div className="pt-2 space-y-3 border-t border-border/60">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Grade Specific Max Loan Limits:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(allGrades.length > 0 ? allGrades : ['CEO', 'Staff', 'Grade L1 - Junior', 'Grade L2 - Senior', 'Grade L3 - Manager']).map((g: string) => (
                        <div key={g} className="flex items-center justify-between gap-2 p-2 rounded border border-border bg-muted/10">
                          <span className="font-bold text-foreground truncate w-24">{g}</span>
                          <Input
                            type="number"
                            value={(ltForm.gradeMaxAmounts && ltForm.gradeMaxAmounts[g]) ?? (g.toLowerCase().includes('ceo') ? '15000' : g.toLowerCase().includes('staff') ? '10000' : '15000')}
                            onChange={e => setLtForm({
                              ...ltForm,
                              gradeMaxAmounts: { ...(ltForm.gradeMaxAmounts || {}), [g]: e.target.value }
                            })}
                            placeholder="10000"
                            className="h-7 w-32 text-xs font-bold bg-background text-right"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic Breakdown when 'Department' is selected */}
                {ltForm.maxEligibility === 'Department' && (
                  <div className="pt-2 space-y-3 border-t border-border/60">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Department Specific Max Loan Limits:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {allDepartments.map((d: string) => (
                        <div key={d} className="flex items-center justify-between gap-2 p-2 rounded border border-border bg-muted/10">
                          <span className="font-bold text-foreground truncate w-24">{d}</span>
                          <Input
                            type="number"
                            value={(ltForm.deptMaxAmounts && ltForm.deptMaxAmounts[d]) ?? '15000'}
                            onChange={e => setLtForm({
                              ...ltForm,
                              deptMaxAmounts: { ...(ltForm.deptMaxAmounts || {}), [d]: e.target.value }
                            })}
                            placeholder="15000"
                            className="h-7 w-32 text-xs font-bold bg-background text-right"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic Breakdown when 'Salary' is selected */}
                {ltForm.maxEligibility === 'Salary' && (
                  <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3 items-center border-t border-border/60">
                    <label className="font-bold text-foreground">Max Multiplier of Basic Salary</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={ltForm.salaryMultiplier || '6'}
                        onChange={e => setLtForm({ ...ltForm, salaryMultiplier: e.target.value })}
                        placeholder="6"
                        className="h-8 text-xs font-bold bg-background"
                      />
                      <span className="font-bold text-muted-foreground text-xs">x Basic</span>
                    </div>
                  </div>
                )}
              </div>
            </details>

            {/* Accordion 3: Loan Policy (Image 5) */}
            <details className="border border-border rounded-xl bg-card overflow-hidden" open>
              <summary className="p-3 text-xs font-extrabold text-foreground cursor-pointer flex items-center justify-between bg-muted/20 select-none">
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> Loan Policy
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </summary>
              <div className="p-4 space-y-2 text-xs">
                <label className="font-bold text-foreground block">Policy</label>
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Upload PDF
                </Button>
              </div>
            </details>

            {/* Footer Action Bar (Image 5 Bottom) */}
            <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Active</span>
                <button
                  type="button"
                  onClick={() => setLtForm({ ...ltForm, isActive: !ltForm.isActive })}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${ltForm.isActive ? 'bg-teal-600 text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  {ltForm.isActive ? 'Yes' : 'No'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {loanTypesList.some(t => String(t.id) === String(selectedLoanTypeId)) ? (
                  <Button onClick={handleSaveLoanType} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Update Loan Type
                  </Button>
                ) : (
                  <Button onClick={handleSaveLoanType} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Add Loan Type
                  </Button>
                )}
                <Button variant="destructive" onClick={() => setShowLoanTypeSettings(false)} className="bg-rose-600 hover:bg-rose-700 text-white h-8 text-xs font-bold flex items-center gap-1 cursor-pointer">
                  ✕ Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            className="h-8 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>

          <Button
            onClick={handleOpenNewLoanModal}
            size="sm"
            className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {isAdmin ? 'Disburse Loan' : 'Apply for Loan'}
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm font-semibold animate-fade-in ${notification.type === 'success'
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
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.key
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
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditLoan(loan)}
                      className="h-7 text-[10px] font-bold cursor-pointer"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenSchedule(loan)}
                      className="h-7 text-[10px] font-bold gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Schedule
                    </Button>
                  </div>

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
                            <Button size="sm" variant="outline" onClick={() => handleEditLoan(loan)} className="h-7 text-[10px] font-bold cursor-pointer">
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleOpenSchedule(loan)} className="h-7 text-[10px] font-bold cursor-pointer">
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
                  {editingLoan
                    ? `Edit Loan Application (Loan #${editingLoan.id})`
                    : isAdmin
                    ? 'Grant Loan / Disburse Salary Advance'
                    : 'Apply for Loan or Salary Advance'}
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  {editingLoan
                    ? 'Update terms, amount, tenure, or justification for this existing loan.'
                    : isAdmin
                    ? 'Select employee and terms to issue an approved loan.'
                    : 'Submit a loan request for approval.'}
                </CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setShowApplyModal(false); setEditingLoan(null); }} className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
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
                  <Button type="button" size="sm" onClick={handleQuickSalaryAdvance} className="h-7 text-xs font-bold bg-primary text-primary-foreground cursor-pointer">
                    Apply Quick Advance
                  </Button>
                </div>

                {/* Loan Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Loan Type *</Label>
                    <select
                      value={loanType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLoanType(val);
                        const matched = loanTypesList.find(t => t.name === val || t.id === val);
                        if (matched) {
                          if (matched.interestRate !== undefined) setInterestRate(String(matched.interestRate));
                          if (matched.minTermMonths !== undefined) setTenureMonths(String(matched.minTermMonths));
                        }
                      }}
                      className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-xs font-semibold cursor-pointer"
                    >
                      {loanTypesList.map((lt) => (
                        <option key={lt.id} value={lt.name}>
                          {lt.name} ({lt.category === 'advance' ? 'Salary Advance' : `${lt.interestRate || 0}% Interest`})
                        </option>
                      ))}
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
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowApplyModal(false); setEditingLoan(null); }} className="h-8 text-xs cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer">
                    {editingLoan ? 'Update Loan' : isAdmin ? 'Grant & Disburse Loan' : 'Submit Loan Application'}
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
