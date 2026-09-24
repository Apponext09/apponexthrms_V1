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

export interface PayslipItemDetail {
  name: string;
  amount: number;
  actualAmount?: number;
  cumulativeAmount?: number;
  category: 'Earning' | 'Deduction';
  groupName?: string;
  groupForPayslip?: string;
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
  items?: PayslipItemDetail[];
}

/**
 * Shared payslip template that dynamically renders the official salary payslip document
 * according to organization's configured Payslip Settings & Component Groups.
 */
function buildPayslipHtmlDoc(d: PayslipDocData & { items?: PayslipItemDetail[] }, s?: PayslipSetting, autoPrint: boolean = false): string {
  const isLandscape = !!s?.enableLandscapeFormat;
  const hideZero = !!s?.hideComponentIfZero;
  const showActual = !!s?.displayActualValuesGross;
  const showCumulative = !!s?.displayCumulativeValues;
  const showTotal = s?.displayTotalAmount !== false;
  const showLogo = s?.showCompanyLogo !== false;
  const showBank = s?.showBankDetails !== false;
  const showAttendance = s?.showAttendanceSummary !== false;
  const showLeave = !!s?.showLeaveBalance;

  const labelEarnings = (s?.labelEarningComponent || '').trim() || 'Earnings';
  const labelDeductions = (s?.labelDeductionComponent || '').trim() || 'Deductions';
  const labelActual = (s?.labelGrossSalary || '').trim() || 'Actual';
  const labelEarned = (s?.labelGrossEarnedSalary || '').trim() || 'Amount';
  const labelCumulative = (s?.labelCumulativeSalary || '').trim() || 'Cumulative';
  const signatureLabel = (s?.employeeSignatureFieldName || '').trim();
  const footerNoteText = (s?.footerNote || '').trim() || 'This is a system-generated payslip.';

  const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── 1. Dynamically Build Earnings & Deductions List ──
  let earningsList: Array<{ name: string; earned: number; actual: number; cumulative: number; group: string }> = [];
  let deductionsList: Array<{ name: string; earned: number; actual: number; cumulative: number; group: string }> = [];

  if (d.items && d.items.length > 0) {
    for (const item of d.items) {
      if (hideZero && (item.amount || 0) === 0 && (item.actualAmount || 0) === 0) continue;
      const entry = {
        name: item.name,
        earned: Number(item.amount || 0),
        actual: Number(item.actualAmount ?? item.amount ?? 0),
        cumulative: Number(item.cumulativeAmount || 0),
        group: item.groupForPayslip || item.groupName || (item.category === 'Deduction' ? 'Deductions' : 'Earnings')
      };
      if (item.category === 'Deduction') {
        deductionsList.push(entry);
      } else {
        earningsList.push(entry);
      }
    }
  } else {
    // Default dynamic standard line items
    const rawEarnings = [
      { name: 'Basic Salary', earned: d.basic, actual: d.grossActual ? Math.round(d.grossActual * 0.5) : d.basic, group: 'Earnings' },
      { name: 'House Rent Allowance (HRA)', earned: d.hra, actual: d.grossActual ? Math.round(d.grossActual * 0.161) : d.hra, group: 'Earnings' },
      { name: 'Children Education Allowance', earned: d.cea, actual: d.cea, group: 'Allowances' },
      { name: 'Communication Allowance', earned: d.comm, actual: d.comm, group: 'Allowances' },
      { name: 'Leave Travel Allowance (LTA)', earned: d.lta, actual: d.lta, group: 'Allowances' },
      { name: 'Meal Allowance', earned: d.meal, actual: d.meal, group: 'Allowances' },
      { name: 'Special / Standard Allowance', earned: d.std, actual: d.std, group: 'Earnings' },
      { name: 'Bonus / Incentives', earned: (d.bonus || 0) + (d.inc || 0), actual: (d.bonus || 0) + (d.inc || 0), group: 'Incentives' },
      { name: 'Adjustment', earned: d.adj || 0, actual: d.adj || 0, group: 'Adjustments' },
    ];

    const rawDeductions = [
      { name: 'Provident Fund (EPF)', earned: d.pf, actual: d.pf, group: 'Statutory Deductions' },
      { name: 'Employee State Insurance (ESIC)', earned: d.esic, actual: d.esic, group: 'Statutory Deductions' },
      { name: 'Professional Tax (PT)', earned: d.pt, actual: d.pt, group: 'Statutory Deductions' },
      { name: 'Tax Deducted at Source (TDS)', earned: d.tds || 0, actual: d.tds || 0, group: 'Tax Deductions' },
    ];

    for (const item of rawEarnings) {
      if (hideZero && (item.earned || 0) === 0 && (item.actual || 0) === 0) continue;
      earningsList.push({ ...item, cumulative: 0 });
    }
    for (const item of rawDeductions) {
      if (hideZero && (item.earned || 0) === 0 && (item.actual || 0) === 0) continue;
      deductionsList.push({ ...item, cumulative: 0 });
    }
  }

  const totalEarningsEarned = earningsList.reduce((acc, i) => acc + i.earned, 0);
  const totalDeductionsEarned = deductionsList.reduce((acc, i) => acc + i.earned, 0);
  const totalActualGross = earningsList.reduce((acc, i) => acc + i.actual, 0) || d.grossSalary;
  const netPay = Math.max(0, totalEarningsEarned - totalDeductionsEarned);
  const words = numberToWords(netPay);

  const compName = d.companyName || 'Company';
  const compAddr = d.companyAddress || '';
  const compWeb = d.websiteUrl || '';

  const maxRows = Math.max(earningsList.length, deductionsList.length, 1);

  // Group columns headers & spans
  const colSpanCount = 2 + (showActual ? 1 : 0) + (showCumulative ? 1 : 0);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payslip - ${d.name} (${d.code})</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page {
          size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
          margin: ${isLandscape ? '8mm 10mm' : '10mm 12mm'};
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
          max-width: ${isLandscape ? '980px' : '750px'};
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
          background: #f8fafc;
        }
        .financials-table td {
          border-left: 1px solid #000000;
          border-right: 1px solid #000000;
          border-top: none;
          border-bottom: none;
          padding: 3px 8px;
          font-size: 11px;
          color: #000000;
          vertical-align: top;
        }
        .financials-table tr.total-row td {
          border-top: 1px solid #000000;
          border-bottom: 1px solid #000000;
          font-weight: 700;
          padding: 4px 8px;
          background: #f8fafc;
        }
        .financials-table tr.net-row td {
          border-top: 1px solid #000000;
          font-weight: 700;
          padding: 5px 8px;
          background: #f1f5f9;
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
        .signature-box {
          padding: 16px 12px 10px;
          border-bottom: 1px solid #000000;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
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
        ${showLogo ? `
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
        ` : ''}

        <!-- Employee Details Table -->
        <table class="grid-table">
          <tr>
            <td style="width: 34%;"><strong>Name :</strong> ${d.name}</td>
            <td style="width: 33%;"><strong>Emp Code :</strong> ${d.code}</td>
            <td style="width: 33%;"><strong>Designation :</strong> ${d.designation}</td>
          </tr>
          <tr>
            <td><strong>PF No. :</strong> ${d.pfNo || 'N/A'}</td>
            <td><strong>UAN No. :</strong> ${d.uanNo || 'N/A'}</td>
            <td><strong>ESIC No. :</strong> ${d.esicNo || 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>PAN :</strong> ${d.pan || 'N/A'}</td>
            <td><strong>Period :</strong> ${d.period}</td>
            <td><strong>Date of Joining :</strong> ${d.doj || 'N/A'}</td>
          </tr>
          ${showBank ? `
          <tr>
            <td><strong>Account No. :</strong> ${d.accNo || 'N/A'}</td>
            <td colspan="2"><strong>Employee Bank :</strong> ${d.bankName || 'HDFC BANK'}</td>
          </tr>
          ` : ''}
          ${showAttendance ? `
          <tr>
            <td><strong>Paid Days :</strong> ${d.paidDays}</td>
            <td><strong>Unpaid Days :</strong> ${d.unpaidDays}</td>
            <td>${showLeave ? `<strong>Leave Balance :</strong> ${d.leaveBalance ?? '0'}` : `<strong>Paid Leave :</strong> ${d.paidLeave || '0'}`}</td>
          </tr>
          ` : (showLeave ? `
          <tr>
            <td colspan="3"><strong>Leave Balance :</strong> ${d.leaveBalance ?? '0'}</td>
          </tr>
          ` : '')}
        </table>

        <!-- Earnings & Deductions Table -->
        <table class="financials-table">
          <thead>
            <tr>
              <th style="text-align: left;">${labelEarnings}</th>
              ${showActual ? `<th class="text-right" style="width: 12%;">${labelActual}</th>` : ''}
              <th class="text-right" style="width: 12%;">${labelEarned}</th>
              ${showCumulative ? `<th class="text-right" style="width: 12%;">${labelCumulative}</th>` : ''}

              <th style="text-align: left;">${labelDeductions}</th>
              ${showActual ? `<th class="text-right" style="width: 12%;">${labelActual}</th>` : ''}
              <th class="text-right" style="width: 12%;">${labelEarned}</th>
              ${showCumulative ? `<th class="text-right" style="width: 12%;">${labelCumulative}</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: maxRows }).map((_, idx) => {
              const e = earningsList[idx];
              const ded = deductionsList[idx];
              return `
                <tr>
                  <td>${e ? e.name : ''}</td>
                  ${showActual ? `<td class="text-right">${e ? fmt(e.actual) : ''}</td>` : ''}
                  <td class="text-right">${e ? fmt(e.earned) : ''}</td>
                  ${showCumulative ? `<td class="text-right">${e && e.cumulative ? fmt(e.cumulative) : ''}</td>` : ''}

                  <td>${ded ? ded.name : ''}</td>
                  ${showActual ? `<td class="text-right">${ded ? fmt(ded.actual) : ''}</td>` : ''}
                  <td class="text-right">${ded ? fmt(ded.earned) : ''}</td>
                  ${showCumulative ? `<td class="text-right">${ded && ded.cumulative ? fmt(ded.cumulative) : ''}</td>` : ''}
                </tr>
              `;
            }).join('')}

            ${showTotal ? `
            <tr class="total-row">
              <td>Total Earnings :</td>
              ${showActual ? `<td class="text-right">${fmt(totalActualGross)}</td>` : ''}
              <td class="text-right">${fmt(totalEarningsEarned)}</td>
              ${showCumulative ? `<td class="text-right"></td>` : ''}

              <td>Total Deductions :</td>
              ${showActual ? `<td class="text-right">${fmt(totalDeductionsEarned)}</td>` : ''}
              <td class="text-right">${fmt(totalDeductionsEarned)}</td>
              ${showCumulative ? `<td class="text-right"></td>` : ''}
            </tr>
            <tr class="net-row">
              <td colspan="${colSpanCount}"><strong>Net Pay : ${fmt(netPay)}</strong></td>
              <td colspan="${colSpanCount}"></td>
            </tr>
            ` : ''}
          </tbody>
        </table>

        <!-- Rupees in Words -->
        <div class="rupees-box">
          RUPEES : ${words}
        </div>

        <!-- Optional Signatures -->
        ${signatureLabel ? `
        <div class="signature-box">
          <div><strong>${signatureLabel} :</strong> ________________________</div>
          <div><strong>Authorized Signatory :</strong> ________________________</div>
        </div>
        ` : ''}

        <!-- Disclaimer & Company Info -->
        <div class="disclaimer-box">
          <div class="disclaimer-title">* ${footerNoteText}</div>
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
    ['super_admin', 'organization_admin', 'admin', 'hr', 'hr_admin', 'hr_manager', 'ceo'].includes(r.toLowerCase())
  ) ?? false;

  const { selectedCompanyName, selectedCompanyId } = useCompanyStore();
  const { payslips, isLoading, getPayslipDetails, refetch } = usePayslip(undefined, selectedCompanyId || undefined);
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

  // Purge legacy mock cache on initial load
  const [generatedList, setGeneratedList] = useState<any[]>(() => {
    try {
      localStorage.removeItem(localStorageKey);
      localStorage.removeItem(`generated_payslips_${currentUserId}`);
      localStorage.removeItem('generated_payslips');
    } catch {}
    return [];
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
    payslipId?: number;
    empId: string;
    empName: string;
    empCode: string;
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
    paidDays: number;
    unpaidDays: number;
    paidLeave: number;
    month: string;
    earnings: Array<{ name: string; amount: number; isCustom?: boolean }>;
    deductions: Array<{ name: string; amount: number; isCustom?: boolean }>;
  }>({
    empId: '',
    empName: '',
    empCode: '',
    designation: '',
    pfNo: '',
    uanNo: '',
    esicNo: '',
    pan: '',
    period: '',
    doj: '',
    accNo: '',
    bankName: '',
    paidDays: 30,
    unpaidDays: 0,
    paidLeave: 0,
    month: `${new Date().toISOString().slice(0, 7)}-01`,
    earnings: [],
    deductions: []
  });

  const handleOpenManualGenerate = () => {
    const targetEmpId = selectedEmpId || (employeeOptions[0] ? String(employeeOptions[0].id) : '1');
    const empObj = employeeOptions.find(e => String(e.id) === targetEmpId) || employeeOptions[0] || {};

    const grossSalary = Number(empObj.gross ?? 0);
    const basicVal = Number(empObj.basic ?? (grossSalary > 0 ? Math.round(grossSalary * 0.50) : 0));
    const hraVal = Math.round(basicVal * 0.40);
    const convVal = grossSalary > 20000 ? 1600 : 0;
    const medVal = grossSalary > 20000 ? 1250 : 0;
    const specialVal = Math.max(0, grossSalary - (basicVal + hraVal + convVal + medVal));

    const initialEarnings: Array<{ name: string; amount: number; isCustom?: boolean }> = [];
    if (basicVal > 0) initialEarnings.push({ name: 'Basic Salary', amount: basicVal });
    if (hraVal > 0) initialEarnings.push({ name: 'House Rent Allowance (HRA)', amount: hraVal });
    if (convVal > 0) initialEarnings.push({ name: 'Conveyance Allowance', amount: convVal });
    if (medVal > 0) initialEarnings.push({ name: 'Medical Allowance', amount: medVal });
    if (specialVal > 0) initialEarnings.push({ name: 'Special Allowance', amount: specialVal });
    if (initialEarnings.length === 0 && grossSalary > 0) initialEarnings.push({ name: 'Basic Salary', amount: grossSalary });

    const initialDeductions: Array<{ name: string; amount: number; isCustom?: boolean }> = [];
    const pfVal = Number(empObj.pf ?? Math.min(1800, Math.round(basicVal * 0.12)));
    const esiVal = Number(empObj.esi ?? empObj.esic ?? (grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0));
    const ptVal = Number(empObj.pt ?? (grossSalary > 15000 ? 200 : 0));
    const tdsVal = Number(empObj.tds ?? 0);
    if (pfVal > 0) initialDeductions.push({ name: 'Provident Fund (EPF)', amount: pfVal });
    if (esiVal > 0) initialDeductions.push({ name: 'ESIC Contribution', amount: esiVal });
    if (ptVal > 0) initialDeductions.push({ name: 'Professional Tax (PT)', amount: ptVal });
    if (tdsVal > 0) initialDeductions.push({ name: 'Tax Deducted at Source (TDS)', amount: tdsVal });

    setEditFormData({
      empId: targetEmpId,
      empName: empObj.name || (empObj.first_name ? `${empObj.first_name} ${empObj.last_name || ''}`.trim() : 'Employee'),
      empCode: empObj.employee_code || empObj.code || `EMP-${targetEmpId}`,
      designation: empObj.designation || empObj.job_title || empObj.designation_name || 'Staff',
      department: empObj.department || 'General',
      pfNo: empObj.pf_no || '',
      uanNo: empObj.uan_no || '',
      esicNo: empObj.esic_no || '',
      pan: empObj.pan || empObj.pan_number || '',
      period: MONTHS_LABEL[selectedMonth] || selectedMonth,
      doj: empObj.date_of_joining ? formatPayrollDate(empObj.date_of_joining) : '',
      accNo: empObj.account_no || '',
      bankName: empObj.bank_name || activeCompanyInfo.name || '',
      paidDays: Number(empObj.paid_days ?? 28),
      unpaidDays: Number(empObj.unpaid_days ?? 0),
      paidLeave: 0,
      month: `${selectedMonth}-01`,
      earnings: initialEarnings,
      deductions: initialDeductions,
    });
    setShowEditModal(true);
  };

  const handleOpenCardEdit = async (card: any) => {
    const empId = String(card.employee_id || card.employeeId || card.id || '');
    const matchedProfile = employeeOptions.find((e: any) => String(e.id) === empId);

    const displayName = card.empName || card.employee_name || (matchedProfile ? `${matchedProfile.firstName || matchedProfile.first_name || ''} ${matchedProfile.lastName || matchedProfile.last_name || ''}`.trim() : '') || `Employee #${empId}`;
    const displayCode = matchedProfile?.employee_code || card.empCode || card.employee_code || matchedProfile?.code || `EMP-${empId}`;
    const displayDesig = matchedProfile?.designation || matchedProfile?.job_title || card.designation || 'Staff';
    const displayDept = matchedProfile?.department || card.department || 'General';

    let initialEarnings: Array<{ name: string; amount: number; isCustom?: boolean }> = [];
    let initialDeductions: Array<{ name: string; amount: number; isCustom?: boolean }> = [];

    // Try fetching breakdown details from server
    if (card.id && !card.isCustomEdited) {
      try {
        const detailsData = await getPayslipDetails(card.id);
        if (detailsData) {
          if (Array.isArray(detailsData.earnings) && detailsData.earnings.length > 0) {
            initialEarnings = detailsData.earnings.map((e: any) => ({
              name: e.componentName || e.formula_used || e.name || 'Earning',
              amount: Number(e.actualValue ?? e.actual_value ?? e.amount ?? 0)
            }));
          }
          if (Array.isArray(detailsData.deductions) && detailsData.deductions.length > 0) {
            initialDeductions = detailsData.deductions.map((d: any) => ({
              name: d.componentName || d.component_name || d.name || 'Deduction',
              amount: Number(d.actualValue ?? d.actual_value ?? d.amount ?? 0)
            }));
          }
        }
      } catch {}
    }

    if (initialEarnings.length === 0 && Array.isArray(card.earnings) && card.earnings.length > 0) {
      initialEarnings = card.earnings.map((e: any) => ({ name: e.name, amount: Number(e.amount || 0) }));
    }
    if (initialDeductions.length === 0 && Array.isArray(card.deductions_list) && card.deductions_list.length > 0) {
      initialDeductions = card.deductions_list.map((d: any) => ({ name: d.name, amount: Number(d.amount || 0) }));
    }

    const grossVal = Number(card.gross_salary ?? card.gross ?? card.grossSalary ?? matchedProfile?.gross ?? 0);
    const basicVal = Number(card.basic_salary ?? card.basic ?? card.basicSalary ?? matchedProfile?.basic ?? (grossVal > 0 ? Math.round(grossVal * 0.50) : 0));
    const dedVal = Number(card.total_deductions ?? card.deductions ?? card.totalDeductions ?? (card.net_salary != null ? Math.max(0, grossVal - Number(card.net_salary)) : 0));

    if (initialEarnings.length === 0) {
      const hraVal = Math.round(basicVal * 0.40);
      const convVal = grossVal > 20000 ? 1600 : 0;
      const medVal = grossVal > 20000 ? 1250 : 0;
      const specVal = Math.max(0, grossVal - (basicVal + hraVal + convVal + medVal));
      if (basicVal > 0) initialEarnings.push({ name: 'Basic Salary', amount: basicVal });
      if (hraVal > 0) initialEarnings.push({ name: 'House Rent Allowance (HRA)', amount: hraVal });
      if (convVal > 0) initialEarnings.push({ name: 'Conveyance Allowance', amount: convVal });
      if (medVal > 0) initialEarnings.push({ name: 'Medical Allowance', amount: medVal });
      if (specVal > 0) initialEarnings.push({ name: 'Special Allowance', amount: specVal });
      if (initialEarnings.length === 0 && grossVal > 0) initialEarnings.push({ name: 'Basic Salary', amount: grossVal });
    }

    if (initialDeductions.length === 0 && dedVal > 0) {
      const pfVal = Math.min(1800, Math.round(basicVal * 0.12));
      const ptVal = grossVal > 15000 ? 200 : 0;
      const esiVal = grossVal <= 21000 ? Math.round(grossVal * 0.0075) : 0;
      const tdsVal = Math.max(0, dedVal - (pfVal + ptVal + esiVal));

      if (pfVal > 0) initialDeductions.push({ name: 'Provident Fund (EPF)', amount: pfVal });
      if (ptVal > 0) initialDeductions.push({ name: 'Professional Tax (PT)', amount: ptVal });
      if (esiVal > 0) initialDeductions.push({ name: 'ESIC Contribution', amount: esiVal });
      if (tdsVal > 0) initialDeductions.push({ name: 'Tax Deducted at Source (TDS)', amount: tdsVal });
      if (initialDeductions.length === 0) initialDeductions.push({ name: 'Statutory Deductions', amount: dedVal });
    }

    setEditFormData({
      payslipId: card.id,
      empId,
      empName: displayName,
      empCode: displayCode,
      designation: displayDesig,
      department: displayDept,
      pfNo: card.pfNo || card.pf_no || matchedProfile?.pf_no || '',
      uanNo: card.uanNo || card.uan_no || matchedProfile?.uan_no || '',
      esicNo: card.esicNo || card.esic_no || matchedProfile?.esic_no || '',
      pan: card.pan || card.pan_number || matchedProfile?.pan || '',
      period: card.period || (MONTHS_LABEL[selectedMonth] || selectedMonth),
      doj: card.doj || (matchedProfile?.date_of_joining ? formatPayrollDate(matchedProfile.date_of_joining) : ''),
      accNo: card.accNo || card.account_no || matchedProfile?.account_no || '',
      bankName: card.bankName || card.bank_name || matchedProfile?.bank_name || activeCompanyInfo.name || '',
      paidDays: card.paidDays !== undefined ? card.paidDays : 28,
      unpaidDays: card.unpaidDays !== undefined ? card.unpaidDays : 0,
      paidLeave: card.paidLeave !== undefined ? card.paidLeave : 0,
      month: card.month || card.payslip_month || `${selectedMonth}-01`,
      earnings: initialEarnings,
      deductions: initialDeductions,
    });
    setShowEditModal(true);
  };

  const buildPayslipDocFromData = (data: any, matchedProfile?: any, defaultMonth: string = new Date().toISOString().slice(0, 7)): PayslipDocData => {
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
      '';
    
    // Department resolution
    const department = 
      matchedProfile?.departmentName || 
      matchedProfile?.department_name || 
      matchedProfile?.department || 
      data.departmentName || 
      data.department_name || 
      data.department || 
      '';
    
    // Bank name resolution (reads employee bank directly)
    const bankName = 
      matchedProfile?.bank_name || 
      matchedProfile?.bankName || 
      data.bank_name || 
      data.bankName || 
      '';
    
    // Account number resolution (reads employee account_no directly)
    const accNo = 
      matchedProfile?.account_no || 
      matchedProfile?.accountNo || 
      data.account_no || 
      data.accountNo || 
      data.account_number || 
      '';
    
    // UAN number resolution
    const uanNo = 
      matchedProfile?.uan_no || 
      matchedProfile?.uanNo || 
      data.uan_no || 
      data.uanNo || 
      '';
    
    // ESIC number resolution
    const esicNo = 
      matchedProfile?.esic_no || 
      matchedProfile?.esicNo || 
      data.esic_no || 
      data.esicNo || 
      '';
    
    // PAN resolution
    const pan = 
      matchedProfile?.pan_number || 
      matchedProfile?.panNumber || 
      matchedProfile?.pan || 
      data.pan_number || 
      data.panNumber || 
      data.pan || 
      '';
    
    // PF number resolution
    const pfNo = 
      matchedProfile?.pf_no || 
      matchedProfile?.pfNo || 
      data.pf_no || 
      data.pfNo || 
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

    const paidDays = data.paid_days ?? data.paidDays ?? data.attendance?.paidDays ?? data.working_days ?? data.payable_days ?? data.payableDays ?? matchedProfile?.paid_days ?? matchedProfile?.working_days ?? 30;
    const unpaidDays = data.unpaid_days ?? data.unpaidDays ?? data.attendance?.unpaidDays ?? data.unpaid_leave_days ?? data.lop_days ?? data.lopDays ?? matchedProfile?.unpaid_days ?? matchedProfile?.unpaid_leave_days ?? 0;
    const paidLeave = data.paid_leave ?? data.paidLeave ?? data.attendance?.paidLeave ?? data.paid_leave_days ?? matchedProfile?.paid_leave ?? matchedProfile?.paid_leave_days ?? 0;
    const leaveBalance = data.leave_balance ?? data.leaveBalance ?? data.attendance?.leaveBalance ?? matchedProfile?.leave_balance ?? matchedProfile?.leaveBalance ?? 0;

    // Dynamic components mapping from component_values or earnings/deductions breakdown
    let dynamicItems: PayslipItemDetail[] = [];
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      dynamicItems = data.items;
    } else if (data.component_values && typeof data.component_values === 'object') {
      for (const [_, comp] of Object.entries<any>(data.component_values)) {
        if (!comp || !comp.name) continue;
        dynamicItems.push({
          name: comp.name,
          amount: Number(comp.earned ?? comp.monthly ?? 0),
          actualAmount: Number(comp.monthly ?? comp.earned ?? 0),
          category: comp.category === 'Deduction' ? 'Deduction' : 'Earning',
          groupName: comp.group_name || (comp.category === 'Deduction' ? 'Deductions' : 'Earnings'),
          groupForPayslip: comp.group_for_payslip || comp.group_name || (comp.category === 'Deduction' ? 'Deductions' : 'Earnings')
        });
      }
    } else if (Array.isArray(data.earnings) || Array.isArray(data.deductions) || Array.isArray(data.deductions_list)) {
      for (const e of (data.earnings || [])) {
        dynamicItems.push({
          name: e.componentName || e.component_name || e.formulaUsed || e.formula_used || e.name || 'Earning',
          amount: Number(e.actualValue ?? e.actual_value ?? e.amount ?? 0),
          actualAmount: Number(e.calculatedValue ?? e.calculated_value ?? e.actualValue ?? e.actual_value ?? e.amount ?? 0),
          category: 'Earning',
          groupName: e.groupName || e.group_name || 'Base & Fixed Allowances',
          groupForPayslip: e.groupForPayslip || e.group_for_payslip || 'Earnings'
        });
      }
      for (const d of (data.deductions || data.deductions_list || [])) {
        dynamicItems.push({
          name: d.componentName || d.component_name || d.name || 'Deduction',
          amount: Number(d.actualValue ?? d.actual_value ?? d.amount ?? 0),
          actualAmount: Number(d.calculatedValue ?? d.calculated_value ?? d.actualValue ?? d.actual_value ?? d.amount ?? 0),
          category: 'Deduction',
          groupName: d.groupName || d.group_name || 'Statutory Deductions',
          groupForPayslip: d.groupForPayslip || d.group_for_payslip || 'Deductions'
        });
      }
    }

    const earningItems = dynamicItems.filter(i => i.category === 'Earning');
    const deductionItems = dynamicItems.filter(i => i.category === 'Deduction');
    const itemsGross = earningItems.length > 0 ? earningItems.reduce((s, i) => s + (Number(i.amount) || 0), 0) : null;
    const itemsDeductions = deductionItems.length > 0 ? deductionItems.reduce((s, i) => s + (Number(i.amount) || 0), 0) : null;

    const grossVal = Number(data.gross_salary ?? data.grossSalary ?? data.gross ?? data.grossEarned ?? itemsGross ?? matchedProfile?.gross ?? 0);
    const basicItem = dynamicItems.find(i => i.name.toLowerCase().includes('basic'));
    const basicVal = basicItem ? Number(basicItem.amount) : Number(data.basic_salary ?? data.basicSalary ?? data.basic ?? data.basic_earned ?? matchedProfile?.basic ?? (grossVal > 0 ? Math.round(grossVal * 0.50) : 0));
    const hraItem = dynamicItems.find(i => i.name.toLowerCase().includes('hra') || i.name.toLowerCase().includes('house rent'));
    const hraVal = hraItem ? Number(hraItem.amount) : Number(data.hra ?? data.hra_earned ?? matchedProfile?.hra ?? 0);

    const totalDeductionsVal = Number(data.total_deductions ?? data.totalDeductions ?? data.deductions ?? itemsDeductions ?? 0);
    const netVal = Number(data.net_salary ?? data.netSalary ?? data.net ?? Math.max(0, grossVal - totalDeductionsVal));

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
      leaveBalance,
      basic: basicVal,
      hra: hraVal,
      cea: 0,
      comm: 0,
      lta: 0,
      meal: 0,
      std: 0,
      adj: 0,
      inc: 0,
      bonus: 0,
      pf: 0,
      esic: 0,
      pt: 0,
      tds: 0,
      grossSalary: grossVal,
      totalDeductions: totalDeductionsVal,
      netSalary: netVal,
      items: dynamicItems.length > 0 ? dynamicItems : undefined
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
      handlePrintPayslip(docData);
      showToast.success('Export PDF / Print', 'Print dialog opened. Select "Save as PDF" to save your official PDF payslip.');
    } catch (e) {
      console.error('Error downloading payslip:', e);
    }
  };

  const handleViewPayslipDoc = async (cardOrData: any) => {
    const empId = String(cardOrData.employee_id || cardOrData.employeeId || cardOrData.id || '');
    const matchedProfile = employeeOptions.find(e => String(e.id) === empId);

    if (cardOrData.id && !cardOrData.isCustomEdited) {
      try {
        const detailsData = await getPayslipDetails(cardOrData.id);
        if (detailsData) {
          if (detailsData.settings) {
            setPayslipSetting(detailsData.settings);
          }
          if (detailsData.company) {
            setActiveCompanyInfo(detailsData.company);
          }
          const serverPayslip = detailsData.payslip || cardOrData;
          const serverEmp = detailsData.employee || matchedProfile;
          const mergedData = {
            ...cardOrData,
            ...serverPayslip,
            ...serverEmp,
            earnings: detailsData.earnings,
            deductions: detailsData.deductions,
            attendance: detailsData.attendance,
            leave_balance: detailsData.attendance?.leaveBalance,
            paid_days: detailsData.attendance?.paidDays,
            unpaid_days: detailsData.attendance?.unpaidDays,
            paid_leave: detailsData.attendance?.paidLeave,
            companyName: detailsData.company?.name || activeCompanyInfo.name,
            companyAddress: detailsData.company?.address || activeCompanyInfo.address,
            companyLogoUrl: detailsData.company?.logo || activeCompanyInfo.logo,
            websiteUrl: detailsData.company?.website || activeCompanyInfo.website,
          };
          const doc = buildPayslipDocFromData(mergedData, serverEmp, cardOrData.month || selectedMonth);
          setSelectedPayslipDoc(doc);
          return;
        }
      } catch (err) {
        console.warn('getPayslipDetails fallback to local:', err);
      }
    }

    const doc = buildPayslipDocFromData(cardOrData, matchedProfile, cardOrData.month || selectedMonth);
    setSelectedPayslipDoc(doc);
  };

  const handleSaveCustomPayslip = () => {
    const totEarn = editFormData.earnings.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totDed = editFormData.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const net = Math.max(0, totEarn - totDed);
    const basicComp = editFormData.earnings.find(e => e.name.toLowerCase().includes('basic'))?.amount || (totEarn > 0 ? Math.round(totEarn * 0.50) : 0);
    const psMonth = editFormData.month.length === 7 ? `${editFormData.month}-01` : editFormData.month;
    const psNum = `PS-${psMonth.slice(0, 7).replace('-', '')}-${editFormData.empId}`;

    const customCard = {
      id: editFormData.payslipId || (Number(editFormData.empId) * 1000 + Date.now()),
      employee_id: editFormData.empId,
      payslip_number: psNum,
      month: psMonth,
      empName: editFormData.empName,
      empCode: editFormData.empCode,
      designation: editFormData.designation,
      basic: basicComp,
      basic_salary: basicComp,
      gross: totEarn,
      gross_salary: totEarn,
      deductions: totDed,
      total_deductions: totDed,
      net: net,
      net_salary: net,
      paidDays: editFormData.paidDays,
      unpaidDays: editFormData.unpaidDays,
      paidLeave: editFormData.paidLeave,
      earnings: editFormData.earnings,
      deductions_list: editFormData.deductions,
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
      basicSalary: basicComp,
      grossSalary: totEarn,
      totalDeductions: totDed,
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
      apiClient.get('/employees', {
        params: {
          pageSize: 500,
          companyId: selectedCompanyId && String(selectedCompanyId) !== 'all' ? selectedCompanyId : undefined
        }
      }).catch(() => ({ data: [] })),
      apiClient.get('/payroll/structures').catch(() => ({ data: [] })),
      apiClient.get('/payroll/structures/mappings').catch(() => ({ data: [] })),
      apiClient.get('/payroll/settings').catch(() => ({ data: null }))
    ]).then(([empRes, structRes, mappingRes, settingsRes]: any[]) => {
      const settingsData = settingsRes?.data?.data || settingsRes?.data;
      if (settingsData?.payslipSetting) {
        setPayslipSetting(settingsData.payslipSetting);
      }
      
      const rawList = empRes.data?.data || empRes.data || [];
      const list = (Array.isArray(rawList) ? rawList : []).filter((e: any) => {
        if (!selectedCompanyId || String(selectedCompanyId) === 'all') return true;
        return String(e.company_id || e.companyId) === String(selectedCompanyId) || (!e.company_id && !e.companyId);
      });
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
    apiClient.get('/settings/companies').then((res: any) => {
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
        const earningsList = payslipDetails.earnings || p.earnings || [];
        const deductionsList = payslipDetails.deductions || p.deductions || [];
        const targetMonth = p.payslip_month || p.month || selectedMonth;

        const doc = buildPayslipDocFromData(
          {
            ...fullEmp,
            ...p,
            earnings: earningsList,
            deductions: deductionsList,
            attendance: payslipDetails.attendance || p.attendance,
            paid_days: payslipDetails.attendance?.paidDays ?? p.paidDays ?? p.paid_days,
            unpaid_days: payslipDetails.attendance?.unpaidDays ?? p.unpaidDays ?? p.unpaid_days,
            month: targetMonth,
            period: formatMonthLabel(targetMonth)
          },
          fullEmp,
          targetMonth
        );
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

    // Pull whatever Payroll Process already computed for this employee/month
    try {
      const res = await apiClient.post('/payroll/payslips/generate-from-process', {
        employeeId: emp.id,
        month: selectedMonth
      });
      const result = res.data?.data;
      const payslip = result?.payslip || result || {};
      const serverEmp = result?.employee || {};
      const fullEmp = { ...emp, ...serverEmp };

      const earningsList = result?.earnings || payslip.earnings || [];
      const deductionsList = result?.deductions || payslip.deductions || [];

      const grossVal = Number(payslip.grossSalary ?? payslip.gross_salary ?? fullEmp.gross ?? 0);
      const totalDed = Number(payslip.totalDeductions ?? payslip.total_deductions ?? 0);
      const netVal = Number(payslip.netSalary ?? payslip.net_salary ?? fullEmp.net ?? 0);
      const basicVal = Number(payslip.basicSalary ?? payslip.basic_salary ?? fullEmp.basic ?? (grossVal * 0.5));
      const psNumber = payslip.payslipNumber ?? payslip.payslip_number ?? `PS-${selectedMonth.replace('-', '')}-${fullEmp.id}`;
      const psMonth = payslip.payslipMonth ?? payslip.payslip_month ?? `${selectedMonth}-01`;

      const docData = buildPayslipDocFromData(
        {
          ...fullEmp,
          ...payslip,
          earnings: earningsList,
          deductions: deductionsList,
          attendance: result?.attendance || payslip.attendance,
          paid_days: result?.attendance?.paidDays ?? payslip.paidDays ?? payslip.paid_days,
          unpaid_days: result?.attendance?.unpaidDays ?? payslip.unpaidDays ?? payslip.unpaid_days,
          basic_salary: basicVal,
          gross_salary: grossVal,
          total_deductions: totalDed,
          net_salary: netVal,
          month: selectedMonth,
          period: formatMonthLabel(selectedMonth),
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

                          const cardGross = Number(sample.gross_salary ?? sample.grossSalary ?? sample.gross ?? matchedProfile?.gross ?? 0);
                          const cardBasic = Number(sample.basic_salary ?? sample.basicSalary ?? sample.basic ?? matchedProfile?.basic ?? (cardGross > 0 ? Math.round(cardGross * 0.50) : 0));
                          const cardDeductions = Number(sample.total_deductions ?? sample.totalDeductions ?? sample.deductions ?? (sample.net_salary != null ? Math.max(0, cardGross - Number(sample.net_salary)) : 0));
                          const cardNet = Number(sample.net_salary ?? sample.netSalary ?? sample.net ?? Math.max(0, cardGross - cardDeductions));
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

                  const cardGross = Number(sample.gross_salary ?? sample.grossSalary ?? sample.gross ?? matchedProfile?.gross ?? 0);
                  const cardBasic = Number(sample.basic_salary ?? sample.basicSalary ?? sample.basic ?? matchedProfile?.basic ?? (cardGross > 0 ? Math.round(cardGross * 0.50) : 0));
                  const cardDeductions = Number(sample.total_deductions ?? sample.totalDeductions ?? sample.deductions ?? (sample.net_salary != null ? Math.max(0, cardGross - Number(sample.net_salary)) : 0));
                  const cardNet = Number(sample.net_salary ?? sample.netSalary ?? sample.net ?? Math.max(0, cardGross - cardDeductions));
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
                <div className="w-full max-w-[820px] bg-white rounded-xl shadow-lg overflow-hidden border border-border/80">
                  <iframe
                    srcDoc={buildPayslipHtmlDoc(selectedPayslipDoc, payslipSetting, false)}
                    title="Payslip Preview"
                    className="w-full border-0"
                    style={{ minHeight: payslipSetting?.enableLandscapeFormat ? '580px' : '820px' }}
                  />
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
                  <div className="border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-3 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-2">
                    <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/60 pb-1">
                      <div className="font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                        Earnings Components (₹)
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditFormData(prev => ({
                          ...prev,
                          earnings: [...prev.earnings, { name: 'Other Allowance', amount: 0, isCustom: true }]
                        }))}
                        className="h-6 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/50 p-1"
                      >
                        + Add Component
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {editFormData.earnings.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic py-2 text-center">No earnings configured. Click + Add Component</div>
                      ) : (
                        editFormData.earnings.map((earn, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2">
                            {earn.isCustom ? (
                              <Input
                                type="text"
                                value={earn.name}
                                onChange={(e) => {
                                  const updated = [...editFormData.earnings];
                                  updated[idx].name = e.target.value;
                                  setEditFormData(prev => ({ ...prev, earnings: updated }));
                                }}
                                className="h-7 text-xs font-semibold text-foreground flex-1"
                                placeholder="Component Name"
                              />
                            ) : (
                              <span className="font-medium text-foreground text-xs flex-1 truncate" title={earn.name}>
                                {earn.name}
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={earn.amount}
                                onChange={(e) => {
                                  const updated = [...editFormData.earnings];
                                  updated[idx].amount = Number(e.target.value);
                                  setEditFormData(prev => ({ ...prev, earnings: updated }));
                                }}
                                className="h-7 w-28 text-right font-bold text-xs"
                              />
                              {earn.isCustom && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const updated = editFormData.earnings.filter((_, i) => i !== idx);
                                    setEditFormData(prev => ({ ...prev, earnings: updated }));
                                  }}
                                  className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700"
                                >
                                  ✕
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 bg-rose-50/20 dark:bg-rose-950/10 space-y-2">
                    <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-900/60 pb-1">
                      <div className="font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider text-[11px]">
                        Deductions &amp; Tax (₹)
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditFormData(prev => ({
                          ...prev,
                          deductions: [...prev.deductions, { name: 'Other Deduction', amount: 0, isCustom: true }]
                        }))}
                        className="h-6 text-[10px] font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-100/50 p-1"
                      >
                        + Add Component
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {editFormData.deductions.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic py-2 text-center">No deductions configured. Click + Add Component</div>
                      ) : (
                        editFormData.deductions.map((ded, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2">
                            {ded.isCustom ? (
                              <Input
                                type="text"
                                value={ded.name}
                                onChange={(e) => {
                                  const updated = [...editFormData.deductions];
                                  updated[idx].name = e.target.value;
                                  setEditFormData(prev => ({ ...prev, deductions: updated }));
                                }}
                                className="h-7 text-xs font-semibold text-foreground flex-1"
                                placeholder="Deduction Name"
                              />
                            ) : (
                              <span className="font-medium text-foreground text-xs flex-1 truncate" title={ded.name}>
                                {ded.name}
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={ded.amount}
                                onChange={(e) => {
                                  const updated = [...editFormData.deductions];
                                  updated[idx].amount = Number(e.target.value);
                                  setEditFormData(prev => ({ ...prev, deductions: updated }));
                                }}
                                className="h-7 w-28 text-right font-bold text-xs"
                              />
                              {ded.isCustom && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const updated = editFormData.deductions.filter((_, i) => i !== idx);
                                    setEditFormData(prev => ({ ...prev, deductions: updated }));
                                  }}
                                  className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700"
                                >
                                  ✕
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Live Computed Summary Preview */}
                {(() => {
                  const totEarn = editFormData.earnings.reduce((s, e) => s + (Number(e.amount) || 0), 0);
                  const totDed = editFormData.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
                  const net = Math.max(0, totEarn - totDed);
                  const words = numberToWords(net);

                  return (
                    <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2 font-mono">
                      <div className="flex justify-between items-center text-xs border-b border-slate-700 pb-2">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Real-time Calculation Summary</span>
                        <span className="bg-emerald-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded">
                          Net Pay: ₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">TOTAL EARNINGS (GROSS)</span>
                          <span className="font-extrabold text-emerald-400 text-xs">₹{totEarn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
                        const totEarn = editFormData.earnings.reduce((s, e) => s + (Number(e.amount) || 0), 0);
                        const totDed = editFormData.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
                        const net = Math.max(0, totEarn - totDed);
                        const basicComp = editFormData.earnings.find(e => e.name.toLowerCase().includes('basic'))?.amount || (totEarn > 0 ? Math.round(totEarn * 0.50) : 0);
                        const hraComp = editFormData.earnings.find(e => e.name.toLowerCase().includes('hra') || e.name.toLowerCase().includes('house rent'))?.amount || 0;

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
                          basic_salary: basicComp,
                          hra: hraComp,
                          gross_salary: totEarn,
                          total_deductions: totDed,
                          net_salary: net,
                          earnings: editFormData.earnings,
                          deductions: editFormData.deductions,
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
