import React, { useState, useEffect } from 'react';
import { usePayslip } from '../hooks/index';
import { PayslipSummary, EarningsDeductionsBreakdown } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, UserCheck, Calendar, FileText, Download, Printer, RefreshCcw, Sparkles, Bell, CheckCircle, XCircle, Plus, Trash2, Edit3, Eye, LayoutGrid, List, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getPayslipRequests, updatePayslipRequestStatus, PayslipRequest } from '../utils/payslipRequestQueue';
import { PayslipRequestForm } from '../components/PayslipRequestForm';
import { PayslipRequesterPanel, PayslipAdminApprovalPanel } from '../components/PayslipRequestSystem';
import apiClient from '@/lib/api';
import { showToast } from '@/components/ui/toast';
import { formatPayrollDate } from '@/lib/utils';
import { useCompanyStore } from '@/features/settings/store/companyStore';

const numberToWords = (amount: number): string => {
  const num = Math.round(Math.max(0, amount));
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
  if (num === 0) return 'Zero Only';
  const strNum = ('000000000' + num).slice(-9);
  const n: any = strNum.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return `${num} Only`;
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';
  return `${str.trim()} Only`;
};

// Formats a 'YYYY-MM' key for any year — a fixed 2026-only lookup table
// went stale the moment the app crossed into the next year/month and kept
// mislabeling the current month.
const formatMonthLabel = (ym: string): string => {
  const [y, m] = (ym || '').split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const MONTHS_LABEL: Record<string, string> = new Proxy({}, {
  get: (_target, prop: string) => formatMonthLabel(prop),
}) as Record<string, string>;

// Rolling window of the current month plus the previous N months, so the
// "Salary Month" dropdown always centers on today instead of a hardcoded year.
const getRecentMonthOptions = (count = 12) => {
  const now = new Date();
  const options: { value: string; label: string; isCurrent: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: formatMonthLabel(value), isCurrent: i === 0 });
  }
  return options;
};

interface PayslipSetting {
  showCompanyLogo?: boolean;
  showBankDetails?: boolean;
  showLeaveBalance?: boolean;
  showAttendanceSummary?: boolean;
  footerNote?: string;
  hideComponentIfZero?: boolean;
  displayActualValuesGross?: boolean;
  displayCumulativeValues?: boolean;
  displayTotalAmount?: boolean;
  enableLandscapeFormat?: boolean;
  labelGrossSalary?: string;
  labelGrossEarnedSalary?: string;
  labelCumulativeSalary?: string;
  labelEarningComponent?: string;
  labelDeductionComponent?: string;
  employeeSignatureFieldName?: string;
}

interface PayslipDocData {
  name: string;
  code: string;
  designation: string;
  department?: string;
  pfNo: string;
  uanNo: string;
  esicNo: string;
  pan: string;
  period: string;
  doj: string;
  accNo: string;
  bankName: string;
  paidDays: number | string;
  unpaidDays: number | string;
  paidLeave: number | string;
  leaveBalance?: number | string;
  basic: number;
  hra: number;
  cea: number;
  comm: number;
  lta: number;
  meal: number;
  std: number;
  adj: number;
  inc: number;
  bonus?: number;
  pf: number;
  esic: number;
  pt: number;
  tds?: number;
  grossActual?: number;
  cumulativeGross?: number;
  companyName?: string;
  companyAddress?: string;
  companyLogoUrl?: string | null;
  websiteUrl?: string;
  payslipNumber?: string;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
}
/**
 * Shared payslip template that dynamically renders the official salary payslip document
 */
