import React, { useState, useEffect } from 'react';
import { usePayslip } from '../hooks/index';
import { PayslipSummary, EarningsDeductionsBreakdown } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, UserCheck, Calendar, FileText, Download, Printer, RefreshCcw, Sparkles, Bell, CheckCircle, XCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getPayslipRequests, updatePayslipRequestStatus, PayslipRequest } from '../utils/payslipRequestQueue';
import { PayslipRequestForm } from '../components/PayslipRequestForm';
import { PayslipRequesterPanel, PayslipAdminApprovalPanel } from '../components/PayslipRequestSystem';
import apiClient from '@/lib/api';

export const PayslipViewer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.some((r: string) =>
    ['super_admin', 'organization_admin', 'admin'].includes(r.toLowerCase())
  ) ?? false;

  const { payslips, isLoading, getPayslipDetails } = usePayslip();
  const [details, setDetails] = useState<any>(null);

  // Filter states: dept, status, search, month
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [empStatus, setEmpStatus] = useState<string>('all');
  const [empNameSearch, setEmpNameSearch] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07');
  const [viewMode, setViewMode] = useState<'my' | 'admin'>(isAdmin ? 'admin' : 'my');
  const [activeRoleScope, setActiveRoleScope] = useState<'admin' | 'hr' | 'manager' | 'team_lead' | 'employee'>('admin');
  const [generatedNotification, setGeneratedNotification] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('44');
  const [generatedPayslip, setGeneratedPayslip] = useState<any>(null);
  // ── Scope localStorage key to this user so payslips never leak across users ──
  const currentUserId = user?.id || (user as any)?.employeeId || 'unknown';
  const orgId = user?.organizationId || user?.id || 'default';
  const localStorageKey = `generated_payslips_org_${orgId}`;
  const visibilityKey = `payslip_visibility_org_${orgId}`;

  const [generatedList, setGeneratedList] = useState<any[]>(() => {
    try {
      const all = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
      let merged = Array.isArray(all) ? [...all] : [];

      // Check legacy user-scoped key if available and merge
      const legacyKey = `generated_payslips_${currentUserId}`;
      const legacy = JSON.parse(localStorage.getItem(legacyKey) || '[]');
      if (Array.isArray(legacy) && legacy.length > 0) {
        for (const item of legacy) {
          const itemEmpId = String(item.employee_id || item.employeeId || '');
          const itemMonth = String(item.month || item.payslip_month || '');
          if (!merged.some(m => String(m.employee_id || m.employeeId) === itemEmpId && String(m.month || m.payslip_month) === itemMonth)) {
            merged.push(item);
          }
        }
        localStorage.setItem(localStorageKey, JSON.stringify(merged));
      }
      return merged;
    } catch {
      return [];
    }
  });

  const [hiddenPayslipIds, setHiddenPayslipIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(visibilityKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const togglePayslipVisibility = (id: string) => {
    setHiddenPayslipIds(prev => {
      const isCurrentlyHidden = !!prev[id];
      const updated = { ...prev, [id]: !isCurrentlyHidden };
      try {
        localStorage.setItem(visibilityKey, JSON.stringify(updated));
      } catch {}
      setGeneratedNotification(!isCurrentlyHidden ? '🙈 Payslip hidden from employee portal.' : '👁️ Payslip set to SHOWN (visible to employee).');
      setTimeout(() => setGeneratedNotification(null), 3000);
      return updated;
    });
  };



  const MONTHS_LABEL: Record<string, string> = {
    '2026-07': 'July 2026', '2026-06': 'June 2026', '2026-05': 'May 2026',
    '2026-04': 'April 2026', '2026-03': 'March 2026', '2026-02': 'February 2026', '2026-01': 'January 2026',
  };

  const DEMO_ORGANIZATION_ROSTER = [
    { id: 38, name: 'got sharma', code: 'EMP101', department: 'Engineering', basic: 45000, gross: 75000, status: 'active' },
    { id: 39, name: 'mot sharma', code: 'EMP202', department: 'Engineering', basic: 60000, gross: 100000, status: 'active' },
    { id: 40, name: 'tee gfdsa', code: 'EMP206', department: 'Sales & Marketing', basic: 41000, gross: 68333, status: 'active' },
    { id: 41, name: 'teeam lead', code: 'EMP2002', department: 'Engineering', basic: 48000, gross: 80000, status: 'active' },
    { id: 42, name: 'hrr fccc', code: 'EMP1001', department: 'Human Resources', basic: 31000, gross: 51667, status: 'active' },
    { id: 43, name: 'NN Employee', code: 'EMP702', department: 'Finance', basic: 27000, gross: 45000, status: 'probation' },
    { id: 44, name: 'PP Manager', code: '432', department: 'Operations & IT', basic: 75000, gross: 125000, status: 'active' },
    { id: 45, name: 'Hrrr Employee', code: 'EMP7576', department: 'Human Resources', basic: 29000, gross: 48333, status: 'active' },
  ];

  // Live Organization Employees List for Dropdown Select
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [dbDepartments, setDbDepartments] = useState<string[]>([]);

  // ── One-time cleanup: remove old unsecured global key on mount ──────────
  useEffect(() => {
    if (localStorage.getItem('generated_payslips') !== null) {
      localStorage.removeItem('generated_payslips');
    }
  }, []);

  const orgKey = `salary_structures_${user?.organizationId || user?.id || user?.email || 'unknown'}`;

  useEffect(() => {
    // 1. Fetch live organization employees, salary structures, and mappings
    Promise.all([
      apiClient.get('/employees').catch(() => ({ data: [] })),
      apiClient.get('/payroll/structures').catch(() => ({ data: [] })),
      apiClient.get('/payroll/structures/mappings').catch(() => ({ data: [] }))
    ]).then(([empRes, structRes, mappingRes]: any[]) => {
      const list = empRes.data?.data || empRes.data || [];
      const structures = structRes.data?.data || structRes.data || [];
      const mappings = mappingRes.data?.data || mappingRes.data || [];

      // Read locally saved structures for this org
      let localStructures: any[] = [];
      try {
        const saved = localStorage.getItem(orgKey);
        if (saved) localStructures = JSON.parse(saved);
      } catch {}

      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((e: any) => {
          const codeStr = String(e.employee_code || e.code || '');
          const nameStr = String(e.name || e.full_name || `${e.first_name || ''} ${e.last_name || ''}`).toLowerCase();

          // Lookup assigned salary structure for this employee
          const foundStruct =
            structures.find((s: any) => String(s.employee_id || s.empId || s.employeeId) === String(e.id) || (s.employee_code && s.employee_code === codeStr)) ||
            localStructures.find((s: any) => String(s.empId || s.employee_id) === String(e.id) || (s.empCode && s.empCode === codeStr)) ||
            mappings.find((m: any) => String(m.empId || m.employee_id) === String(e.id) || (m.employee_code && m.employee_code === codeStr));

          let gross: number | null = null;
          let basic: number | null = null;

          if (foundStruct) {
            gross = Number(
              foundStruct.grossMonthly ??
              foundStruct.gross_monthly ??
              foundStruct.grossSalary ??
              foundStruct.gross ??
              (foundStruct.annualCtc ? Math.round(foundStruct.annualCtc / 12) : null)
            );
            basic = Number(
              foundStruct.basicMonthly ??
              foundStruct.basic_monthly ??
              foundStruct.baseSalary ??
              foundStruct.basic ??
              (gross ? Math.round(gross * 0.50) : null)
            );
          }

          if (gross === null || isNaN(gross)) {
            gross = Number(
              e.gross_salary ??
              e.gross ??
              e.grossMonthly ??
              (e.annual_ctc ? Math.round(e.annual_ctc / 12) : null) ??
              0
            );
          }

          if (basic === null || isNaN(basic)) {
            basic = Number(
              e.basic_salary ??
              e.basic ??
              e.basicMonthly ??
              (gross ? Math.round(gross * 0.50) : 0)
            );
          }

          // Fallbacks for demo records or missing values
          if (!gross || gross === 0) {
            if (nameStr.includes('got') || codeStr.includes('101') || e.id === 38) { gross = 75000; basic = 45000; }
            else if (nameStr.includes('mot') || codeStr.includes('202') || e.id === 39) { gross = 100000; basic = 60000; }
            else if (nameStr.includes('pp') || nameStr.includes('manager') || codeStr.includes('432') || e.id === 44) { gross = 125000; basic = 75000; }
            else if (nameStr.includes('teeam') || codeStr.includes('2002') || e.id === 41) { gross = 80000; basic = 48000; }
            else if (nameStr.includes('hrr') || codeStr.includes('1001') || e.id === 42) { gross = 51667; basic = 31000; }
            else if (e.ctc) { gross = Math.round(Number(e.ctc) / 12); basic = Math.round(gross * 0.50); }
            else { gross = 10000; basic = 5000; }
          }

          return {
            id: e.id,
            name: e.name || e.full_name || e.fullName || `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.email || `Employee #${e.id}`,
            code: e.employee_code || e.code || `EMP-${e.id}`,
            department: e.department_name || e.department?.name || (typeof e.department === 'string' ? e.department : '') || 'General',
            basic,
            gross,
            status: e.status || 'active'
          };
        });

        setEmployeeOptions(formatted);
      } else {
        if (user?.email === 'kot@gmail.com') {
          setEmployeeOptions(DEMO_ORGANIZATION_ROSTER);
        } else {
          setEmployeeOptions([]);
        }
      }
    }).catch(() => {
      if (user?.email === 'kot@gmail.com') {
        setEmployeeOptions(DEMO_ORGANIZATION_ROSTER);
      } else {
        setEmployeeOptions([]);
      }
    });

    // 2. Fetch live departments from server API
    apiClient.get('/settings/departments').then((res: any) => {
      const depts = res.data?.data || res.data || [];
      if (Array.isArray(depts) && depts.length > 0) {
        const names = depts.map((d: any) => d.name || d.department_name).filter(Boolean);
        setDbDepartments(names);
      }
    }).catch(() => {});
  }, [user, orgKey]);

  // Compute final unique real departments dynamically
  const uniqueDepartments = Array.from(
    new Set([
      ...dbDepartments,
      ...employeeOptions.map(e => e.department).filter(Boolean)
    ])
  ).sort();

  const handleViewPayslip = async (payslipId: number) => {
    const payslipDetails = await getPayslipDetails(payslipId);
    setDetails(payslipDetails);
  };

  const handleGenerateMyPayslip = () => {
    const activeUserId = String(user?.id || (user as any)?.employeeId || '');
    handleGenerateForEmployee(activeUserId);
  };

  const handleGenerateForEmployee = async (overrideEmpId?: string) => {
    const empIdToUse = overrideEmpId || selectedEmpId || String(employeeOptions[0]?.id);
    // Find selected employee dynamically from employee roster
    const emp = employeeOptions.find(e => String(e.id) === String(empIdToUse)) || employeeOptions[0];
    if (!emp) {
      alert('No employee selected or available.');
      return;
    }

    const psMonth = `${selectedMonth}-01`;
    const monthLabel = new Date(psMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // ── 1. Fetch attendance for this employee from existing read-only API ──────
    const workingDaysInMonth = 26; // Standard working days (exclude Sundays)
    let daysPresent = workingDaysInMonth;
    let daysAbsent = 0;
    let halfDays = 0;
    let lateArrivals = 0;

    try {
      const attRes = await apiClient.get('/attendance/history', {
        params: { employeeId: emp.id, month: selectedMonth, pageSize: 100 }
      });
      const records: any[] = attRes.data?.data || attRes.data || [];
      if (records.length > 0) {
        // Count distinct working days with attendance records
        const presentDays = records.filter((r: any) =>
          r.status === 'present' || r.status === 'PRESENT' || r.check_in_time
        ).length;
        const halfDayRecs = records.filter((r: any) =>
          r.status === 'half_day' || r.status === 'HALF_DAY'
        ).length;
        const lateRecs = records.filter((r: any) =>
          r.is_late === true || r.status === 'late' || r.status === 'LATE'
        ).length;
        if (presentDays > 0) {
          daysPresent = presentDays + (halfDayRecs * 0.5);
          daysAbsent = Math.max(0, workingDaysInMonth - daysPresent - (halfDayRecs * 0.5));
          halfDays = halfDayRecs;
          lateArrivals = lateRecs;
        }
      }
    } catch {
      // If attendance fetch fails, assume full attendance (no LOP)
      daysPresent = workingDaysInMonth;
      daysAbsent = 0;
    }

    // ── 2. Attendance & Salary Calculation Engine ────────────────────────────────
    const monthlyGross = Number(emp.gross ?? (emp.basic ? Math.round(emp.basic * 2) : 10000));
    const fullBasic = Number(emp.basic ?? Math.round(monthlyGross * 0.50));
    const perDayGross = Math.round(monthlyGross / workingDaysInMonth);
    const perDayBasic = Math.round(fullBasic / workingDaysInMonth);

    // Loss of Pay (LOP) = per-day rate × days absent
    const lop = Math.round(perDayGross * daysAbsent);

    // Earned Basic & Earned Gross based on days present
    const effectiveBasic = Math.round((fullBasic / workingDaysInMonth) * daysPresent);
    const hra = Math.round(effectiveBasic * 0.40);
    const conveyance = 1600;
    const medicalAllowance = 1250;
    const gross = Math.max(0, Math.round((monthlyGross / workingDaysInMonth) * daysPresent));
    const special = Math.max(0, gross - effectiveBasic - hra - conveyance - medicalAllowance);

    // ── 3. Statutory Deductions ───────────────────────────────────────────────
    const pf = Math.round(Math.min(effectiveBasic, 15000) * 0.12); // PF capped at ₹15,000 basic
    const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;   // ESI only if gross ≤ ₹21,000
    const professionalTax = gross > 15000 ? 200 : 150;              // State-wise PT slab
    const healthInsurance = 500;                                     // Company health insurance premium
    const tds = gross > 50000 ? Math.round(gross * 0.05) : 0;      // TDS estimated 5% if above 50K

    const totalDed = pf + esi + professionalTax + healthInsurance + tds;
    const netActual = gross - totalDed;

    const psNum = `PS-${selectedMonth.replace('-', '')}-${emp.id}`;

    setGeneratedPayslip({
      emp,
      attendance: { workingDaysInMonth, daysPresent, daysAbsent, halfDays, lateArrivals, perDaySalary: perDayGross, lop },
      payslip: {
        payslip_number: psNum,
        payslip_month: psMonth,
        gross_salary: gross,
        total_deductions: pf + esi + professionalTax + healthInsurance + tds,
        net_salary: netActual,
        basic_salary: effectiveBasic
      },
      earnings: [
        { name: 'Basic Pay', amount: effectiveBasic },
        { name: 'House Rent Allowance (HRA) — 40%', amount: hra },
        { name: 'Special Allowance — 20%', amount: special },
        { name: 'Conveyance Allowance', amount: conveyance },
        { name: 'Medical Allowance', amount: medicalAllowance },
        ...(lop > 0 ? [{ name: `LOP Deduction (${daysAbsent} days absent)`, amount: -lop }] : []),
      ],
      deductions: [
        { name: `Provident Fund — 12% of Basic (max ₹15,000)`, amount: pf },
        { name: `ESI — 0.75%${gross > 21000 ? ' (N/A — Gross > ₹21,000)' : ''}`, amount: esi },
        { name: 'Professional Tax', amount: professionalTax },
        { name: 'Health Insurance Premium', amount: healthInsurance },
        ...(tds > 0 ? [{ name: 'Income Tax / TDS (estimated)', amount: tds }] : []),
      ]
    });

    const newSummaryCard = {
      id: Number(emp.id) * 1000 + Date.now(),
      employee_id: emp.id,
      payslip_number: psNum,
      month: psMonth,
      empName: emp.name,
      empCode: emp.code,
      basic: effectiveBasic,
      gross: gross,
      deductions: pf + esi + professionalTax + healthInsurance + tds,
      net: netActual
    };

    setGeneratedList(prev => {
      const filtered = prev.filter(
        item => !(String(item.employee_id || item.employeeId) === String(emp.id) && String(item.month || item.payslip_month) === String(psMonth))
      );
      const updated = [newSummaryCard, ...filtered];
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    apiClient.post('/payroll/payslips', {
      employeeId: emp.id,
      payslipNumber: psNum,
      month: psMonth,
      basicSalary: effectiveBasic,
      grossSalary: gross,
      totalDeductions: pf + esi + professionalTax + healthInsurance + tds,
      netSalary: netActual
    }).catch(() => {});

    setDetails(null);
    setGeneratedNotification(`✅ Payslip generated for ${emp.name} (${emp.code}) — ${monthLabel} | Days Present: ${daysPresent}/${workingDaysInMonth}${lop > 0 ? ` | LOP: ₹${lop.toLocaleString('en-IN')}` : ''}`);
    setTimeout(() => setGeneratedNotification(null), 7000);
  };

  const handleDownloadPDF = (payslip: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Payslip - ${payslip.payslip_number}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #fff; }
            .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; color: #1e3a8a; letter-spacing: 1px; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
            .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .label { color: #64748b; font-size: 12px; text-transform: uppercase; tracking: 1px; }
            .val { font-weight: bold; font-size: 15px; color: #0f172a; margin-top: 2px; }
            .net-pay-box { background: #eff6ff; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px; border: 2px solid #bfdbfe; }
            .net-pay-amount { font-size: 32px; font-weight: 800; color: #1d4ed8; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title font-bold">SALARY PAYSLIP STATEMENT</div>
            <div class="subtitle">Payslip Ref: ${payslip.payslip_number}</div>
          </div>
          
          <div class="meta-grid">
            <div>
              <div class="label">Employee Reference</div>
              <div class="val">#${payslip.employee_id || 'EMP-1024'}</div>
              <div style="margin-top: 15px;">
                <div class="label font-semibold">Statement Period</div>
                <div class="val">${new Date(payslip.payslip_month || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="label">Gross Salary</div>
              <div class="val">₹${Number(payslip.gross_salary || payslip.basic_salary * 1.5 || 65000).toLocaleString('en-IN')}</div>
              <div style="margin-top: 15px;">
                <div class="label">Basic Salary</div>
                <div class="val">₹${Number(payslip.basic_salary || 45000).toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          <div class="net-pay-box">
            <div class="label" style="font-weight: bold; color: #1e40af;">Net Take-Home Monthly Salary</div>
            <div class="net-pay-amount">₹${Number(payslip.net_salary || 58500).toLocaleString('en-IN')}</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const loggedInEmpId = user?.employeeId || (user as any)?.employee_id || user?.id;

  // Filter payslips based on emp status, name, month, and role permissions
  const filteredPayslips = payslips.filter((p: any) => {
    // If regular employee or in "My Payslips" mode, restrict strictly to logged-in employee's ID
    if (!isAdmin || viewMode === 'my') {
      const pEmpId = p.employee_id || p.employeeId;
      if (pEmpId && loggedInEmpId && String(pEmpId) !== String(loggedInEmpId)) {
        return false;
      }
    }

    const matchesMonth = selectedMonth ? (p.payslip_month || '').startsWith(selectedMonth) : true;
    const matchesName = empNameSearch && isAdmin
      ? String(p.employee_id || '').includes(empNameSearch) || String(p.payslip_number || '').toLowerCase().includes(empNameSearch.toLowerCase())
      : true;
    return matchesMonth && matchesName;
  });

  const selectClassName = "flex h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer shadow-xs";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {isAdmin ? 'Payslip Management' : 'My Payslips & Monthly Statements'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {isAdmin ? 'Generate individual employee payslips using department and month filters or manage approval requests.' : 'View and download your official monthly salary payslips.'}
          </p>
        </div>
      </div>

      {/* Notification */}
      {generatedNotification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between">
          <span className="font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            {generatedNotification}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setGeneratedNotification(null)}>Dismiss</Button>
        </div>
      )}

      {/* ── Tab Bar (non-admin only) ──────────────────────────────────── */}
      {/* ── Sub-Tabs Navigation Bar ──────────────────────────────────── */}

      <Card className="border-2 border-indigo-200 dark:border-indigo-800 shadow-md bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 dark:from-slate-900 dark:to-slate-900">
          <CardHeader className="pb-3 border-b border-indigo-100 dark:border-slate-800">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-950 dark:text-indigo-100">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  {isAdmin ? 'Generate Particular Employee Payslip (Filter by Dept, Employee Name & Month)' : 'Select Statement Month'}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {isAdmin ? 'Filter employees by department and status, pick a month, and generate official employee payslips instantly.' : 'Select month to view and download your payslips.'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-indigo-300 text-indigo-800 dark:text-indigo-300">
                {filteredPayslips.length} Payslips Available
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-2'} gap-3`}>

              {isAdmin && (
                <>
                  {/* 1. Department Filter */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      Filter Department
                    </Label>
                    <select
                      value={selectedDept}
                      onChange={(e) => { setSelectedDept(e.target.value); setSelectedEmpId(''); }}
                      className={selectClassName}
                    >
                      <option value="all">All Departments</option>
                      {uniqueDepartments.map((dept, idx) => (
                        <option key={idx} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Employee Status */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                      Emp Status
                    </Label>
                    <select
                      value={empStatus}
                      onChange={(e) => setEmpStatus(e.target.value)}
                      className={selectClassName}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="probation">Probation</option>
                      <option value="notice">Notice Period</option>
                      <option value="onleave">On Leave</option>
                    </select>
                  </div>

                  {/* 3. Particular Employee Dropdown */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                      <Search className="w-3.5 h-3.5 text-indigo-600" />
                      Select Particular Employee *
                    </Label>
                    <select
                      value={selectedEmpId}
                      onChange={(e) => { setSelectedEmpId(e.target.value); setEmpNameSearch(e.target.value); }}
                      className={`${selectClassName} border-2 border-indigo-500 font-bold bg-white dark:bg-slate-800 text-indigo-950 dark:text-white`}
                    >
                      <option value="">— Select Particular Employee —</option>
                      {employeeOptions
                        .filter(emp => {
                          const matchesDept = selectedDept === 'all' || (emp.department && emp.department.toLowerCase().includes(selectedDept.toLowerCase()));
                          const matchesStatus = empStatus === 'all' || (emp.status && emp.status.toLowerCase() === empStatus.toLowerCase());
                          return matchesDept && matchesStatus;
                        })
                        .map((emp) => (
                          <option key={emp.id} value={String(emp.id)}>
                            {emp.name} ({emp.code}) — {emp.department}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              {/* 4. Select Month */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Salary Month *
                </Label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={selectClassName}
                >
                  <option value="2026-07">July 2026 (Current Month)</option>
                  <option value="2026-06">June 2026</option>
                  <option value="2026-05">May 2026</option>
                  <option value="2026-04">April 2026</option>
                  <option value="2026-03">March 2026</option>
                  <option value="2026-02">February 2026</option>
                  <option value="2026-01">January 2026</option>
                </select>
              </div>

              {isAdmin && (
                /* 5. Generate Button */
                <div className="space-y-1 flex flex-col justify-end">
                  <Button
                    onClick={() => handleGenerateForEmployee()}
                    className="h-10 text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 font-bold shadow-md"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    ⚡ Generate Employee Payslip
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      {/* Payslips Summary Cards Grid with Show/Hide Employee Visibility Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(() => {
          const userEmailClean = (user?.email || '').toLowerCase();
          const activeUserName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Employee';
          const activeUserNameClean = activeUserName.toLowerCase();
          const activeUserCodeClean = ((user as any)?.employeeCode || '').toLowerCase();

          const matchedEmpInRoster = employeeOptions.find((e: any) =>
            String(e.id) === String((user as any)?.employeeId) ||
            String(e.id) === String(user?.id) ||
            (userEmailClean && String(e.email || '').toLowerCase() === userEmailClean) ||
            (activeUserNameClean && e.name?.toLowerCase().includes(activeUserNameClean)) ||
            (activeUserCodeClean && String(e.code || '').toLowerCase() === activeUserCodeClean)
          );

          const activeUserId = matchedEmpInRoster?.id || (user as any)?.employeeId || user?.id || 1;
          const activeUserCode = matchedEmpInRoster?.code || (user as any)?.employeeCode || `EMP-${activeUserId}`;

          const activeUserGross = Number(
            matchedEmpInRoster?.gross ??
            (user as any)?.gross_salary ??
            (user as any)?.grossSalary ??
            (user as any)?.gross ??
            10000
          );
          const activeUserBasic = Number(
            matchedEmpInRoster?.basic ??
            (user as any)?.basic_salary ??
            (user as any)?.basicSalary ??
            (user as any)?.basic ??
            Math.round(activeUserGross * 0.50)
          );
          const activeUserDeductions = Math.round(Math.min(activeUserBasic, 15000) * 0.12) + (activeUserGross > 15000 ? 200 : 150) + 500 + Math.round(activeUserGross * 0.05);
          const activeUserNet = activeUserGross - activeUserDeductions;

          const isDemoAdmin = user?.email === 'kot@gmail.com';

          const baseList = filteredPayslips.filter((p: any) => {
            if (isAdmin) return true;
            const pEmpId = String(p.employee_id || p.employeeId || '');
            const pEmail = String(p.email || '').toLowerCase();
            return pEmpId === String(activeUserId) || pEmpId === String(user?.id) || (userEmailClean && pEmail === userEmailClean);
          });

          // ── Filter generatedList to only show payslips belonging to this user or organization
          const scopedGeneratedList = isAdmin
            ? generatedList
            : generatedList.filter((item: any) => {
                const itemEmpId = String(item.employee_id || item.employeeId || '');
                const itemCode = String(item.empCode || item.employee_code || '').toLowerCase();
                const itemName = String(item.empName || item.employee_name || '').toLowerCase();
                const itemEmail = String(item.email || '').toLowerCase();

                return itemEmpId === String(activeUserId) ||
                  itemEmpId === String(user?.id) ||
                  (userEmailClean && itemEmail === userEmailClean) ||
                  (activeUserCodeClean && itemCode.includes(activeUserCodeClean)) ||
                  (activeUserNameClean && itemName.includes(activeUserNameClean));
              });

          const combinedList = [...scopedGeneratedList, ...baseList];

          // ── Strictly filter by selectedMonth so only payslips of that month are shown
          const monthFilteredList = combinedList.filter((item: any) => {
            const itemMonth = String(item.month || item.payslip_month || '');
            return !selectedMonth || itemMonth.startsWith(selectedMonth) || itemMonth.includes(selectedMonth);
          });

          // Deduplicate by (employee_id + month) so double cards NEVER appear
          const deduplicatedList: any[] = [];
          const seenKeys = new Set<string>();

          for (const item of monthFilteredList) {
            const itemEmpId = String(item.employee_id || item.employeeId || item.id || '');
            const itemMonth = String(item.month || item.payslip_month || selectedMonth);
            const key = `${itemEmpId}_${itemMonth}`;

            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              deduplicatedList.push(item);
            }
          }

          const selectedEmpObj = employeeOptions.find(e => String(e.id) === String(selectedEmpId));
          const targetName = (selectedEmpObj?.name || '').toLowerCase();
          const targetCode = (selectedEmpObj?.code || '').toLowerCase();

          const displayList = (selectedEmpId && isAdmin)
            ? deduplicatedList.filter((item: any) => {
                const itemEmpId = String(item.employee_id || item.employeeId || '');
                const itemCode = String(item.empCode || item.employee_code || item.payslip_number || '').toLowerCase();
                const itemName = String(item.empName || item.employee_name || '').toLowerCase();

                if (itemEmpId && itemEmpId === String(selectedEmpId)) return true;
                if (targetCode && itemCode.includes(targetCode)) return true;
                if (targetName && itemName.includes(targetName)) return true;
                return false;
              })
            : deduplicatedList;

          const finalCards = displayList.filter((item: any) => {
            if (isAdmin) return true;
            const itemEmpId = String(item.employee_id || item.employeeId || item.id || '');
            const itemMonth = String(item.month || item.payslip_month || selectedMonth);
            const itemKey = String(item.id);
            const comboKey = `${itemEmpId}_${itemMonth}`;

            // Hidden if admin specifically hid it via toggle
            const isHidden = hiddenPayslipIds[itemKey] === true || hiddenPayslipIds[comboKey] === true;
            return !isHidden;
          });

          if (finalCards.length === 0) {
            const monthLabel = MONTHS_LABEL[selectedMonth] || selectedMonth;
            return (
              <div className="col-span-full p-8 text-center bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3 animate-fade-in">
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="font-extrabold text-slate-800 dark:text-slate-200 text-base">
                  No Payslips Generated for {monthLabel}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {isAdmin
                    ? `No payslips have been generated for ${monthLabel} yet. Select an employee above and click '⚡ Generate Employee Payslip' to create one.`
                    : `Your payslip for ${monthLabel} has not been published by HR/Admin yet. Please check back after monthly payroll processing.`}
                </p>
              </div>
            );
          }

          return finalCards
            .map((sample: any) => {
              const empNameStr = sample.empName || sample.employee_name || '';
              const empCodeStr = sample.empCode || sample.employee_code || '';
              const empIdStr = String(sample.employee_id || sample.employeeId || sample.id || '');
              const itemMonth = String(sample.month || sample.payslip_month || selectedMonth);
              const itemKey = String(sample.id);
              const comboKey = `${empIdStr}_${itemMonth}`;

              const isHidden = hiddenPayslipIds[itemKey] === true || hiddenPayslipIds[comboKey] === true;

              const handleToggleVisibility = () => {
                togglePayslipVisibility(itemKey);
                togglePayslipVisibility(comboKey);
              };

              const matchedProfile = employeeOptions.find((e: any) =>
                String(e.id) === empIdStr ||
                (empCodeStr && String(e.code).toLowerCase() === empCodeStr.toLowerCase()) ||
                (empNameStr && String(e.name).toLowerCase().includes(empNameStr.toLowerCase()))
              );

              const cardGross = Number(matchedProfile?.gross ?? sample.gross ?? sample.gross_salary ?? 10000);
              const cardBasic = Number(matchedProfile?.basic ?? sample.basic ?? sample.basic_salary ?? Math.round(cardGross * 0.50));
              const cardDeductions = Math.round(Math.min(cardBasic, 15000) * 0.12) + (cardGross > 15000 ? 200 : 150) + 500 + Math.round(cardGross * 0.05);
              const cardNet = cardGross - cardDeductions;
              const displayName = matchedProfile?.name || empNameStr || 'Employee';
              const displayCode = matchedProfile?.code || empCodeStr || `EMP-${sample.id}`;

              return (
                <div key={sample.id} className="space-y-1.5 border rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                  {isAdmin && (
                    <div className="flex items-center justify-between px-2 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <label htmlFor={`chk-${sample.id}`} className="flex items-center gap-2 cursor-pointer select-none text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        <input
                          id={`chk-${sample.id}`}
                          type="checkbox"
                          checked={!isHidden}
                          onChange={handleToggleVisibility}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                        <span>Show Payslip to User</span>
                      </label>
                      <Badge className={!isHidden ? "bg-emerald-600 text-white font-extrabold text-[10px] px-2" : "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] px-2"}>
                        {!isHidden ? "👁️ Visible to User" : "🙈 Hidden from User"}
                      </Badge>
                    </div>
                  )}
                  <PayslipSummary
                    isAdmin={isAdmin}
                    payslipNumber={sample.payslip_number || sample.payslipNumber || `PS-${sample.id}`}
                    month={new Date(sample.month || sample.payslip_month || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    empName={displayName}
                    empCode={displayCode}
                    basicSalary={cardBasic}
                    grossSalary={cardGross}
                    totalDeductions={cardDeductions}
                    netSalary={cardNet}
                    onView={() => setDetails({
                      payslip: { payslip_number: sample.payslip_number, payslip_month: sample.month, gross_salary: cardGross, total_deductions: cardDeductions, net_salary: cardNet, basic_salary: cardBasic },
                      earnings: [
                        { name: 'Basic Salary', amount: cardBasic },
                        { name: 'House Rent Allowance (HRA 40%)', amount: Math.round(cardBasic * 0.40) },
                        { name: 'Special Allowance', amount: Math.max(0, cardGross - cardBasic - Math.round(cardBasic * 0.40) - 2850) },
                        { name: 'Conveyance & Medical', amount: 2850 }
                      ],
                      deductions: [
                        { name: 'Provident Fund (PF 12%)', amount: Math.round(Math.min(cardBasic, 15000) * 0.12) },
                        { name: 'Professional Tax (PT)', amount: cardGross > 15000 ? 200 : 150 },
                        { name: 'Health Insurance', amount: 500 },
                        { name: 'TDS Tax Withholding', amount: Math.round(cardGross * 0.05) }
                      ]
                    })}
                    onDownload={() => handleDownloadPDF({ payslip_number: sample.payslip_number, payslip_month: sample.month, gross_salary: cardGross, net_salary: cardNet, basic_salary: cardBasic })}
                  />
                </div>
              );
            });
        })()}
      </div>
      {generatedPayslip && (
        <Card className="border-2 border-indigo-300 dark:border-indigo-800 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-indigo-950 dark:text-indigo-100">
                📄 Payslip: {generatedPayslip.emp.name} ({generatedPayslip.emp.code}) — {new Date(generatedPayslip.payslip.payslip_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Ref: {generatedPayslip.payslip.payslip_number} &bull; Full earnings &amp; statutory deductions breakdown
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(generatedPayslip.payslip)} className="flex items-center gap-2 font-bold">
                <Printer className="w-4 h-4" /> Print / Save PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGeneratedPayslip(null)} className="text-slate-500">✕ Close</Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* ── Attendance Summary ────────────────────────────────── */}
            {generatedPayslip.attendance && (
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  📅 Attendance Summary — Per-Day Salary: ₹{generatedPayslip.attendance.perDaySalary.toLocaleString('en-IN')}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border">
                    <div className="text-xs text-slate-500 font-medium">Working Days</div>
                    <div className="text-xl font-extrabold text-slate-800 dark:text-white">{generatedPayslip.attendance.workingDaysInMonth}</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200">
                    <div className="text-xs text-emerald-600 font-medium">Days Present</div>
                    <div className="text-xl font-extrabold text-emerald-700">{generatedPayslip.attendance.daysPresent}</div>
                  </div>
                  <div className={`rounded-lg p-3 border ${generatedPayslip.attendance.daysAbsent > 0 ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200' : 'bg-white dark:bg-slate-800'}`}>
                    <div className={`text-xs font-medium ${generatedPayslip.attendance.daysAbsent > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Days Absent</div>
                    <div className={`text-xl font-extrabold ${generatedPayslip.attendance.daysAbsent > 0 ? 'text-rose-700' : 'text-slate-700'}`}>{generatedPayslip.attendance.daysAbsent}</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200">
                    <div className="text-xs text-amber-600 font-medium">Half Days</div>
                    <div className="text-xl font-extrabold text-amber-700">{generatedPayslip.attendance.halfDays}</div>
                  </div>
                  <div className={`rounded-lg p-3 border ${generatedPayslip.attendance.lop > 0 ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className={`text-xs font-medium ${generatedPayslip.attendance.lop > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>LOP Deduction</div>
                    <div className={`text-xl font-extrabold ${generatedPayslip.attendance.lop > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {generatedPayslip.attendance.lop > 0 ? `₹${generatedPayslip.attendance.lop.toLocaleString('en-IN')}` : 'None'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Salary Summary ────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Gross Earnings</div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">₹{generatedPayslip.payslip.gross_salary.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/30 rounded-xl p-4 border border-rose-200">
                <div className="text-xs text-rose-600 font-semibold uppercase tracking-wide">Total Deductions</div>
                <div className="text-2xl font-extrabold text-rose-700 mt-1">₹{generatedPayslip.payslip.total_deductions.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-200">
                <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Net Take-Home Pay</div>
                <div className="text-2xl font-extrabold text-emerald-700 mt-1">₹{generatedPayslip.payslip.net_salary.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <EarningsDeductionsBreakdown
              isAdmin={isAdmin}
              earnings={generatedPayslip.earnings}
              deductions={generatedPayslip.deductions}
              totalEarnings={Number(generatedPayslip.payslip.gross_salary)}
              totalDeductions={Number(generatedPayslip.payslip.total_deductions)}
              netSalary={Number(generatedPayslip.payslip.net_salary)}
            />
          </CardContent>
        </Card>
      )}

      {/* Payslip Detailed Breakup (from payslips list click) */}
      {details && !generatedPayslip && (
        <Card className="border border-indigo-200 dark:border-indigo-900 shadow-md">
          <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-indigo-950 dark:text-indigo-100">
                Detailed Statement: {details.payslip.payslip_number}
              </CardTitle>
              <CardDescription>
                Full earnings and statutory deductions breakdown
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(details.payslip)} className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </Button>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <EarningsDeductionsBreakdown
              isAdmin={isAdmin}
              earnings={details.earnings}
              deductions={details.deductions}
              totalEarnings={Number(details.payslip.gross_salary)}
              totalDeductions={Number(details.payslip.total_deductions)}
              netSalary={Number(details.payslip.net_salary)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayslipViewer;
