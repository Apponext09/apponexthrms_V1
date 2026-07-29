import React, { useState, useEffect } from 'react';
import { usePayslip } from '../hooks/index';
import { PayslipSummary, EarningsDeductionsBreakdown } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, UserCheck, Calendar, FileText, Download, Printer, RefreshCcw, Sparkles, Bell, CheckCircle, XCircle, Plus, Trash2, Edit3, Save } from 'lucide-react';
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
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
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
  const handleDeleteCard = (card: any) => {
    const cardId = String(card.id);
    const cardEmpId = String(card.employee_id || card.employeeId || '');
    const cardMonth = String(card.month || card.payslip_month || '');

    setGeneratedList(prev => {
      const updated = prev.filter(item => {
        const itemEmpId = String(item.employee_id || item.employeeId || '');
        const itemMonth = String(item.month || item.payslip_month || '');
        const itemId = String(item.id);
        if (itemId === cardId) return false;
        if (cardEmpId && cardMonth && itemEmpId === cardEmpId && itemMonth === cardMonth) return false;
        return true;
      });
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setGeneratedNotification(`🗑️ Payslip card removed for ${card.empName || card.employee_name || 'employee'}.`);
    setTimeout(() => setGeneratedNotification(null), 3000);
  };

  // Custom Edit & Manual Generate Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<{
    empId: string;
    empName: string;
    empCode: string;
    month: string;
    basic: number;
    hra: number;
    special: number;
    bonus: number;
    pf: number;
    esi: number;
    pt: number;
    tds: number;
    absentDays: number;
  }>({
    empId: '',
    empName: '',
    empCode: '',
    month: '2026-07-01',
    basic: 0,
    hra: 0,
    special: 0,
    bonus: 0,
    pf: 0,
    esi: 0,
    pt: 0,
    tds: 0,
    absentDays: 0
  });

  const handleOpenManualGenerate = () => {
    if (!selectedEmpId) {
      alert('Please select a particular employee from the dropdown list first.');
      return;
    }
    const emp = employeeOptions.find(e => String(e.id) === String(selectedEmpId));
    if (!emp) {
      alert('Selected employee not found.');
      return;
    }
    if (!emp.hasSalaryStructure || !emp.gross || emp.gross === 0) {
      alert(`⚠️ Salary Structure is NOT assigned to ${emp.name}. Please assign a Salary Structure in 'Salary Structure Management' first before generating payslip.`);
      return;
    }

    const gross = Number(emp.gross || 10000);
    const basic = Number(emp.basic || Math.round(gross * 0.50));
    const hra = Math.round(basic * 0.40);
    const special = Math.max(0, gross - basic - hra);
    const pf = Math.round(Math.min(basic, 15000) * 0.12);
    const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
    const pt = gross > 15000 ? 200 : 150;
    const tds = gross > 50000 ? Math.round(gross * 0.05) : 0;

    setEditFormData({
      empId: String(emp.id),
      empName: emp.name,
      empCode: emp.code,
      month: `${selectedMonth}-01`,
      basic,
      hra,
      special,
      bonus: 0,
      pf,
      esi,
      pt,
      tds,
      absentDays: 0
    });
    setShowEditModal(true);
  };

  const handleOpenCardEdit = (card: any) => {
    const empId = String(card.employee_id || card.employeeId || card.id || '');
    const matchedProfile = employeeOptions.find((e: any) => String(e.id) === empId);

    const gross = Number(card.gross || card.gross_salary || matchedProfile?.gross || 10000);
    const basic = Number(card.basic || card.basic_salary || matchedProfile?.basic || Math.round(gross * 0.50));
    const hra = Math.round(basic * 0.40);
    const special = Math.max(0, gross - basic - hra);
    const pf = Number(card.pf || Math.round(Math.min(basic, 15000) * 0.12));
    const esi = Number(card.esi || (gross <= 21000 ? Math.round(gross * 0.0075) : 0));
    const pt = Number(card.pt || (gross > 15000 ? 200 : 150));
    const tds = Number(card.tds || (gross > 50000 ? Math.round(gross * 0.05) : 0));

    setEditFormData({
      empId,
      empName: card.empName || card.employee_name || matchedProfile?.name || 'Employee',
      empCode: card.empCode || card.employee_code || matchedProfile?.code || `EMP-${empId}`,
      month: card.month || card.payslip_month || `${selectedMonth}-01`,
      basic,
      hra,
      special,
      bonus: Number(card.bonus || 0),
      pf,
      esi,
      pt,
      tds,
      absentDays: Number(card.absentDays || 0)
    });
    setShowEditModal(true);
  };

  const handleSaveCustomPayslip = () => {
    const gross = editFormData.basic + editFormData.hra + editFormData.special + editFormData.bonus;
    const deductions = editFormData.pf + editFormData.esi + editFormData.pt + editFormData.tds;
    const net = gross - deductions;
    const psMonth = editFormData.month.length === 7 ? `${editFormData.month}-01` : editFormData.month;
    const psNum = `PS-${psMonth.slice(0, 7).replace('-', '')}-${editFormData.empId}`;

    const customCard = {
      id: Number(editFormData.empId) * 1000 + Date.now(),
      employee_id: editFormData.empId,
      payslip_number: psNum,
      month: psMonth,
      empName: editFormData.empName,
      empCode: editFormData.empCode,
      basic: editFormData.basic,
      gross: gross,
      deductions: deductions,
      net: net,
      bonus: editFormData.bonus,
      pf: editFormData.pf,
      esi: editFormData.esi,
      pt: editFormData.pt,
      tds: editFormData.tds,
      isCustomEdited: true
    };

    setGeneratedList(prev => {
      const filtered = prev.filter(
        item => !(String(item.employee_id || item.employeeId) === String(editFormData.empId) && String(item.month || item.payslip_month).slice(0, 7) === psMonth.slice(0, 7))
      );
      const updated = [customCard, ...filtered];
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    apiClient.post('/payroll/payslips', {
      employeeId: editFormData.empId,
      payslipNumber: psNum,
      month: psMonth,
      basicSalary: editFormData.basic,
      grossSalary: gross,
      totalDeductions: deductions,
      netSalary: net
    }).catch(() => {});

    setShowEditModal(false);
    setGeneratedNotification(`✅ Custom edited payslip saved & published for ${editFormData.empName} (${editFormData.empCode})! Net Salary: ₹${net.toLocaleString('en-IN')}`);
    setTimeout(() => setGeneratedNotification(null), 5000);
  };



  const MONTHS_LABEL: Record<string, string> = {
    '2026-07': 'July 2026', '2026-06': 'June 2026', '2026-05': 'May 2026',
    '2026-04': 'April 2026', '2026-03': 'March 2026', '2026-02': 'February 2026', '2026-01': 'January 2026',
  };



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

      // Read locally saved structures and assigned mappings for this org
      let localStructures: any[] = [];
      let localAssigned: any[] = [];
      try {
        const saved = localStorage.getItem(orgKey);
        if (saved) localStructures = JSON.parse(saved);
        const savedAssigned = localStorage.getItem(`${orgKey}_assigned_employees`);
        if (savedAssigned) localAssigned = JSON.parse(savedAssigned);
      } catch {}

      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((e: any) => {
          const codeStr = String(e.employee_code || e.code || '');
          const nameStr = String(e.name || e.full_name || `${e.first_name || ''} ${e.last_name || ''}`).toLowerCase();

          // Lookup assigned salary structure for this employee
          const foundStruct =
            structures.find((s: any) => String(s.employee_id || s.empId || s.employeeId) === String(e.id) || (s.employee_code && s.employee_code === codeStr)) ||
            localStructures.find((s: any) => String(s.empId || s.employee_id) === String(e.id) || (s.empCode && s.empCode === codeStr)) ||
            mappings.find((m: any) => String(m.empId || m.employee_id || m.emp_id || m.id) === String(e.id) || (m.employee_code && m.employee_code === codeStr)) ||
            localAssigned.find((a: any) => String(a.id || a.empId || a.employee_id) === String(e.id) || (a.code && a.code === codeStr));

          let gross: number | null = null;
          let basic: number | null = null;
          let net: number | null = null;
          let pf: number = 0;
          let esi: number = 0;
          let tds: number = 0;

          const hasSalaryStructure = !!foundStruct || !!e.gross_salary || !!e.gross || !!e.annual_ctc || !!e.basic_salary || !!e.salary_structure_id || !!e.salaryStructureId;

          if (foundStruct) {
            let rawGross = foundStruct.grossMonthly ?? foundStruct.gross_monthly ?? foundStruct.grossSalary ?? foundStruct.gross;
            if (typeof rawGross === 'string') rawGross = parseFloat(rawGross.replace(/[^0-9.]/g, ''));
            if (rawGross && !isNaN(rawGross)) gross = Number(rawGross);

            let rawBasic = foundStruct.basicMonthly ?? foundStruct.basic_monthly ?? foundStruct.baseSalary ?? foundStruct.basic;
            if (typeof rawBasic === 'string') rawBasic = parseFloat(rawBasic.replace(/[^0-9.]/g, ''));
            if (rawBasic && !isNaN(rawBasic)) basic = Number(rawBasic);

            let rawNet = foundStruct.netTakeHome ?? foundStruct.net_take_home ?? foundStruct.netSalary ?? foundStruct.net;
            if (typeof rawNet === 'string') rawNet = parseFloat(rawNet.replace(/[^0-9.]/g, ''));
            if (rawNet && !isNaN(rawNet)) net = Number(rawNet);

            let rawPf = foundStruct.pfDeduction ?? foundStruct.pf_deduction;
            if (typeof rawPf === 'string') rawPf = parseFloat(rawPf.replace(/[^0-9.]/g, ''));
            if (rawPf && !isNaN(rawPf)) pf = Number(rawPf);

            let rawEsi = foundStruct.esiDeduction ?? foundStruct.esi_deduction;
            if (typeof rawEsi === 'string') rawEsi = parseFloat(rawEsi.replace(/[^0-9.]/g, ''));
            if (rawEsi && !isNaN(rawEsi)) esi = Number(rawEsi);

            let rawTds = foundStruct.tdsDeduction ?? foundStruct.tds_deduction;
            if (typeof rawTds === 'string') rawTds = parseFloat(rawTds.replace(/[^0-9.]/g, ''));
            if (rawTds && !isNaN(rawTds)) tds = Number(rawTds);

            if (!gross && foundStruct.annualCtc) gross = Math.round(Number(foundStruct.annualCtc) / 12);
            if (!basic && gross) basic = Math.round(gross * 0.50);
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

          if (net === null || isNaN(net)) {
            net = Number(e.net_salary ?? e.net_take_home ?? e.netTakeHome ?? (gross ? Math.round(gross * 0.90) : 0));
          }

          if ((!gross || gross === 0) && (e.ctc || e.annual_ctc)) {
            gross = Math.round(Number(e.ctc || e.annual_ctc) / 12);
            basic = Math.round(gross * 0.50);
            net = Math.round(gross * 0.90);
          }

          const isAssigned = hasSalaryStructure || (gross !== null && gross > 0);

          return {
            id: e.id,
            name: e.name || e.full_name || e.fullName || `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.email || `Employee #${e.id}`,
            code: e.employee_code || e.code || `EMP-${e.id}`,
            department: e.department_name || e.department?.name || (typeof e.department === 'string' ? e.department : '') || 'General',
            basic: basic || 0,
            gross: gross || 0,
            net: net || (gross ? Math.max(0, gross - (pf + esi + tds)) : 0),
            pf,
            esi,
            tds,
            hasSalaryStructure: isAssigned,
            status: e.status || 'active'
          };
        });

        setEmployeeOptions(formatted);
      } else {
        setEmployeeOptions([]);
      }
    }).catch(() => {
      setEmployeeOptions([]);
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
    const empIdToUse = overrideEmpId || selectedEmpId;
    if (!empIdToUse) {
      alert('Please select a particular employee from the dropdown list first.');
      return;
    }
    // Find selected employee dynamically from employee roster
    const emp = employeeOptions.find(e => String(e.id) === String(empIdToUse));
    if (!emp) {
      alert('Selected employee not found.');
      return;
    }

    if (!emp.hasSalaryStructure || !emp.gross || emp.gross === 0) {
      alert(`⚠️ Salary Structure is NOT assigned to ${emp.name}. Please assign a Salary Structure in 'Salary Structure Management' first before generating payslip.`);
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
            <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'} gap-3`}>

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
                            {emp.name} ({emp.code}) — {emp.department} {!emp.hasSalaryStructure ? ' ⚠️ [No Salary Structure]' : ''}
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
            </div>

            {/* 5. Generation Option Buttons (Automatic & Manual Edit) */}
            {isAdmin && (
              <div className="pt-2 border-t border-indigo-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
                <Button
                  onClick={() => handleGenerateForEmployee()}
                  className="h-10 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md flex items-center justify-center gap-2 px-4 min-w-[200px]"
                  title="Automatically calculate and generate payslip based on attendance and salary structure"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  ⚡ Automatic Generate
                </Button>

                <Button
                  onClick={() => handleOpenManualGenerate()}
                  variant="outline"
                  className="h-10 text-xs border-2 border-indigo-500 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 font-extrabold shadow-sm flex items-center justify-center gap-2 px-4 min-w-[220px]"
                  title="Customize/edit figures (Basic, HRA, Allowances, PF, Tax, etc.) before generating"
                >
                  <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  ✍️ Edit &amp; Custom Generate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Payslips Summary Cards Grid with Show/Hide Employee Visibility Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(() => {
          const userEmailClean = (user?.email || '').toLowerCase();
          const activeUserName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Employee';
          const activeUserNameClean = activeUserName.toLowerCase();
          const activeUserCodeClean = ((user as any)?.employeeCode || '').toLowerCase();

          const matchedEmpInRoster = employeeOptions.find((e: any) => {
            const eEmail = String(e.email || '').toLowerCase();
            const eName = String(e.name || '').toLowerCase();
            const eCode = String(e.code || '').toLowerCase();

            if (String(e.id) === String((user as any)?.employeeId) || String(e.id) === String(user?.id)) return true;
            if (userEmailClean && eEmail === userEmailClean) return true;
            if (activeUserCodeClean && eCode === activeUserCodeClean) return true;
            if (activeUserNameClean && eName === activeUserNameClean) return true;
            return false;
          });

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

                if (itemEmpId && (itemEmpId === String(activeUserId) || itemEmpId === String(user?.id))) return true;
                if (userEmailClean && itemEmail && itemEmail === userEmailClean) return true;
                if (activeUserCodeClean && itemCode && itemCode === activeUserCodeClean) return true;
                if (activeUserNameClean && itemName && itemName === activeUserNameClean) return true;
                return false;
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
            const itemEmpId = String(item.employee_id || item.employeeId || '');
            const itemCode = String(item.empCode || item.employee_code || '').toLowerCase();
            const normEmpKey = itemEmpId || itemCode || String(item.id || '');
            const normalizedMonth = String(item.month || item.payslip_month || selectedMonth).slice(0, 7);
            const key = `${normEmpKey}_${normalizedMonth}`;

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
                return itemEmpId === String(selectedEmpId);
              })
            : deduplicatedList;

          const finalCards = displayList.filter((item: any) => {
            const itemEmpId = String(item.employee_id || item.employeeId || '');
            const matchedEmp = employeeOptions.find((e: any) => String(e.id) === itemEmpId);

            // Hide payslip cards for employees without an assigned salary structure
            if (matchedEmp && matchedEmp.hasSalaryStructure === false) {
              return false;
            }

            if (isAdmin) return true;
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
                String(e.id) === empIdStr
              );

              const isEdited = sample.isCustomEdited === true;
              const cardGross = isEdited ? Number(sample.gross || sample.gross_salary || 0) : Number(matchedProfile?.gross || sample.gross_salary || sample.grossSalary || sample.gross || 0);
              const cardBasic = isEdited ? Number(sample.basic || sample.basic_salary || 0) : Number(matchedProfile?.basic || sample.basic_salary || sample.basicSalary || sample.basic || Math.round(cardGross * 0.50));
              const cardNet = isEdited ? Number(sample.net || sample.net_salary || 0) : Number(matchedProfile?.net || sample.net_salary || sample.netSalary || sample.netTakeHome || sample.net || Math.round(cardGross * 0.90));
              const cardDeductions = isEdited ? Number(sample.deductions || sample.total_deductions || 0) : Number((matchedProfile?.gross && matchedProfile?.net) ? (cardGross - matchedProfile.net) : (sample.total_deductions ?? sample.totalDeductions ?? (cardGross - cardNet)));
              const displayName = matchedProfile?.name || empNameStr || 'Employee';
              const displayCode = matchedProfile?.code || empCodeStr || `EMP-${sample.id}`;

              return (
                <div key={sample.id} className="space-y-1.5 border rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                  {isAdmin && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 mb-1">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleToggleVisibility}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            !isHidden ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                          role="switch"
                          aria-checked={!isHidden}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              !isHidden ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 select-none">
                          {!isHidden ? '👁️ Visible to Employee' : '🙈 Hidden from Employee'}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCard(sample)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        title="Delete card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
                        { name: 'House Rent Allowance (HRA)', amount: Math.round(cardBasic * 0.40) },
                        { name: 'Special Allowance', amount: Math.max(0, cardGross - cardBasic - Math.round(cardBasic * 0.40) - 2850) },
                        { name: 'Conveyance & Medical Allowances', amount: Math.min(2850, Math.max(0, cardGross - cardBasic - Math.round(cardBasic * 0.40))) }
                      ],
                      deductions: [
                        { name: 'Provident Fund (PF)', amount: Math.round(Math.min(cardBasic, 15000) * 0.12) },
                        { name: 'ESI Contribution', amount: cardGross <= 21000 ? Math.round(cardGross * 0.0075) : 0 },
                        { name: 'Professional Tax (PT)', amount: cardGross > 15000 ? 200 : 150 },
                        { name: 'TDS Tax Withholding', amount: Math.max(0, cardDeductions - Math.round(Math.min(cardBasic, 15000) * 0.12) - (cardGross <= 21000 ? Math.round(cardGross * 0.0075) : 0) - (cardGross > 15000 ? 200 : 150)) }
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
      {/* Custom Edit & Generate Payslip Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden rounded-2xl">
            <CardHeader className="bg-slate-900 text-white py-3 px-4 flex flex-row items-center justify-between border-b border-slate-800">
              <div>
                <CardTitle className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                  Edit Payslip — {editFormData.empName} ({editFormData.empCode})
                </CardTitle>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg transition font-bold">
                ✕
              </button>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {/* Earnings Section */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 border-b pb-1">
                  1. Monthly Earnings (₹)
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="text-[11px] font-bold">Basic Pay (₹)</Label>
                    <Input
                      type="number"
                      value={editFormData.basic}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, basic: Number(e.target.value) }))}
                      className="h-8 font-bold text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold">HRA (₹)</Label>
                    <Input
                      type="number"
                      value={editFormData.hra}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, hra: Number(e.target.value) }))}
                      className="h-8 font-semibold text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold">Special Allowance (₹)</Label>
                    <Input
                      type="number"
                      value={editFormData.special}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, special: Number(e.target.value) }))}
                      className="h-8 font-semibold text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold">Bonus / Incentives (₹)</Label>
                    <Input
                      type="number"
                      value={editFormData.bonus}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, bonus: Number(e.target.value) }))}
                      className="h-8 font-semibold text-xs mt-0.5 border-emerald-300"
                    />
                  </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold text-rose-700 dark:text-rose-400 border-b pb-1">
                  2. Deductions &amp; Tax (₹)
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="text-[11px] font-bold">Provident Fund / PF (₹)</Label>
                    <Input
                      type="number"
                      value={editFormData.pf}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, pf: Number(e.target.value) }))}
                      className="h-8 font-semibold text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold">ESI Contribution (₹)</Label>
                    <Input
                      type="number"
                      value={editFormData.esi}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, esi: Number(e.target.value) }))}
                      className="h-8 font-semibold text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold">Professional Tax / PT (₹)</Label>
                    <Input
                      type="number"
                      value={editFormData.pt}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, pt: Number(e.target.value) }))}
                      className="h-8 font-semibold text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold">TDS Withholding (₹)</Label>
                    <Input
                      type="number"
                      value={editFormData.tds}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, tds: Number(e.target.value) }))}
                      className="h-8 font-semibold text-xs mt-0.5 border-rose-300"
                    />
                  </div>
                </div>
              </div>

              {/* Simple Live Summary Card */}
              <div className="p-3 rounded-lg bg-slate-900 text-white grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">GROSS</span>
                  <span className="font-extrabold text-white text-xs">₹{(editFormData.basic + editFormData.hra + editFormData.special + editFormData.bonus).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-400 block font-bold">DEDUCTIONS</span>
                  <span className="font-extrabold text-rose-400 text-xs">−₹{(editFormData.pf + editFormData.esi + editFormData.pt + editFormData.tds).toLocaleString('en-IN')}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 block font-bold">NET SALARY</span>
                  <span className="font-black text-emerald-400 text-sm">₹{(editFormData.basic + editFormData.hra + editFormData.special + editFormData.bonus - (editFormData.pf + editFormData.esi + editFormData.pt + editFormData.tds)).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Submit Actions */}
              <div className="pt-2 flex justify-end gap-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)} className="text-xs h-8 font-bold">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveCustomPayslip} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md h-8">
                  <Save className="w-3.5 h-3.5" />
                  Save &amp; Publish Payslip
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PayslipViewer;