function buildPayslipHtmlDoc(d: PayslipDocData, s?: PayslipSetting, autoPrint: boolean = false): string {
  const totalEarnings = d.basic + d.hra + d.cea + d.comm + d.lta + d.meal + d.std;
  const grossEarned = totalEarnings;
  const totalGross = grossEarned + (d.adj || 0) + (d.inc || 0) + (d.bonus || 0);
  const totalDeductions = d.pf + d.esic + d.pt + (d.tds || 0);
  const netPay = Math.max(0, totalGross - totalDeductions);
  const words = numberToWords(netPay);
  const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const compName = d.companyName || 'Apponext';
  const compAddr = d.companyAddress || 'Corporate Office, Hadapsar, Pune, Maharashtra - 400708';
  const compWeb = d.websiteUrl || 'www.apponexthrms.com';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payslip - ${d.name} (${d.code})</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          background: #ffffff;
          color: #000000;
          padding: 15px;
          font-size: 11px;
          line-height: 1.35;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          body {
            background: #ffffff;
            padding: 0;
          }
          .payslip-container {
            border: 1.5px solid #000000 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            width: 100% !important;
          }
        }
        .payslip-container {
          width: 100%;
          max-width: 740px;
          margin: 0 auto;
          background: #ffffff;
          border: 1.5px solid #000000;
        }
        .header-logo {
          padding: 12px 20px 8px;
          text-align: center;
          border-bottom: 1px solid #000000;
        }
        .logo-brand {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .logo-icon-box {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #2563eb;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
        }
        .logo-text {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
          font-family: Arial, sans-serif;
        }
        .grid-table {
          width: 100%;
          border-collapse: collapse;
          border-bottom: 1px solid #000000;
        }
        .grid-table td {
          border: 1px solid #000000;
          padding: 3.5px 8px;
          font-size: 11px;
          vertical-align: middle;
          color: #000000;
        }
        .financials-table {
          width: 100%;
          border-collapse: collapse;
          border-bottom: 1px solid #000000;
          font-size: 11px;
        }
        .financials-table th {
          border: 1px solid #000000;
          padding: 4px 8px;
          font-weight: 700;
          font-size: 11px;
          color: #000000;
        }
        .financials-table td {
          border-left: 1px solid #000000;
          border-right: 1px solid #000000;
          border-top: none;
          border-bottom: none;
          padding: 2.5px 8px;
          font-size: 11px;
          color: #000000;
          vertical-align: top;
        }
        .financials-table tr.subtotal-row td {
          border-top: 1px solid #000000;
          border-bottom: 1px solid #000000;
          font-weight: 700;
          padding: 3.5px 8px;
        }
        .financials-table tr.total-row td {
          border-top: 1px solid #000000;
          border-bottom: 1px solid #000000;
          font-weight: 700;
          padding: 3.5px 8px;
        }
        .financials-table tr.net-row td {
          border-top: 1px solid #000000;
          font-weight: 700;
          padding: 3.5px 8px;
        }
        .text-right {
          text-align: right;
        }
        .rupees-box {
          border-bottom: 1px solid #000000;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 700;
          color: #000000;
        }
        .disclaimer-box {
          padding: 6px 8px;
          border-bottom: 1px solid #000000;
          font-size: 10px;
          line-height: 1.4;
          color: #000000;
        }
        .disclaimer-title {
          font-size: 10px;
          margin-bottom: 3px;
        }
        .disclaimer-address {
          text-align: center;
          font-size: 10px;
          color: #000000;
          font-weight: 500;
        }
        .bottom-footer {
          padding: 6px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #000000;
        }
        .footer-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .footer-brand {
          font-weight: 800;
          font-size: 12px;
          color: #0f172a;
        }
        .footer-sub {
          font-size: 9px;
          color: #334155;
          margin-left: 2px;
        }
      </style>
    </head>
    <body>
      <div class="payslip-container">
        <!-- Header -->
        <div class="header-logo">
          ${d.companyLogoUrl ? `
            <img src="${d.companyLogoUrl}" alt="${compName}" style="max-height: 38px; max-width: 220px; object-fit: contain;" />
          ` : `
            <div class="logo-brand">
              <span class="logo-icon-box">${compName.charAt(0).toUpperCase()}</span>
              <span class="logo-text">${compName}</span>
            </div>
          `}
        </div>

        <!-- Employee Details Table -->
        <table class="grid-table">
          <tr>
            <td style="width: 34%;"><strong>Name :</strong> ${d.name}</td>
            <td style="width: 33%;"><strong>Emp Code :</strong> ${d.code}</td>
            <td style="width: 33%;"><strong>Designation :</strong> ${d.designation}</td>
          </tr>
          <tr>
            <td><strong>PF No. :</strong> ${d.pfNo || ''}</td>
            <td><strong>UAN No. :</strong> ${d.uanNo || ''}</td>
            <td><strong>ESIC No. :</strong> ${d.esicNo || ''}</td>
          </tr>
          <tr>
            <td><strong>PAN :</strong> ${d.pan || ''}</td>
            <td><strong>Period :</strong> ${d.period}</td>
            <td><strong>Date of Joining :</strong> ${d.doj || ''}</td>
          </tr>
          <tr>
            <td><strong>Account No. :</strong> ${d.accNo || ''}</td>
            <td colspan="2"><strong>Employee Bank :</strong> ${d.bankName || 'HDFC BANK'}</td>
          </tr>
          <tr>
            <td><strong>Paid Days :</strong> ${d.paidDays}</td>
            <td><strong>Unpaid Days :</strong> ${d.unpaidDays}</td>
            <td><strong>Paid Leave :</strong> ${d.paidLeave || ''}</td>
          </tr>
        </table>

        <!-- Earnings & Deductions Table -->
        <table class="financials-table">
          <thead>
            <tr>
              <th style="text-align: left; width: 38%;">Earnings</th>
              <th class="text-right" style="width: 14%;">Amount</th>
              <th style="text-align: left; width: 34%;">Deductions</th>
              <th class="text-right" style="width: 14%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Earned</td>
              <td class="text-right">${fmt(d.basic)}</td>
              <td>PF</td>
              <td class="text-right">${fmt(d.pf)}</td>
            </tr>
            <tr>
              <td>HRA Earned</td>
              <td class="text-right">${fmt(d.hra)}</td>
              <td>ESIC</td>
              <td class="text-right">${fmt(d.esic)}</td>
            </tr>
            <tr>
              <td>Children Education Allowance Earned</td>
              <td class="text-right">${fmt(d.cea)}</td>
              <td>PT</td>
              <td class="text-right">${fmt(d.pt)}</td>
            </tr>
            <tr>
              <td>Communication Allowance Earned</td>
              <td class="text-right">${fmt(d.comm)}</td>
              <td>${(d.tds && d.tds > 0) ? 'TDS' : ''}</td>
              <td class="text-right">${(d.tds && d.tds > 0) ? fmt(d.tds) : ''}</td>
            </tr>
            <tr>
              <td>LTA Earned</td>
              <td class="text-right">${fmt(d.lta)}</td>
              <td></td>
              <td class="text-right"></td>
            </tr>
            <tr>
              <td>Meal Allowance Earned</td>
              <td class="text-right">${fmt(d.meal)}</td>
              <td></td>
              <td class="text-right"></td>
            </tr>
            <tr>
              <td>Standard Allowance Earned</td>
              <td class="text-right">${fmt(d.std)}</td>
              <td></td>
              <td class="text-right"></td>
            </tr>
            <tr class="subtotal-row">
              <td>Total Earnings :</td>
              <td class="text-right">${fmt(totalEarnings)}</td>
              <td></td>
              <td class="text-right"></td>
            </tr>
            <tr>
              <td>Gross Earned</td>
              <td class="text-right">${fmt(grossEarned)}</td>
              <td></td>
              <td class="text-right"></td>
            </tr>
            <tr>
              <td>Adjustment</td>
              <td class="text-right">${fmt(d.adj || 0)}</td>
              <td></td>
              <td class="text-right"></td>
            </tr>
            <tr>
              <td>Incentives</td>
              <td class="text-right">${fmt((d.inc || 0) + (d.bonus || 0))}</td>
              <td></td>
              <td class="text-right"></td>
            </tr>
            <tr class="total-row">
              <td>Total Gross :</td>
              <td class="text-right">${fmt(totalGross)}</td>
              <td>Total Deductions :</td>
              <td class="text-right">${fmt(totalDeductions)}</td>
            </tr>
            <tr class="net-row">
              <td>Net Pay :</td>
              <td class="text-right">${fmt(netPay)}</td>
              <td></td>
              <td class="text-right"></td>
            </tr>
          </tbody>
        </table>

        <!-- Rupees in Words -->
        <div class="rupees-box">
          RUPEES : ${words}
        </div>

        <!-- Disclaimer & Company Info -->
        <div class="disclaimer-box">
          <div class="disclaimer-title">* Document validity subject to Company's Stamp and Signature</div>
          <div class="disclaimer-address">
            ${compAddr}
          </div>
        </div>

        <!-- Bottom Footer -->
        <div class="bottom-footer">
          <div class="footer-left">
            <span class="footer-brand">${compName}</span>
            <span class="footer-sub">Human Resource Management System</span>
          </div>
          <div class="footer-right">
            Log on to <strong>${compWeb}</strong>
          </div>
        </div>
      </div>

      ${autoPrint ? `
      <script>
        window.onload = function() {
          setTimeout(() => { window.print(); }, 250);
        };
      </script>
      ` : ''}
    </body>
    </html>
  `;
}

export const PayslipViewer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.some((r: string) =>
    ['super_admin', 'organization_admin', 'admin'].includes(r.toLowerCase())
  ) ?? false;

  const { payslips, isLoading, getPayslipDetails, refetch } = usePayslip();
  const { selectedCompanyName, selectedCompanyId } = useCompanyStore();
  const [activeCompanyInfo, setActiveCompanyInfo] = useState<{
    name: string;
    address: string;
    logo?: string | null;
    website?: string;
  }>({
    name: selectedCompanyName || 'Apponext',
    address: 'Corporate Office, Hadapsar, Pune, Maharashtra - 400708',
    logo: null,
    website: 'www.apponexthrms.com'
  });
  const [selectedPayslipDoc, setSelectedPayslipDoc] = useState<PayslipDocData | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [dbDepartments, setDbDepartments] = useState<string[]>([]);
  // Filter states: dept, status, search, month
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [empStatus, setEmpStatus] = useState<string>('all');
  const [empNameSearch, setEmpNameSearch] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState<'my' | 'admin'>(isAdmin ? 'admin' : 'my');
  const [activeRoleScope, setActiveRoleScope] = useState<'admin' | 'hr' | 'manager' | 'team_lead' | 'employee'>('admin');
  const [generatedNotification, setGeneratedNotification] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [generatedPayslip, setGeneratedPayslip] = useState<any>(null);
  const [displayLayout, setDisplayLayout] = useState<'table' | 'grid'>('table');
  const [payslipSetting, setPayslipSetting] = useState<PayslipSetting>({
    showCompanyLogo: true,
    showBankDetails: true,
    showLeaveBalance: false,
    showAttendanceSummary: true,
    footerNote: 'This is a system-generated payslip.',
    hideComponentIfZero: false,
    displayActualValuesGross: false,
    displayCumulativeValues: false,
    displayTotalAmount: false,
    enableLandscapeFormat: false,
    labelGrossSalary: '',
    labelGrossEarnedSalary: '',
    labelCumulativeSalary: '',
    labelEarningComponent: '',
    labelDeductionComponent: '',
    employeeSignatureFieldName: ''
  });
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
    } catch { }
    return {};
  });

  const togglePayslipVisibility = (id: string) => {
    setHiddenPayslipIds(prev => {
      const isCurrentlyHidden = !!prev[id];
      const updated = { ...prev, [id]: !isCurrentlyHidden };
      try {
        localStorage.setItem(visibilityKey, JSON.stringify(updated));
      } catch { }
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
      } catch { }
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
    designation: string;
    pfNo: string;
    uanNo: string;
    esicNo: string;
    pan: string;
    period: string;
    doj: string;
    accNo: string;
    bankName: string;
    paidDays: number;
    unpaidDays: number;
    paidLeave: number;
    basic: number;
    hra: number;
    special: number;
    childrenEducation: number;
    communication: number;
    lta: number;
    meal: number;
    standardAllowance: number;
    adjustment: number;
    incentives: number;
    bonus: number;
    pf: number;
    esi: number;
    pt: number;
    tds: number;
    absentDays: number;
    month: string;
  }>({
    empId: '',
    empName: 'Akanksha Sagar Nikam',
    empCode: 'T02',
    designation: 'BACK OFFICE EXECUTIVE',
    pfNo: '',
    uanNo: '',
    esicNo: '',
    pan: '',
    period: 'April 2025',
    doj: '05 May 2021',
    accNo: '',
    bankName: 'HDFC BANK',
    paidDays: 4,
    unpaidDays: 26,
    paidLeave: 0,
    basic: 2267,
    hra: 600,
    special: 0,
    childrenEducation: 27,
    communication: 133,
    lta: 133,
    meal: 27,
    standardAllowance: 533,
    adjustment: 0,
    incentives: 0,
    bonus: 0,
    pf: 272,
    esi: 0,
    pt: 0,
    tds: 0,
    absentDays: 0,
    month: '2026-07-01'
  });

  const handleOpenManualGenerate = () => {
    const targetEmpId = selectedEmpId || (employeeOptions[0] ? String(employeeOptions[0].id) : '1');
    const empObj = employeeOptions.find(e => String(e.id) === targetEmpId) || employeeOptions[0] || {};

    const grossSalary = Number(empObj.gross ?? 50000);
    const basicVal = Number(empObj.basic_earned ?? empObj.basic ?? (grossSalary > 0 ? Math.round(grossSalary * 0.50) : 25000));
    const hraVal = Number(empObj.hra_earned ?? empObj.hra ?? (grossSalary > 0 ? Math.round(grossSalary * 0.161) : 8050));
    const eduVal = Number(empObj.children_education_allowance_earned ?? empObj.children_education_allowance ?? (grossSalary > 0 ? Math.round(grossSalary * 0.007) : 350));
    const commVal = Number(empObj.communication_allowance_earned ?? empObj.communication_allowance ?? (grossSalary > 0 ? Math.round(grossSalary * 0.0358) : 1790));
    const ltaVal = Number(empObj.lta_earned ?? empObj.lta ?? (grossSalary > 0 ? Math.round(grossSalary * 0.0358) : 1790));
    const mealVal = Number(empObj.meal_allowance_earned ?? empObj.meal_allowance ?? (grossSalary > 0 ? Math.round(grossSalary * 0.007) : 350));
    const stdVal = Number(empObj.standard_allowance_earned ?? empObj.standard_allowance ?? (grossSalary > 0 ? Math.max(0, grossSalary - (basicVal + hraVal + eduVal + commVal + ltaVal + mealVal)) : 12670));

    const pfVal = Number(empObj.pf ?? Math.min(1800, Math.round(basicVal * 0.12)));
    const esiVal = Number(empObj.esi ?? empObj.esic ?? 0);
    const ptVal = Number(empObj.pt ?? (grossSalary > 15000 ? 200 : 0));

    setEditFormData({
      empId: targetEmpId,
      empName: empObj.name || (empObj.first_name ? `${empObj.first_name} ${empObj.last_name || ''}`.trim() : 'Employee'),
      empCode: empObj.employee_code || empObj.code || `EMP-${targetEmpId}`,
      designation: empObj.designation || empObj.job_title || empObj.designation_name || 'Software Engineer',
      pfNo: empObj.pf_no || '',
      uanNo: empObj.uan_no || '',
      esicNo: empObj.esic_no || '',
      pan: empObj.pan || empObj.pan_number || '',
      period: MONTHS_LABEL[selectedMonth] || selectedMonth,
      doj: empObj.date_of_joining ? formatPayrollDate(empObj.date_of_joining) : '',
      accNo: empObj.account_no || '',
      bankName: empObj.bank_name || 'HDFC BANK',
      paidDays: Number(empObj.paid_days ?? 30),
      unpaidDays: Number(empObj.unpaid_days ?? 0),
      paidLeave: 0,
      basic: basicVal,
      hra: hraVal,
      special: 0,
      childrenEducation: eduVal,
      communication: commVal,
      lta: ltaVal,
      meal: mealVal,
      standardAllowance: stdVal,
      adjustment: 0,
      incentives: 0,
      bonus: 0,
      pf: pfVal,
      esi: esiVal,
      pt: ptVal,
      tds: 0,
      absentDays: Number(empObj.unpaid_days ?? 0),
      month: `${selectedMonth}-01`
    });
    setShowEditModal(true);
  };

  const handleOpenCardEdit = (card: any) => {
    const empId = String(card.employee_id || card.employeeId || card.id || '');
    const matchedProfile = employeeOptions.find((e: any) => String(e.id) === empId);

    const displayName = card.empName || card.employee_name || (matchedProfile ? `${matchedProfile.firstName || matchedProfile.first_name || ''} ${matchedProfile.lastName || matchedProfile.last_name || ''}`.trim() : '') || `Employee #${empId}`;
    const displayCode = matchedProfile?.employee_code || card.empCode || card.employee_code || matchedProfile?.code || `EMP-${empId}`;
    const displayDesig = matchedProfile?.designation || matchedProfile?.job_title || card.designation || 'Software Engineer';

    setEditFormData({
      empId,
      empName: displayName,
      empCode: displayCode,
      designation: displayDesig,
      pfNo: card.pfNo || card.pf_no || matchedProfile?.pf_no || '',
      uanNo: card.uanNo || card.uan_no || matchedProfile?.uan_no || '',
      esicNo: card.esicNo || card.esic_no || matchedProfile?.esic_no || '',
      pan: card.pan || card.pan_number || matchedProfile?.pan || '',
      period: card.period || (MONTHS_LABEL[selectedMonth] || selectedMonth),
      doj: card.doj || (matchedProfile?.date_of_joining ? formatPayrollDate(matchedProfile.date_of_joining) : ''),
      accNo: card.accNo || card.account_no || matchedProfile?.account_no || '',
      bankName: card.bankName || card.bank_name || matchedProfile?.bank_name || 'HDFC BANK',
      paidDays: card.paidDays !== undefined ? card.paidDays : 30,
      unpaidDays: card.unpaidDays !== undefined ? card.unpaidDays : 0,
      paidLeave: card.paidLeave !== undefined ? card.paidLeave : 0,
      basic: Number(card.basic || 25000),
      hra: Number(card.hra || 8050),
      special: Number(card.special || 0),
      childrenEducation: Number(card.childrenEducation || card.children_education_allowance || 350),
      communication: Number(card.communication || card.communication_allowance || 1790),
      lta: Number(card.lta || card.lta_allowance || 1790),
      meal: Number(card.meal || card.meal_allowance || 350),
      standardAllowance: Number(card.standardAllowance || card.standard_allowance || 12670),
      adjustment: Number(card.adjustment || 0),
      incentives: Number(card.incentives || 0),
      bonus: Number(card.bonus || 0),
      pf: Number(card.pf || 1800),
      esi: Number(card.esi || card.esic || 0),
      pt: Number(card.pt || 200),
      tds: Number(card.tds || 0),
      absentDays: Number(card.absentDays || 0),
      month: card.month || card.payslip_month || `${selectedMonth}-01`
    });
    setShowEditModal(true);
  };

  const buildPayslipDocFromData = (data: any, matchedProfile?: any, defaultMonth: string = '2026-08'): PayslipDocData => {
    const empId = String(data.employee_id || data.employeeId || data.id || matchedProfile?.id || '');
    
    // Robust name resolver that never lets 'Employee #' override a real name
    const resolveValidName = (obj?: any) => {
      if (!obj) return '';
      const fn = (obj.firstName || obj.first_name || '').trim();
      const ln = (obj.lastName || obj.last_name || '').trim();
      if (fn || ln) return `${fn} ${ln}`.trim();
      const full = (obj.fullName || obj.full_name || obj.employeeName || obj.employee_name || obj.empName || obj.name || '').trim();
      if (full && !full.startsWith('Employee #')) return full;
      return '';
    };

    const resolvedName = resolveValidName(matchedProfile) || resolveValidName(data);
    const empName = resolvedName || `Employee #${empId}`;

    // Robust employee code resolver that never lets placeholder 'EMP-' override a real code
    const resolveValidCode = (obj?: any) => {
      if (!obj) return '';
      const c = (obj.employeeCode || obj.employee_code || obj.empCode || obj.code || '').trim();
      if (c && !c.startsWith('EMP-')) return c;
      return '';
    };

    const resolvedCode = resolveValidCode(matchedProfile) || resolveValidCode(data);
    const empCode = resolvedCode || `EMP-${empId}`;
    
    // Designation resolution
    const designation = 
      matchedProfile?.designationName || 
      matchedProfile?.designation_name || 
      matchedProfile?.jobTitle || 
      matchedProfile?.job_title || 
      matchedProfile?.designation || 
      data.designationName || 
      data.designation_name || 
      data.jobTitle || 
      data.job_title || 
      data.designation || 
      'Product Manager';
    
    // Department resolution
    const department = 
      matchedProfile?.departmentName || 
      matchedProfile?.department_name || 
      matchedProfile?.department || 
      data.departmentName || 
      data.department_name || 
      data.department || 
      'Cloud';
    
    // Bank name resolution
    const bankName = 
      matchedProfile?.bankName || 
      matchedProfile?.bank_name || 
      matchedProfile?.salaryBankName || 
      matchedProfile?.salary_bank_name || 
      data.bankName || 
      data.bank_name || 
      'KOTAK MAHINDRA BANK';
    
    // Account number resolution
    const accNo = 
      matchedProfile?.accountNo || 
      matchedProfile?.account_no || 
      matchedProfile?.bankAccountNo || 
      matchedProfile?.bank_account_no || 
      data.accountNo || 
      data.account_no || 
      '';
    
    // UAN number resolution
    const uanNo = 
      matchedProfile?.uanNo || 
      matchedProfile?.uan_no || 
      matchedProfile?.uan || 
      data.uanNo || 
      data.uan_no || 
      data.uan || 
      '';
    
    // ESIC number resolution
    const esicNo = 
      matchedProfile?.esicNo || 
      matchedProfile?.esic_no || 
      matchedProfile?.esic || 
      matchedProfile?.esiNo || 
      data.esicNo || 
      data.esic_no || 
      data.esic || 
      '';
    
    // PAN resolution
    const pan = 
      matchedProfile?.panNumber || 
      matchedProfile?.pan_number || 
      matchedProfile?.pan || 
      data.panNumber || 
      data.pan_number || 
      data.pan || 
      '';
    
    // PF number resolution
    const pfNo = 
      matchedProfile?.pfNo || 
      matchedProfile?.pf_no || 
      matchedProfile?.pfNumber || 
      matchedProfile?.pf_number || 
      data.pfNo || 
      data.pf_no || 
      data.pfNumber || 
      data.pf_number || 
      '';
    
    // Date of Joining resolution (handles dateOfJoining, date_of_joining, doj, joiningDate)
    const rawDoj = 
      matchedProfile?.dateOfJoining || 
      matchedProfile?.date_of_joining || 
      matchedProfile?.doj || 
      matchedProfile?.joiningDate || 
      matchedProfile?.joining_date || 
      data.dateOfJoining || 
      data.date_of_joining || 
      data.doj || 
      data.joiningDate || 
      data.joining_date;
      
    const doj = rawDoj ? formatPayrollDate(rawDoj) : '';
    
    const rawPeriod = data.period || (data.month ? formatMonthLabel(data.month) : (data.payslip_month ? formatMonthLabel(data.payslip_month) : formatMonthLabel(defaultMonth)));
    const period = rawPeriod || 'July 2026';
    const payslipNumber = data.payslip_number || data.payslipNumber || `PS-${(data.month || defaultMonth).toString().slice(0, 7).replace('-', '')}-${empId || '01'}`;

    const paidDays = data.paid_days ?? data.paidDays ?? data.working_days ?? data.payable_days ?? data.payableDays ?? matchedProfile?.paid_days ?? matchedProfile?.working_days ?? 30;
    const unpaidDays = data.unpaid_days ?? data.unpaidDays ?? data.unpaid_leave_days ?? data.lop_days ?? data.lopDays ?? matchedProfile?.unpaid_days ?? matchedProfile?.unpaid_leave_days ?? 0;
    const paidLeave = data.paid_leave ?? data.paidLeave ?? data.paid_leave_days ?? matchedProfile?.paid_leave ?? matchedProfile?.paid_leave_days ?? 0;

    const grossVal = Number(data.gross_salary ?? data.grossSalary ?? data.gross ?? data.grossEarned ?? matchedProfile?.gross ?? 50000);
    let basicVal = Number(data.basic_salary ?? data.basicSalary ?? data.basic ?? data.basic_earned ?? matchedProfile?.basic ?? 0);
    if (!basicVal && grossVal > 0) basicVal = Math.round(grossVal * 0.50);

    let hraVal = Number(data.hra ?? data.hra_earned ?? matchedProfile?.hra ?? 0);
    if (!hraVal && basicVal > 0) hraVal = Math.round(grossVal * 0.161);

    let ceaVal = Number(data.children_education_allowance ?? data.children_education_allowance_earned ?? data.childrenEducation ?? matchedProfile?.childrenEducation ?? 0);
    if (!ceaVal && grossVal > 0) ceaVal = Math.round(grossVal * 0.007);

    let commVal = Number(data.communication_allowance ?? data.communication_allowance_earned ?? data.communication ?? matchedProfile?.communication ?? 0);
    if (!commVal && grossVal > 0) commVal = Math.round(grossVal * 0.0358);

    let ltaVal = Number(data.lta_allowance ?? data.lta_earned ?? data.lta ?? matchedProfile?.lta ?? 0);
    if (!ltaVal && grossVal > 0) ltaVal = Math.round(grossVal * 0.0358);

    let mealVal = Number(data.meal_allowance ?? data.meal_allowance_earned ?? data.meal ?? matchedProfile?.meal ?? 0);
    if (!mealVal && grossVal > 0) mealVal = Math.round(grossVal * 0.007);

    let stdVal = Number(data.standard_allowance ?? data.standard_allowance_earned ?? data.standardAllowance ?? data.special ?? matchedProfile?.special ?? 0);
    if (!stdVal && grossVal > 0) {
      stdVal = Math.max(0, grossVal - (basicVal + hraVal + ceaVal + commVal + ltaVal + mealVal));
    }

    const adjVal = Number(data.adjustment ?? data.adj ?? 0);
    const incVal = Number(data.incentives ?? data.inc ?? 0);
    const bonusVal = Number(data.bonus ?? 0);

    let pfVal = Number(data.pf ?? data.pf_deduction ?? matchedProfile?.pf ?? 0);
    if (!pfVal && basicVal > 0) pfVal = Math.min(1800, Math.round(basicVal * 0.12));

    let esicVal = Number(data.esic ?? data.esi ?? data.esi_deduction ?? matchedProfile?.esi ?? 0);
    if (!esicVal && grossVal > 0 && grossVal <= 21000) esicVal = Math.round(grossVal * 0.0075);

    let ptVal = Number(data.pt ?? data.pt_deduction ?? matchedProfile?.pt ?? 0);
    if (!ptVal && grossVal > 0) ptVal = grossVal > 15000 ? 200 : (grossVal > 7500 ? 175 : 0);

    const tdsVal = Number(data.tds ?? data.tds_deduction ?? matchedProfile?.tds ?? 0);

    const computedTotalEarnings = (basicVal + hraVal + ceaVal + commVal + ltaVal + mealVal + stdVal);
    const computedTotalGross = computedTotalEarnings + adjVal + incVal + bonusVal;
    const computedTotalDeductions = (pfVal + ptVal + esicVal + tdsVal) || Number(data.total_deductions ?? data.totalDeductions ?? 0);
    const computedNetSalary = Math.max(0, computedTotalGross - computedTotalDeductions);

    const compName = data.companyName || data.company_name || matchedProfile?.companyName || matchedProfile?.company_name || matchedProfile?.company || activeCompanyInfo.name || selectedCompanyName || 'Apponext';
    const compAddress = data.companyAddress || data.company_address || activeCompanyInfo.address || 'Corporate Office, Hadapsar, Pune, Maharashtra - 400708';
    const compLogo = data.companyLogoUrl || data.company_logo || activeCompanyInfo.logo || null;
    const webUrl = data.websiteUrl || activeCompanyInfo.website || 'www.apponexthrms.com';

    return {
      name: empName,
      code: empCode,
      designation,
      department,
      bankName,
      accNo,
      uanNo,
      esicNo,
      pan,
      pfNo,
      doj,
      period,
      payslipNumber,
      companyName: compName,
      companyAddress: compAddress,
      companyLogoUrl: compLogo,
      websiteUrl: webUrl,
      paidDays,
      unpaidDays,
      paidLeave,
      basic: basicVal,
      hra: hraVal,
      cea: ceaVal,
      comm: commVal,
      lta: ltaVal,
      meal: mealVal,
      std: stdVal,
      adj: adjVal,
      inc: incVal,
      bonus: bonusVal,
      pf: pfVal,
      esic: esicVal,
      pt: ptVal,
      tds: tdsVal,
      grossSalary: computedTotalGross,
      totalDeductions: computedTotalDeductions,
      netSalary: computedNetSalary
    };
  };

  const handlePrintPayslip = (docData: PayslipDocData) => {
    try {
      const htmlDoc = buildPayslipHtmlDoc(docData, payslipSetting, true);
      const printWin = window.open('', '_blank', 'width=950,height=950');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlDoc);
        printWin.document.close();
      } else {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        iframe.contentDocument?.open();
        iframe.contentDocument?.write(htmlDoc);
        iframe.contentDocument?.close();
        setTimeout(() => {
          try { iframe.contentWindow?.print(); } catch {}
          setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 60000);
        }, 300);
      }
    } catch (e) {
      console.error('Error opening print window:', e);
    }
  };

  const handleDownloadPayslipPDF = (docData: PayslipDocData) => {
    try {
      const htmlDoc = buildPayslipHtmlDoc(docData, payslipSetting, false);
      const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const fileName = `Payslip_${(docData.code || docData.name || 'EMP').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(docData.period || 'Month').replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast.success('Payslip Downloaded', `Saved ${fileName}. You can also click Print to print or save directly as PDF.`);
    } catch (e) {
      console.error('Error downloading payslip:', e);
    }
  };

  const handleViewPayslipDoc = (cardOrData: any) => {
    const empId = String(cardOrData.employee_id || cardOrData.employeeId || cardOrData.id || '');
    const matchedProfile = employeeOptions.find(e => String(e.id) === empId);
    const doc = buildPayslipDocFromData(cardOrData, matchedProfile, cardOrData.month || selectedMonth);
    setSelectedPayslipDoc(doc);
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
      } catch { }
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
    }).catch(() => { });

    setShowEditModal(false);
    setGeneratedNotification(`✅ Custom edited payslip saved & published for ${editFormData.empName} (${editFormData.empCode})! Net Salary: ₹${net.toLocaleString('en-IN')}`);
    setTimeout(() => setGeneratedNotification(null), 5000);
  };

  // ── One-time cleanup: remove old unsecured global key on mount ──────────
  useEffect(() => {
    if (localStorage.getItem('generated_payslips') !== null) {
      localStorage.removeItem('generated_payslips');
    }
  }, []);

  const orgKey = `salary_structures_${user?.organizationId || user?.id || user?.email || 'unknown'}`;

  useEffect(() => {
    // 1. Fetch live organization employees, salary structures, mappings, and payslip settings
    Promise.all([
      apiClient.get('/employees', { params: { pageSize: 500 } }).catch(() => ({ data: [] })),
      apiClient.get('/payroll/structures').catch(() => ({ data: [] })),
      apiClient.get('/payroll/structures/mappings').catch(() => ({ data: [] })),
      apiClient.get('/payroll/settings').catch(() => ({ data: null }))
    ]).then(([empRes, structRes, mappingRes, settingsRes]: any[]) => {
      const settingsData = settingsRes?.data?.data || settingsRes?.data;
      if (settingsData?.payslipSetting) {
        setPayslipSetting(settingsData.payslipSetting);
      }
      
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
      } catch { }

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
          }
          const isAssigned = hasSalaryStructure || (gross !== null && gross > 0);
          const fn = (e.firstName || e.first_name || '').trim();
          const ln = (e.lastName || e.last_name || '').trim();
          const fullFromParts = (fn || ln) ? `${fn} ${ln}`.trim() : '';
          const rawFull = (e.fullName || e.full_name || e.name || '').trim();
          const validFull = (rawFull && !rawFull.startsWith('Employee #')) ? rawFull : '';
          const normalizedName = fullFromParts || validFull || e.email || `Employee #${e.id}`;

          const rawCode = (e.employeeCode || e.employee_code || e.code || '').trim();
          const validCode = (rawCode && !rawCode.startsWith('EMP-')) ? rawCode : '';
          const normalizedCode = validCode || rawCode || `EMP-${e.id}`;
          const normalizedDoj = e.dateOfJoining || e.date_of_joining || e.doj || e.joiningDate || e.joining_date || '';

          return {
            ...e,
            id: e.id,
            name: normalizedName,
            fullName: normalizedName,
            full_name: normalizedName,
            firstName: e.firstName || e.first_name,
            lastName: e.lastName || e.last_name,
            code: normalizedCode,
            employeeCode: normalizedCode,
            employee_code: normalizedCode,
            department: e.departmentName || e.department_name || e.department?.name || (typeof e.department === 'string' ? e.department : '') || 'General',
            departmentName: e.departmentName || e.department_name || e.department?.name || (typeof e.department === 'string' ? e.department : '') || 'General',
            department_name: e.departmentName || e.department_name || e.department?.name || (typeof e.department === 'string' ? e.department : '') || 'General',
            designation: e.designationName || e.designation_name || e.jobTitle || e.job_title || e.designation || 'Software Engineer',
            designationName: e.designationName || e.designation_name || e.jobTitle || e.job_title || e.designation || 'Software Engineer',
            designation_name: e.designationName || e.designation_name || e.jobTitle || e.job_title || e.designation || 'Software Engineer',
            jobTitle: e.jobTitle || e.job_title || e.designation || 'Software Engineer',
            job_title: e.jobTitle || e.job_title || e.designation || 'Software Engineer',
            bank_name: e.bankName || e.bank_name || e.salaryBankName || e.salary_bank_name || 'HDFC BANK',
            bankName: e.bankName || e.bank_name || e.salaryBankName || e.salary_bank_name || 'HDFC BANK',
            account_no: e.accountNo || e.account_no || e.bankAccountNo || e.bank_account_no || '',
            accountNo: e.accountNo || e.account_no || e.bankAccountNo || e.bank_account_no || '',
            uan_no: e.uanNo || e.uan_no || e.uan || '',
            uanNo: e.uanNo || e.uan_no || e.uan || '',
            esic_no: e.esicNo || e.esic_no || e.esic || '',
            esicNo: e.esicNo || e.esic_no || e.esic || '',
            pan: e.pan || e.panNumber || e.pan_number || '',
            pan_number: e.pan || e.panNumber || e.pan_number || '',
            panNumber: e.pan || e.panNumber || e.pan_number || '',
            pf_no: e.pfNo || e.pf_no || e.pfNumber || e.pf_number || '',
            pfNo: e.pf_no || e.pf_number || e.pfNo || '',
            dateOfJoining: normalizedDoj,
            date_of_joining: normalizedDoj,
            doj: normalizedDoj,
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
    }).catch(() => { });

    // 3. Fetch company branding and location details
    apiClient.get('/company').then((res: any) => {
      const comps = res.data?.data || res.data || [];
      if (Array.isArray(comps) && comps.length > 0) {
        const matchedComp = (selectedCompanyId ? comps.find((c: any) => c.company_id === selectedCompanyId || c.companyId === selectedCompanyId) : null) ||
          comps.find((c: any) => c.is_parent || c.isParent) ||
          comps[0];
        if (matchedComp) {
          const addrParts = [
            matchedComp.address_line_1 || matchedComp.addressLine1,
            matchedComp.address_line_2 || matchedComp.addressLine2,
            matchedComp.city,
            matchedComp.state,
            matchedComp.zip_code || matchedComp.zipCode
          ].filter(Boolean);
          setActiveCompanyInfo({
            name: matchedComp.name || selectedCompanyName || 'Apponext',
            address: addrParts.length > 0 ? addrParts.join(', ') : 'Corporate Office, Hadapsar, Pune, Maharashtra - 400708',
            logo: matchedComp.logo || null,
            website: matchedComp.email ? `www.${matchedComp.email.split('@')[1] || 'apponexthrms.com'}` : 'www.apponexthrms.com'
          });
        }
      }
    }).catch(() => {
      apiClient.get('/settings/company-profile').then((res: any) => {
        const prof = res.data?.data || res.data;
        if (prof) {
          const addrParts = [prof.address || prof.address_line_1, prof.city, prof.state, prof.zip_code].filter(Boolean);
          setActiveCompanyInfo({
            name: prof.name || selectedCompanyName || 'Apponext',
            address: addrParts.length > 0 ? addrParts.join(', ') : 'Corporate Office, Hadapsar, Pune, Maharashtra - 400708',
            logo: prof.logo || null,
            website: prof.website || 'www.apponexthrms.com'
          });
        }
      }).catch(() => {});
    });
  }, [user, orgKey, selectedCompanyId, selectedCompanyName]);

  // Compute final unique real departments dynamically
  const uniqueDepartments = Array.from(
    new Set([
      ...dbDepartments,
      ...employeeOptions.map(e => e.department).filter(Boolean)
    ])
  ).sort();

  // Only offer statuses that genuinely exist on real employee records — a
  // hardcoded option nobody actually has (e.g. "On Leave") silently matches
  // zero employees.
  const uniqueEmployeeStatuses = Array.from(
    new Set(employeeOptions.map(e => e.status).filter(Boolean))
  ).sort();

  const handleViewPayslip = async (payslipId: number) => {
    try {
      const payslipDetails = await getPayslipDetails(payslipId);
      if (payslipDetails) {
        const p = payslipDetails.payslip || payslipDetails;
        const serverEmp = payslipDetails.employee || {};
        const matchedProfile = employeeOptions.find(e => String(e.id) === String(p.employee_id || p.employeeId));
        const fullEmp = { ...matchedProfile, ...serverEmp };
        const doc = buildPayslipDocFromData({ ...fullEmp, ...p }, fullEmp, p.payslip_month || p.month || selectedMonth);
        setSelectedPayslipDoc(doc);
      }
    } catch { }
  };

  const handleGenerateMyPayslip = () => {
    const activeUserId = String(user?.id || (user as any)?.employeeId || '');
    handleGenerateForEmployee(activeUserId);
  };

  const handleGenerateForEmployee = async (overrideEmpId?: string) => {
    const empIdToUse = overrideEmpId || selectedEmpId;
    if (!empIdToUse) {
      showToast.error('Missing Employee', 'Please select a particular employee from the dropdown list first.');
      return;
    }
    // Find selected employee dynamically from employee roster
    const emp = employeeOptions.find(e => String(e.id) === String(empIdToUse));
    if (!emp) {
      showToast.error('Employee Not Found', 'Selected employee not found in the roster.');
      return;
    }

    // No local calculation here — this pulls whatever Payroll Process already
    // computed for this employee/month (payroll_run_employees) and just
    // renders/saves the payslip from that. If nothing was processed yet, the
    // backend says so instead of us inventing numbers.
    try {
      const res = await apiClient.post('/payroll/payslips/generate-from-process', {
        employeeId: emp.id,
        month: selectedMonth
      });
      const result = res.data?.data;
      const payslip = result?.payslip || {};
      const serverEmp = result?.employee || {};
      const fullEmp = { ...emp, ...serverEmp };

      const grossVal = Number(payslip.grossSalary ?? payslip.gross_salary ?? fullEmp.gross ?? 50000);
      const totalDed = Number(payslip.totalDeductions ?? payslip.total_deductions ?? 0);
      const netVal = Number(payslip.netSalary ?? payslip.net_salary ?? fullEmp.net ?? 0);
      const basicVal = Number(payslip.basicSalary ?? payslip.basic_salary ?? fullEmp.basic ?? (grossVal * 0.5));
      const psNumber = payslip.payslipNumber ?? payslip.payslip_number ?? `PS-${selectedMonth.replace('-', '')}-${fullEmp.id}`;
      const psMonth = payslip.payslipMonth ?? payslip.payslip_month ?? `${selectedMonth}-01`;

      const docData = buildPayslipDocFromData(
        {
          ...fullEmp,
          ...payslip,
          basic_salary: basicVal,
          gross_salary: grossVal,
          total_deductions: totalDed,
          net_salary: netVal,
          month: psMonth,
          payslip_number: psNumber
        },
        fullEmp,
        selectedMonth
      );

      const newCard = {
        id: payslip.id || Number(fullEmp.id) * 1000 + Date.now(),
        employee_id: fullEmp.id,
        payslip_number: docData.payslipNumber,
        month: psMonth,
        empName: docData.name,
        empCode: docData.code,
        designation: docData.designation,
        bankName: docData.bankName,
        accNo: docData.accNo,
        pan: docData.pan,
        pfNo: docData.pfNo,
        uanNo: docData.uanNo,
        esicNo: docData.esicNo,
        doj: docData.doj,
        paidDays: docData.paidDays,
        unpaidDays: docData.unpaidDays,
        paidLeave: docData.paidLeave,
        basic: docData.basic,
        gross: docData.grossSalary,
        deductions: docData.totalDeductions,
        net: docData.netSalary,
        ctc: payslip.ctc || (docData.grossSalary * 12)
      };

      setGeneratedList(prev => {
        const filtered = prev.filter(
          item => !(String(item.employee_id || item.employeeId) === String(fullEmp.id) && String(item.month || item.payslip_month).slice(0, 7) === selectedMonth)
        );
        const updated = [newCard, ...filtered];
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Directly display official Salary Payslip on screen (no unexpected automatic print popup)
      setSelectedPayslipDoc(docData);
      showToast.success('Payslip Ready 🎉', `Generated official Payslip for ${docData.name}.`);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not generate payslip';
      showToast.error('Nothing to Generate', msg);
      return;
    }

    setGeneratedNotification(`✅ Payslip generated for ${emp.name} (${emp.code}) — ${MONTHS_LABEL[selectedMonth] || selectedMonth}, calculated from the assigned pay slab & structure.`);
    setTimeout(() => setGeneratedNotification(null), 7000);
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

  const selectClassName = "flex h-8 w-full rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer shadow-2xs";

  const userEmailClean = (user?.email || '').toLowerCase();
  const activeUserName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Employee';
  const activeUserNameClean = activeUserName.toLowerCase();
  const activeUserCodeClean = ((user as any)?.employeeCode || '').toLowerCase();

  const userEmpId = String((user as any)?.employeeId || (user as any)?.employee_id || '');

  const matchedEmpInRoster = employeeOptions.find((e: any) => {
    const eEmail = String(e.email || '').toLowerCase();
    const eName = String(e.name || '').toLowerCase();
    const eCode = String(e.code || '').toLowerCase();

    if (userEmpId && String(e.id) === userEmpId) return true;
    if (userEmailClean && eEmail === userEmailClean) return true;
    if (activeUserCodeClean && eCode === activeUserCodeClean) return true;
    if (activeUserNameClean && eName === activeUserNameClean) return true;
    return false;
  });

  const activeUserId = matchedEmpInRoster?.id || userEmpId || 1;

  const baseList = filteredPayslips.filter((p: any) => {
    if (isAdmin) return true;
    const pEmpId = String(p.employee_id || p.employeeId || '');
    const pEmail = String(p.email || '').toLowerCase();
    return pEmpId === String(activeUserId) || (userEmailClean && pEmail === userEmailClean);
  });

  const scopedGeneratedList = isAdmin
    ? generatedList
    : generatedList.filter((item: any) => {
      const itemEmpId = String(item.employee_id || item.employeeId || '');
      const itemCode = String(item.empCode || item.employee_code || '').toLowerCase();
      const itemName = String(item.empName || item.employee_name || '').toLowerCase();
      const itemEmail = String(item.email || '').toLowerCase();

      if (itemEmpId && itemEmpId === String(activeUserId)) return true;
      if (userEmailClean && itemEmail && itemEmail === userEmailClean) return true;
      if (activeUserCodeClean && itemCode && itemCode === activeUserCodeClean) return true;
      if (activeUserNameClean && itemName && itemName === activeUserNameClean) return true;
      return false;
    });

  const combinedList = [...scopedGeneratedList, ...baseList];

  const targetYm = selectedMonth ? selectedMonth.slice(0, 7) : '';
  const monthFilteredList = combinedList.filter((item: any) => {
    if (!targetYm) return true;
    const rawMonth = String(item.month || item.payslip_month || item.period || item.payslip_number || '');
    const match = rawMonth.match(/(\d{4})[-/]?(\d{2})/);
    if (match) {
      const itemYm = `${match[1]}-${match[2]}`;
      return itemYm === targetYm;
    }
    return rawMonth.toLowerCase().includes(targetYm) || rawMonth.startsWith(targetYm);
  });

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

  const displayList = (selectedEmpId && isAdmin)
    ? deduplicatedList.filter((item: any) => {
      const itemEmpId = String(item.employee_id || item.employeeId || '');
      return itemEmpId === String(selectedEmpId);
    })
    : deduplicatedList;

  const finalCards = displayList.filter((item: any) => {
    const itemEmpId = String(item.employee_id || item.employeeId || '');
    const matchedEmp = employeeOptions.find((e: any) => String(e.id) === itemEmpId);

    if (matchedEmp && matchedEmp.hasSalaryStructure === false) {
      return false;
    }

    if (isAdmin) return true;
    const itemMonth = String(item.month || item.payslip_month || selectedMonth);
    const itemKey = String(item.id);
    const comboKey = `${itemEmpId}_${itemMonth}`;

    const isHidden = hiddenPayslipIds[itemKey] === true || hiddenPayslipIds[comboKey] === true;
    return !isHidden;
  });

  const finalCardsCount = finalCards.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">
              {isAdmin ? 'Payslip Management' : 'My Payslips & Monthly Statements'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Generate individual employee payslips using department and month filters or manage approval requests.' : 'View and download your official monthly salary payslips.'}
            </p>
          </div>
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

      <Card className="border border-border/80 shadow-xs bg-card">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                {isAdmin ? 'Generate Particular Employee Payslip (Filter by Dept, Employee Name & Month)' : 'Select Statement Month'}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {isAdmin ? 'Filter employees by department and status, pick a month, and generate official employee payslips instantly.' : 'Select month to view and download your payslips.'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary bg-primary/10">
              {finalCardsCount} Payslips Available
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'} gap-3`}>

            {isAdmin && (
              <>
                {/* 1. Department Filter */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
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
                    <option value="all">All Statuses ({uniqueEmployeeStatuses.length})</option>
                    {uniqueEmployeeStatuses.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Particular Employee Dropdown */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-primary flex items-center gap-1">
                    <Search className="w-3.5 h-3.5 text-primary" />
                    Select Particular Employee *
                  </Label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => { setSelectedEmpId(e.target.value); setEmpNameSearch(e.target.value); }}
                    className={`${selectClassName} border-primary/50 font-bold bg-background text-foreground`}
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
                          {emp.name}
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
                {getRecentMonthOptions(12).map(m => (
                  <option key={m.value} value={m.value}>{m.label}{m.isCurrent ? ' (Current Month)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Generation Option Buttons (Automatic & Manual Edit) */}
          {isAdmin && (
            <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-center justify-end gap-2">
              <Button
                onClick={() => handleGenerateForEmployee()}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs flex items-center justify-center gap-1.5 px-3"
                title="Pulls this employee's already-processed figures from Payroll Process and generates their payslip"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Payslip
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payslips Layout & Summary Header Strip */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-card border border-border/80 p-3 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Monthly Salary Statements</span>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
            {finalCardsCount} Statements
          </Badge>
        </div>
      </div>

      {/* Payslips Summary Cards Grid / Table with Show/Hide Employee Visibility Toggle */}
      <div>
        {(() => {
          if (finalCards.length === 0) {
            const monthLabel = MONTHS_LABEL[selectedMonth] || selectedMonth;
            return (
              <div className="p-8 text-center bg-card rounded-xl border border-dashed border-border space-y-2">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                <div className="font-bold text-foreground text-sm">
                  No Payslips Generated for {monthLabel}
                </div>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {isAdmin
                    ? `No payslips have been generated for ${monthLabel} yet. Select an employee above and click 'Automatic Generate' to create one.`
                    : `Your payslip for ${monthLabel} has not been published by HR/Admin yet. Please check back after monthly payroll processing.`}
                </p>
              </div>
            );
          }

          if (displayLayout === 'table') {
            return (
              <Card className="border border-border/80 shadow-xs bg-card">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                        <tr>
                          <th className="px-4 py-3">Employee Details</th>
                          <th className="px-4 py-3">Payslip Ref & Month</th>
                          <th className="px-4 py-3 text-right">Gross Salary</th>
                          <th className="px-4 py-3 text-right">Deductions</th>
                          <th className="px-4 py-3 text-right">Net Take-Home</th>
                          {isAdmin && <th className="px-4 py-3">Visibility</th>}
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {finalCards.map((sample: any) => {
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

                          const matchedProfile = employeeOptions.find((e: any) => String(e.id) === empIdStr);

                          const cardGross = Number(matchedProfile?.gross ?? sample.gross ?? sample.gross_salary ?? 10000);
                          const cardBasic = Number(matchedProfile?.basic ?? sample.basic ?? sample.basic_salary ?? Math.round(cardGross * 0.50));
                          const cardDeductions = Math.round(Math.min(cardBasic, 15000) * 0.12) + (cardGross > 15000 ? 200 : 150) + 500 + Math.round(cardGross * 0.05);
                          const cardNet = cardGross - cardDeductions;
                          const displayName = matchedProfile?.name || empNameStr || 'Employee';
                          const displayCode = matchedProfile?.code || empCodeStr || `EMP-${sample.id}`;
                          const psRef = sample.payslip_number || sample.payslipNumber || `PS-${sample.id}`;
                          const formattedMonth = new Date(sample.month || sample.payslip_month || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                          return (
                            <tr key={sample.id} className="hover:bg-muted/20 transition-colors text-xs">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
                                    <User className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-foreground">{displayName}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">{displayCode} {matchedProfile?.department ? `• ${matchedProfile.department}` : ''}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div className="font-mono text-[11px] font-bold text-primary">{psRef}</div>
                                <div className="text-[10px] text-muted-foreground font-semibold">{formattedMonth}</div>
                              </td>

                              <td className="px-4 py-3 text-right font-bold text-foreground">
                                ₹{cardGross.toLocaleString('en-IN')}
                              </td>

                              <td className="px-4 py-3 text-right font-bold text-rose-600">
                                −₹{cardDeductions.toLocaleString('en-IN')}
                              </td>

                              <td className="px-4 py-3 text-right font-black text-emerald-600 text-sm">
                                ₹{cardNet.toLocaleString('en-IN')}
                              </td>

                              {isAdmin && (
                                <td className="px-4 py-3">
                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={!isHidden}
                                      onChange={handleToggleVisibility}
                                      className="w-3.5 h-3.5 rounded text-primary accent-primary cursor-pointer"
                                    />
                                    <Badge className={!isHidden ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[9px] px-1.5" : "bg-amber-50 text-amber-700 border-amber-200 font-bold text-[9px] px-1.5"}>
                                      {!isHidden ? "Visible" : "Hidden"}
                                    </Badge>
                                  </label>
                                </td>
                              )}

                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewPayslipDoc(sample)}
                                      className="h-7 px-2 text-[10px] font-bold"
                                      title="View Official Payslip on Screen"
                                    >
                                      <Eye className="w-3 h-3 mr-1" /> View
                                    </Button>

                                    <Button
                                      size="sm"
                                      onClick={() => handleViewPayslipDoc(sample)}
                                      className="h-7 px-2 text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                                      title="View & Download PDF Payslip"
                                    >
                                      <Download className="w-3 h-3 mr-1" /> PDF
                                    </Button>

                                    {isAdmin && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleOpenCardEdit(sample)}
                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                          title="Edit figures"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </Button>

                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleDeleteCard(sample)}
                                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                          title="Delete statement"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
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
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {finalCards.map((sample: any) => {
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
                    <div key={sample.id} className="space-y-1.5 border rounded-xl p-2 bg-card border-border/80 shadow-2xs">
                      {isAdmin && (
                        <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/30 rounded-lg border border-border/60">
                          <label htmlFor={`chk-${sample.id}`} className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-bold text-foreground">
                            <input
                              id={`chk-${sample.id}`}
                              type="checkbox"
                              checked={!isHidden}
                              onChange={handleToggleVisibility}
                              className="w-3.5 h-3.5 rounded text-primary accent-primary cursor-pointer"
                            />
                            <span>Show to User</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <Badge className={!isHidden ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[9px] px-1.5" : "bg-amber-50 text-amber-700 border-amber-200 font-bold text-[9px] px-1.5"}>
                              {!isHidden ? "Visible" : "Hidden"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenCardEdit(sample)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit payslip figures"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCard(sample)}
                              className="h-6 w-6 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              title="Delete card"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
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
                        onView={() => handleViewPayslipDoc(sample)}
                        onDownload={() => handleViewPayslipDoc(sample)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Official Salary Payslip On-Screen Viewer Modal */}
        {selectedPayslipDoc && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
            <div className="relative w-full max-w-4xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
              {/* Top Modal Action Toolbar */}
              <div className="bg-card border-b border-border/60 py-3 px-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                      Official Salary Payslip
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                        {selectedPayslipDoc.payslipNumber || 'Issued'}
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedPayslipDoc.name} ({selectedPayslipDoc.code}) • {selectedPayslipDoc.period}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintPayslip(selectedPayslipDoc)}
                    className="h-8 text-xs font-bold gap-1.5 border-border hover:bg-muted text-foreground cursor-pointer"
                    title="Print payslip document"
                  >
                    <Printer className="w-3.5 h-3.5 text-primary" />
                    Print
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleDownloadPayslipPDF(selectedPayslipDoc)}
                    className="h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                    title="Download payslip"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPayslipDoc(null)}
                    className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    ✕ Close
                  </Button>
                </div>
              </div>

              {/* Scrollable Document Paper */}
              <div className="p-4 sm:p-6 overflow-y-auto bg-muted/30 flex justify-center">
                <div className="w-full max-w-[740px] bg-white text-black border-[1.5px] border-black shadow-lg font-sans text-xs">
                  {/* Top Header */}
                  <div className="p-3.5 pb-2 text-center border-b border-black">
                    {selectedPayslipDoc.companyLogoUrl ? (
                      <img src={selectedPayslipDoc.companyLogoUrl} alt={selectedPayslipDoc.companyName || 'Company'} className="max-h-10 max-w-[200px] object-contain mx-auto" />
                    ) : (
                      <div className="inline-flex items-center justify-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                          {(selectedPayslipDoc.companyName || 'A').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedPayslipDoc.companyName || 'Apponext'}</span>
                      </div>
                    )}
                  </div>

                  {/* Employee Metadata Grid Table */}
                  <table className="w-full border-collapse border-b border-black text-[11px] leading-tight">
                    <tbody>
                      <tr>
                        <td className="border border-black p-1.5 w-[34%]"><strong>Name :</strong> {selectedPayslipDoc.name}</td>
                        <td className="border border-black p-1.5 w-[33%]"><strong>Emp Code :</strong> {selectedPayslipDoc.code}</td>
                        <td className="border border-black p-1.5 w-[33%]"><strong>Designation :</strong> {selectedPayslipDoc.designation}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-1.5"><strong>PF No. :</strong> {selectedPayslipDoc.pfNo || ''}</td>
                        <td className="border border-black p-1.5"><strong>UAN No. :</strong> {selectedPayslipDoc.uanNo || ''}</td>
                        <td className="border border-black p-1.5"><strong>ESIC No. :</strong> {selectedPayslipDoc.esicNo || ''}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-1.5"><strong>PAN :</strong> {selectedPayslipDoc.pan || ''}</td>
                        <td className="border border-black p-1.5"><strong>Period :</strong> {selectedPayslipDoc.period}</td>
                        <td className="border border-black p-1.5"><strong>Date of Joining :</strong> {selectedPayslipDoc.doj || ''}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-1.5"><strong>Account No. :</strong> {selectedPayslipDoc.accNo || ''}</td>
                        <td colSpan={2} className="border border-black p-1.5"><strong>Employee Bank :</strong> {selectedPayslipDoc.bankName || 'HDFC BANK'}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-1.5"><strong>Paid Days :</strong> {selectedPayslipDoc.paidDays}</td>
                        <td className="border border-black p-1.5"><strong>Unpaid Days :</strong> {selectedPayslipDoc.unpaidDays}</td>
                        <td className="border border-black p-1.5"><strong>Paid Leave :</strong> {selectedPayslipDoc.paidLeave || ''}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Earnings & Deductions Table */}
                  <table className="w-full border-collapse border-b border-black text-[11px] leading-tight">
                    <thead>
                      <tr>
                        <th className="border border-black p-1.5 text-left font-bold w-[38%]">Earnings</th>
                        <th className="border border-black p-1.5 text-right font-bold w-[14%]">Amount</th>
                        <th className="border border-black p-1.5 text-left font-bold w-[34%]">Deductions</th>
                        <th className="border border-black p-1.5 text-right font-bold w-[14%]">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border-x border-black px-2 py-0.5">Basic Earned</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.basic) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-0.5">PF</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.pf) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="border-x border-black px-2 py-0.5">HRA Earned</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.hra) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-0.5">ESIC</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.esic) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="border-x border-black px-2 py-0.5">Children Education Allowance Earned</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.cea) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-0.5">PT</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.pt) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="border-x border-black px-2 py-0.5">Communication Allowance Earned</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.comm) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-0.5">{(selectedPayslipDoc.tds && selectedPayslipDoc.tds > 0) ? 'TDS' : ''}</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(selectedPayslipDoc.tds && selectedPayslipDoc.tds > 0) ? (Number(selectedPayslipDoc.tds) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                      </tr>
                      <tr>
                        <td className="border-x border-black px-2 py-0.5">LTA Earned</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.lta) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-0.5"></td>
                        <td className="border-x border-black px-2 py-0.5 text-right"></td>
                      </tr>
                      <tr>
                        <td className="border-x border-black px-2 py-0.5">Meal Allowance Earned</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.meal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-0.5"></td>
                        <td className="border-x border-black px-2 py-0.5 text-right"></td>
                      </tr>
                      <tr>
                        <td className="border-x border-black px-2 py-0.5">Standard Allowance Earned</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.std) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-0.5"></td>
                        <td className="border-x border-black px-2 py-0.5 text-right"></td>
                      </tr>
                      <tr className="border-y border-black font-bold">
                        <td className="border-x border-black px-2 py-1">Total Earnings :</td>
                        <td className="border-x border-black px-2 py-1 text-right">{(Number(selectedPayslipDoc.basic + selectedPayslipDoc.hra + selectedPayslipDoc.cea + selectedPayslipDoc.comm + selectedPayslipDoc.lta + selectedPayslipDoc.meal + selectedPayslipDoc.std) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-1"></td>
                        <td className="border-x border-black px-2 py-1 text-right"></td>
                      </tr>
                      <tr>
                        <td className="border-x border-black px-2 py-0.5">Gross Earned</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.basic + selectedPayslipDoc.hra + selectedPayslipDoc.cea + selectedPayslipDoc.comm + selectedPayslipDoc.lta + selectedPayslipDoc.meal + selectedPayslipDoc.std) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-0.5"></td>
                        <td className="border-x border-black px-2 py-0.5 text-right"></td>
                      </tr>
                      <tr>
                        <td className="border-x border-black px-2 py-0.5">Adjustment</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number(selectedPayslipDoc.adj || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-0.5"></td>
                        <td className="border-x border-black px-2 py-0.5 text-right"></td>
                      </tr>
                      <tr>
                        <td className="border-x border-black px-2 py-0.5">Incentives</td>
                        <td className="border-x border-black px-2 py-0.5 text-right">{(Number((selectedPayslipDoc.inc || 0) + (selectedPayslipDoc.bonus || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-0.5"></td>
                        <td className="border-x border-black px-2 py-0.5 text-right"></td>
                      </tr>
                      <tr className="border-y border-black font-bold">
                        <td className="border-x border-black px-2 py-1">Total Gross :</td>
                        <td className="border-x border-black px-2 py-1 text-right">{(Number(selectedPayslipDoc.grossSalary) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-1">Total Deductions :</td>
                        <td className="border-x border-black px-2 py-1 text-right">{(Number(selectedPayslipDoc.totalDeductions) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-t border-black font-bold">
                        <td className="border-x border-black px-2 py-1">Net Pay :</td>
                        <td className="border-x border-black px-2 py-1 text-right">{(Number(selectedPayslipDoc.netSalary) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="border-x border-black px-2 py-1"></td>
                        <td className="border-x border-black px-2 py-1 text-right"></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Rupees in Words */}
                  <div className="border-b border-black p-1.5 font-bold text-[11px]">
                    RUPEES : {numberToWords(selectedPayslipDoc.netSalary)}
                  </div>

                  {/* Disclaimer & Address */}
                  <div className="border-b border-black p-2 text-[10px] space-y-1 text-slate-800">
                    <div>* Document validity subject to Company's Stamp and Signature</div>
                    <div className="text-center text-slate-800 font-medium">
                      {selectedPayslipDoc.companyAddress || 'Corporate Office, Hadapsar, Pune, Maharashtra - 400708'}
                    </div>
                  </div>

                  {/* Bottom Footer */}
                  <div className="p-2 px-3 flex justify-between items-center text-[10px] text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-900">{selectedPayslipDoc.companyName || 'Apponext'}</span>
                      <span className="text-[9px] text-slate-600 ml-0.5">Human Resource Management System</span>
                    </div>
                    <div>
                      Log on to <strong>{selectedPayslipDoc.websiteUrl || 'www.apponexthrms.com'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Custom Edit & Generate Payslip Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-3xl border border-border/80 bg-card shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/60 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  Edit &amp; Customize Official Payslip — {editFormData.empName}
                </CardTitle>
                <CardDescription className="text-xs">
                  Modify any employee or financial figures below. All totals and Rupees in Words will update in real time.
                </CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowEditModal(false)} className="h-7 w-7 p-0 rounded-full">
                <XCircle className="w-4 h-4 text-muted-foreground" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="space-y-4">
                {/* 1. Header & Employee Information */}
                <div className="border border-border/80 rounded-xl p-3 bg-muted/20 space-y-3">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/60 pb-1">
                    Employee &amp; Bank Information
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <Label className="text-[11px] font-bold">Employee Name *</Label>
                      <Input
                        type="text"
                        value={editFormData.empName || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, empName: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Emp Code *</Label>
                      <Input
                        type="text"
                        value={editFormData.empCode || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, empCode: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Designation *</Label>
                      <Input
                        type="text"
                        value={editFormData.designation || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, designation: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">PF No.</Label>
                      <Input
                        type="text"
                        value={editFormData.pfNo || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, pfNo: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">UAN No.</Label>
                      <Input
                        type="text"
                        value={editFormData.uanNo || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, uanNo: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">ESIC No.</Label>
                      <Input
                        type="text"
                        value={editFormData.esicNo || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, esicNo: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">PAN Number</Label>
                      <Input
                        type="text"
                        value={editFormData.pan || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, pan: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Statement Period</Label>
                      <Input
                        type="text"
                        value={editFormData.period || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, period: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Date of Joining</Label>
                      <Input
                        type="text"
                        value={editFormData.doj || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, doj: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Account No.</Label>
                      <Input
                        type="text"
                        value={editFormData.accNo || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, accNo: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Employee Bank</Label>
                      <Input
                        type="text"
                        value={editFormData.bankName || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, bankName: e.target.value }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-border/40">
                    <div>
                      <Label className="text-[11px] font-bold">Paid Days</Label>
                      <Input
                        type="number"
                        value={editFormData.paidDays ?? 4}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, paidDays: Number(e.target.value) }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Unpaid Days</Label>
                      <Input
                        type="number"
                        value={editFormData.unpaidDays ?? 26}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, unpaidDays: Number(e.target.value) }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Paid Leave</Label>
                      <Input
                        type="number"
                        value={editFormData.paidLeave ?? 0}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, paidLeave: Number(e.target.value) }))}
                        className="h-8 font-semibold text-xs mt-0.5"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Earnings & Deductions Breakdown Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Earnings */}
                  <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/20 space-y-2">
                    <div className="font-extrabold text-emerald-700 uppercase tracking-wider text-[11px] border-b border-emerald-200 pb-1">
                      Earnings Components (₹)
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">Basic Earned</span>
                        <Input
                          type="number"
                          value={editFormData.basic}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, basic: Number(e.target.value) }))}
                          className="h-7 w-28 text-right font-bold text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">HRA Earned</span>
                        <Input
                          type="number"
                          value={editFormData.hra}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, hra: Number(e.target.value) }))}
                          className="h-7 w-28 text-right font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-rose-200 rounded-xl p-3 bg-rose-50/20 space-y-2">
                    <div className="font-extrabold text-rose-700 uppercase tracking-wider text-[11px] border-b border-rose-200 pb-1">
                      Deductions &amp; Tax (₹)
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">Provident Fund (PF)</span>
                        <Input
                          type="number"
                          value={editFormData.pf}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, pf: Number(e.target.value) }))}
                          className="h-7 w-28 text-right font-bold text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">ESIC</span>
                        <Input
                          type="number"
                          value={editFormData.esi}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, esi: Number(e.target.value) }))}
                          className="h-7 w-28 text-right font-bold text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">Professional Tax (PT)</span>
                        <Input
                          type="number"
                          value={editFormData.pt}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, pt: Number(e.target.value) }))}
                          className="h-7 w-28 text-right font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Live Computed Summary Preview */}
                {(() => {
                  const basic = Number(editFormData.basic || 0);
                  const hra = Number(editFormData.hra || 0);
                  const edu = Number(editFormData.childrenEducation || 0);
                  const comm = Number(editFormData.communication || 0);
                  const lta = Number(editFormData.lta || 0);
                  const meal = Number(editFormData.meal || 0);
                  const std = Number(editFormData.standardAllowance || 0);
                  const adj = Number(editFormData.adjustment || 0);
                  const inc = Number(editFormData.incentives || 0);

                  const totEarn = basic + hra + edu + comm + lta + meal + std;
                  const totGross = totEarn + adj + inc;
                  const totDed = Number(editFormData.pf || 0) + Number(editFormData.esi || 0) + Number(editFormData.pt || 0);
                  const net = Math.max(0, totGross - totDed);
                  const words = numberToWords(net);

                  return (
                    <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2 font-mono">
                      <div className="flex justify-between items-center text-xs border-b border-slate-700 pb-2">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Real-time Calculation Summary</span>
                        <span className="bg-emerald-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded">
                          Net Pay: ₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">TOTAL EARNINGS</span>
                          <span className="font-extrabold text-emerald-400 text-xs">₹{totEarn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">TOTAL GROSS</span>
                          <span className="font-extrabold text-emerald-300 text-xs">₹{totGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">TOTAL DEDUCTIONS</span>
                          <span className="font-extrabold text-rose-400 text-xs">-₹{totDed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">NET TAKE-HOME</span>
                          <span className="font-black text-blue-400 text-xs">₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 font-sans italic border-t border-slate-800 pt-1.5">
                        <span className="font-bold text-amber-400">RUPEES:</span> {words}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Action Buttons */}
                <div className="pt-2 flex justify-between items-center gap-2 border-t border-border/60">
                  <div className="text-[10px] text-muted-foreground italic">
                    * Document validity subject to Company's Stamp and Signature
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)} className="h-8 text-xs">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSaveCustomPayslip();
                        const basic = Number(editFormData.basic || 0);
                        const hra = Number(editFormData.hra || 0);
                        const edu = Number(editFormData.childrenEducation || 0);
                        const comm = Number(editFormData.communication || 0);
                        const lta = Number(editFormData.lta || 0);
                        const meal = Number(editFormData.meal || 0);
                        const std = Number(editFormData.standardAllowance || 0);
                        const adj = Number(editFormData.adjustment || 0);
                        const inc = Number(editFormData.incentives || 0);
                        const totEarn = basic + hra + edu + comm + lta + meal + std;
                        const totGross = totEarn + adj + inc;
                        const totDed = Number(editFormData.pf || 0) + Number(editFormData.esi || 0) + Number(editFormData.pt || 0);
                        const net = Math.max(0, totGross - totDed);

                        const doc = buildPayslipDocFromData({
                          ...editFormData,
                          employee_name: editFormData.empName,
                          employee_code: editFormData.empCode,
                          designation: editFormData.designation,
                          pf_no: editFormData.pfNo,
                          uan_no: editFormData.uanNo,
                          esic_no: editFormData.esicNo,
                          pan: editFormData.pan,
                          period: editFormData.period,
                          date_of_joining: editFormData.doj,
                          account_no: editFormData.accNo,
                          bank_name: editFormData.bankName,
                          paid_days: editFormData.paidDays,
                          unpaid_days: editFormData.unpaidDays,
                          paid_leave: editFormData.paidLeave,
                          basic_salary: basic,
                          hra: hra,
                          children_education_allowance: edu,
                          communication_allowance: comm,
                          lta_allowance: lta,
                          meal_allowance: meal,
                          standard_allowance: std,
                          gross_salary: totGross,
                          pf_deduction: editFormData.pf,
                          esi_deduction: editFormData.esi,
                          pt_deduction: editFormData.pt,
                          total_deductions: totDed,
                          net_salary: net,
                        }, null, editFormData.month);

                        setSelectedPayslipDoc(doc);
                      }}
                      className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Save &amp; Preview Payslip
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PayslipViewer;
